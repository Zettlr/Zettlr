/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrDir class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This file contains the ZettlrDir class, modeling a directory
 *                  on disk for the app.
 *
 * END HEADER
 */

const path         = require('path');
const fs           = require('fs');
const sanitize     = require('sanitize-filename');
const ZettlrFile   = require('./zettlr-file.js');
const {shell}      = require('electron');

// Include helpers
const { hash, sort, generateName } = require('../common/zettlr-helpers.js');

/**
 * Error object constructor
 * @param       {string} msg The error message
 * @constructor
 */
function DirectoryError(msg) {
    this.name = 'Directory error';
    this.message = msg;
}

/**
 * This class models properties and features of a directory on disk.
 */
class ZettlrDir
{
    /**
     * Read a directory.
     * @param {Mixed} parent     Either ZettlrDir or Zettlr, depending on root status.
     * @param {String} [dir=null] The full path to the directory.
     */
    constructor(parent, dir = null)
    {
        this.path     = "";
        this.name     = "";
        this.hash     = null;
        this.children = [];
        this.type     = 'directory';
        this.parent   = parent;

        // Supported filetypes
        this.filetypes = require('../common/data.json').filetypes;

        // Prepopulate if given.
        if(dir != null) {
            this.path = dir;
            this.name = path.basename(this.path);
            this.hash = hash(this.path);

            // The directory might've been just been created.
            try {
                let stat = fs.lstatSync(this.path);
            }catch(e) {
                // Error? -> create
                fs.mkdirSync(this.path);
            }

            this.scan();
        }
    }

    /**
     * Takes an object and returns a ZettlrDir-object (or null)
     * @param  {Object} obj An object containing information for search
     * @return {Mixed}     Either null, if not found, or the ZettlrDir object.
     */
    findDir(obj)
    {
        let prop;

        if(obj.hasOwnProperty('path') && obj.path != null) {
            prop = 'path';
        } else if(obj.hasOwnProperty('hash') && obj.hash != null) {
            prop = 'hash';
        } else {
            throw new DirectoryError("Cannot search directory. Neither path nor hash given.");
        }

        if(this[prop] == obj[prop]) {
            return this;
        } else {
            // Traverse the children
            for(let c of this.children) {
                let dir = c.findDir(obj);
                if(dir != null) {
                    // Found it
                    return dir;
                }
            }
        }

        // Not found
        return null;
    }

    /**
     * Finds a file in this directory
     * @param  {Object} obj An object containing information on the file.
     * @return {Mixed}     Either ZettlrFile or null, if not found.
     */
    findFile(obj)
    {
        let prop;

        if(obj.hasOwnProperty('path') && obj.path != null) {
            prop = 'path';
        } else if(obj.hasOwnProperty('hash') && obj.hash != null) {
            prop = 'hash';
        } else {
            throw new DirectoryError("Cannot search file. Neither path nor hash given.");
        }

        // Traverse the children
        for(let c of this.children) {
            let file = c.findFile(obj);
            if(file != null) {
                // Found it
                return file;
            }
        }

        // Not found
        return null;
    }

    /**
     * Creates a new subdirectory and returns it.
     * @param  {String} name The name (not path!) for the subdirectory.
     * @return {ZettlrDir}      The newly created directory.
     */
    newdir(name)
    {
        // Remove unallowed characters.
        name = sanitize(name);
        if((name === '') || (name === null)) {
            throw new DirectoryError('The directory name did not contain any allowed characters.');
        }

        let newpath = path.join(this.path, name);

        let dir = new ZettlrDir(this, newpath);
        this.children.push(dir);
        this.children = sort(this.children);

        // Return dir for chainability
        return dir;
    }

    /**
     * Create a new file in this directory.
     * @param  {String} [name=null] The new name, if given
     * @return {ZettlrFile}             The newly created file.
     */
    newfile(name = null)
    {
        if(name == null) {
            // Generate a unique new name
            name = generateName();
        }

        name = sanitize(name);
        // This gets executed once the user has not entered any allowed characters
        if((name == '') || (name == null)) {
            throw new DirectoryError('The new file name did not contain any allowed characters.');
        }

        // Do we have an extension?
        if(path.extname(name) != '.md') {
            name = name + ".md";
        }

        // Already exists
        if(this.exists(path.join(this.path, name))) {
            throw new DirectoryError('The file already exists.');
        }

        // Create a new file.
        let f = new ZettlrFile(this, path.join(this.path, name));
        this.children.push(f);
        this.children = sort(this.children);
        return f;
    }

    /**
     * Triggered by the watchdog - add a child
     * @param {String} p The path to the child
     */
    addChild(p)
    {
        let stat = fs.lstatSync(p);

        if(stat.isDirectory()) {
            let dir = new ZettlrDir(this, p);
            this.children.push(dir);
            this.children = sort(this.children);
            return dir;
        } else if(stat.isFile() && (path.extname(p) == '.md')) {
            // First check whether or not this thing is already in the children
            for(let c of this.children) {
                if(c.path == p) {
                    return c;
                }
            }
            let file = new ZettlrFile(this, p);
            this.children.push(file);
            this.children = sort(this.children);
            return file;
        }

        // Not a correct file type -> ignore
        return null;
    }

    /**
     * Returns the contents of a file identified by its hash
     * @param  {Integer} hash The file's hash
     * @return {Mixed}      Either a string containing the file's content or null.
     */
    get(hash)
    {
        // This function is supposed to return the file contents with the hash.
        // Let each children decide if they are correct.
        for(let c of this.children) {
            let cnt = c.get(hash);
            if(cnt != null) {
                // Got it -> return and abort.
                return cnt;
            }
        }

        return null;
    }

    /**
     * Removes either a child or this directory.
     * @param  {Mixed} [obj=this] Either ZettlrDir or ZettlrFile
     * @return {Boolean}            Whether or not the operation completed successfully.
     */
    remove(obj = this)
    {
        if(obj === this) {
            // Remove this directory but ONLY if it is NOT the root.
            // Root's parent is the Zettlr object itself
            if( (!this.parent.hasOwnProperty('type')) && (this.parent.type !== 'directory') ) {
                return false;
            }

            // It may be that this method returns false. Mostly, because the
            // directory has been deleted and this object is only removed to
            // reflect changes on the disk that have been reported by chokidar
            shell.moveItemToTrash(this.path);
            this.parent.remove(this);
        } else {
            // Remove a file (function was called by a children)
            let index = this.children.indexOf(obj);

            // Should (normally) always be true
            if(index > -1) {
                this.children.splice(index, 1);
            } else {
                // Logically, this should never be executed. But who am I to tell
                // you about logic and software ...
                throw new DirectoryError('Could not find child inside array to remove!');
            }
        }

        return true;
    }

    /**
     * Move (or rename) this directory. It's a double-use function
     * @param  {String} newpath     The new location of this dir
     * @param  {String} [name=null] A name, given when this should be renamed
     * @return {ZettlrDir}             This for chainability.
     */
    move(newpath, name = null)
    {
        // name will only be not-null if the dir should be renamed
        // If we move a directory, all files will automatically move.
        // So easiest way is to move this directory and then re-fetch
        // the children.
        if(name != null) {
            this.name = name; // No need to detach on rename
            // But what we want to do is have the parent re-sort its children
            this.parent.sort();
        } else {
            this.detach();
        }

        let oldPath = this.path;
        this.path = path.join(newpath, this.name);
        this.hash = hash(this.path);

        // Move
        fs.renameSync(oldPath, this.path);
        this.children = []; // Unreference old list

        // Re-read
        this.scan();

        // Chainability
        return this;
    }

    /**
     * Attach a new children to this element (mainly happens while moving)
     * @param  {Mixed} newchild ZettlrDir or ZettlrFile object
     * @return {ZettlrDir}          This for chainability.
     */
    attach(newchild)
    {
        this.children.push(newchild);
        // Set the correct new parent
        newchild.parent = this;
        this.children = sort(this.children);

        return this;
    }

    /**
     * Detaches this directory from its parent.
     * @return {ZettlrDir} This for chainability.
     */
    detach()
    {
        this.parent.remove(this);
        this.parent = null;
        return this;
    }

    /**
     * Scans the directory and adds all children that match the criteria (e.g.
     * dir or file permitted by filetypes)
     * @return {ZettlrDir} This for chainability.
     */
    scan()
    {
        // Reads this directory.
        try {
            let stat = fs.lstatSync(this.path);
        }catch(e) {
            // Do not create directories here, only read.
            return;
        }

        // Empty the children array
        this.children = [];

        // (Re-)read the directory
        let files = fs.readdirSync(this.path);

        for(let f of files) {
            let p = path.join(this.path, f);
            // Determine if file or dir.
            // We don't need try/catch because readDirSync doesn't return spurious paths
            let stat = fs.lstatSync(p);
            if(stat.isDirectory()) {
                this.children.push(new ZettlrDir(this, p)); // This recursively reads the "f" dir
            } else if(stat.isFile()) {
                let extname = path.extname(p);
                if(this.filetypes.includes(extname)) {
                    // Exclude non-md- and -txt-files
                    this.children.push(new ZettlrFile(this, p));
                }
            } // With else if exlude everything like symlinks etc and skip them
        }

        // Final step: Sort
        this.children = sort(this.children);

        return this;
    }

    /**
     * Returns true, if the given path exists somewhere in this dir.
     * @param  {String} p An absolute path.
     * @return {Boolean}   True (if the path exists) or false.
     */
    exists(p)
    {
        // return true if path exists
        if(this.path == p) {
            return true;
        }

        let e = false;
        for(let c of this.children) {
            if(c.path == p) {
                e = true;
            }

            if(c.type == 'directory') {
                if(c.exists(p)) {
                    e = true;
                }
            }
        }

        return e;
    }

    /**
     * Check whether or not this dir contains the given object (dir or file)
     * @param  {Object} obj An object containing a hash.
     * @return {Boolean}     True (if this directory contains <hash>) or false
     */
    contains(obj)
    {
        if(typeof obj === 'number') {
            // Same problem as in the find-methods. Only here I don't care anymore.
            // Simply assume a hash. Nothing else could be it.
            obj = { 'hash': obj };
        }

        if(this.findDir({ 'hash': obj.hash }) !== null) {
            return true;
        } else if(this.findFile({ 'hash': obj.hash}) !== null) {
            // Try a file
            return true;
        }

        return false;
    }

    /**
     * Has this dir a direct child with the given property?
     * @param  {Object}  obj An object containing a path, name or hash
     * @return {Boolean}     Whether or not the given property represents a direct descendant of this.
     */
    hasChild(obj)
    {
        let prop = '';
        if(typeof obj === 'string') {
            // assume path
            obj.path = obj;
        } else if(typeof obj === 'number') {
            // assume hash
            obj.hash = obj;
        } else if(obj.hasOwnProperty('path')) {
            prop = 'path;'
        } else if(obj.hasOwnProperty('name')) {
            prop = 'name';
        } else if(obj.hasOwnProperty('hash')) {
            prop = 'hash';
        }

        if(prop === '') {
            return false;
        }

        for(let c of this.children) {
            if(c[prop] === obj[prop]) {
                return true;
            }
        }

        return false;
    }

    /**
     * On renames, ZettlrFile objects will trigger sorts on this object
     * @return {ZettlrDir} This for chainability.
     */
    sort()
    {
        this.children = sort(this.children);
        return this;
    }

    /**
     * Dummy function for recursive use. Always returns true.
     * @return {Boolean} Returns true, because this is a directory.
     */
    isDirectory() { return true; }

    /**
     * Dummy function for recursive use. Always returns false.
     * @return {Boolean} Returns false, because this is not a file.
     */
    isFile()      { return false; }

    /**
     * Returns false, if this.parent is a directory.
     * @return {Boolean} True or false depending on the type of this.parent
     */
    isRoot()      { return !this.parent.isDirectory(); }
}

module.exports = ZettlrDir;
