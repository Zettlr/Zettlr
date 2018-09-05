/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrDir class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the ZettlrDir class, modeling a directory
 *                  on disk for the app.
 *
 * END HEADER
 */

const path                   = require('path');
const fs                     = require('fs');
const sanitize               = require('sanitize-filename');
const ZettlrFile             = require('./zettlr-file.js');
const ZettlrAttachment       = require('./zettlr-attachment.js');
const ZettlrProject          = require('./zettlr-project.js');
const ZettlrVirtualDirectory = require('./zettlr-virtual-directory.js');
const ZettlrInterface        = require('./zettlr-interface.js');
const {shell}                = require('electron');
const {trans}                = require('../common/lang/i18n.js');

// Include helpers
const { hash, sort, generateName,
    ignoreDir, ignoreFile, isFile, isDir, isAttachment
} = require('../common/zettlr-helpers.js');

const ALLOW_SORTS = ['name-up', 'name-down', 'time-up', 'time-down'];
const FILETYPES = require('../common/data.json').filetypes;

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
     * @param {String} dir      The full path to the directory
     */
    constructor(parent, dir)
    {
        if(dir === null || dir === '') {
            throw new DirectoryError('Error on ZettlrDir instantiation: dir cannot be empty!');
        }

        // Prepopulate
        this.parent         = parent;
        this.path           = dir;
        this.name           = path.basename(this.path);
        this.hash           = hash(this.path);
        this.project        = null;  // null, if this directory is not a project, and an instance of ZettlrProject, if it is.
        this.children       = [];
        this.attachments    = [];
        this.type           = 'directory';
        this.sorting        = 'name-up';

        // Create an interface for virtual directories
        this._vdInterface   = new ZettlrInterface(path.join(this.path, '.ztr-virtual-directories'));

        // The directory might've been just been created.
        try {
            let stat = fs.lstatSync(this.path);
        }catch(e) {
            // Error? -> create
            fs.mkdirSync(this.path);
        }

        // Load default files and folders
        this.scan();
        // Load virtual directories initially (if existent)
        this.loadVirtualDirectories();

        if(this.isRoot()) {
            // We have to add our dir to the watchdog
            this.parent.getWatchdog().addPath(this.path);
        }
    }

    /**
     * Initiates a shutdown to all children
     */
    shutdown()
    {
        // Shutdown all objects
        for(let c of this.children) {
            c.shutdown();
        }

        if(this.project) {
            this.project.save();
        }
    }

    /**
     * Handles an event sent fron the watchdog
     * @param  {String} p The path for which the event was thrown
     * @param  {String} e The event itself
     * @return {Boolean}   Whether the event actually caused a change.
     */
    handleEvent(p, e)
    {
        if((this.isScope(p) === this) && (e === 'unlinkDir')) {
            // This directory has been removed. Notify host process and remove.
            this.parent.notifyChange(trans('system.directory_removed', this.name));
            this.remove();
            return true;
        } else if(this.isScope(p) === true) {
            if((path.dirname(p) === this.path) && (e === 'add' || e === 'addDir')) {
                // A new dir or a new file has been created here. Re-Scan.
                this.scan();
                return true;
            }
            // Some children has to handle it
            let change = false;
            for(let c of this.children) {
                if(c.handleEvent(p, e)) {
                    change = true;
                }
            }
            return change;
        }

        // If this part is executed, nothing has changed.
        return false;
    }

    /**
     * Notifies the parent (a dir or Zettlr) to send a notification + paths-update.
     * @param  {String} msg The message to be sent.
     */
    notifyChange(msg)
    {
        this.parent.notifyChange(msg);
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
     * Either returns a file if the match is exact, or null
     * @param  {String} term The ID to be searched for
     * @return {ZettlrFile}      ZettlrFile or null.
     */
    findExact(term)
    {
        for(let c of this.children) {
            let file = c.findExact(term);
            if(file != null) {
                return file;
            }
        }

        return null;
    }

    /**
     * Creates a new subdirectory and returns it.
     * @param  {String} name The name (not path!) for the subdirectory.
     * @param  {ZettlrWatchdog} [watchdog=null] The optional watchdog instance
     * @return {ZettlrDir}      The newly created directory.
     */
    newdir(name, watchdog = null)
    {
        // Remove unallowed characters.
        name = sanitize(name);
        if((name === '') || (name === null)) {
            throw new DirectoryError(trans('system.error.no_allowed_chars'));
        }
        let newpath = path.join(this.path, name);

        if(typeof watchdog === 'object' && watchdog.hasOwnProperty('ignoreNext')) {
            this.watchdog.ignoreNext('addDir', newpath);
        }

        let dir = new ZettlrDir(this, newpath);
        this.children.push(dir);
        this.children = sort(this.children, this.sorting);

        // Return dir for chainability
        return dir;
    }

    /**
     * Create a new file in this directory.
     * @param  {String} name The new name, if given
     * @param {ZettlrWatchdog} [watchdog=null] The optional watchdog instance
     * @return {ZettlrFile}             The newly created file.
     */
    newfile(name, watchdog = null)
    {
        if(name == null) {
            // Generate a unique new name
            name = generateName();
        }

        name = sanitize(name);
        // This gets executed once the user has not entered any allowed characters
        if((name == '') || (name == null)) {
            throw new DirectoryError(trans('system.error.no_allowed_chars'));
        }

        // Do we have a valid extension?
        if(!FILETYPES.includes(path.extname(name))) {
            name = name + ".md"; // Assume Markdown by default
        }

        // Already exists
        if(this.exists(path.join(this.path, name))) {
            throw new DirectoryError(trans('system.error.file_exists'));
        }

        // If we got the watchdog instance, ignore the creation event
        if(typeof watchdog === 'object' && watchdog.hasOwnProperty('ignoreNext')) {
            watchdog.ignoreNext('add', path.join(this.path, name));
        }

        // Create a new file.
        let f = new ZettlrFile(this, path.join(this.path, name));
        this.children.push(f);
        this.children = sort(this.children, this.sorting);
        return f;
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

            this.shutdown();

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
        this.children = []; // Dereference old list

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
        this.children = sort(this.children, this.sorting);

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
        // (Re-)Reads this directory.
        try {
            let stat = fs.lstatSync(this.path);
        }catch(e) {
            // Do not create directories here, only read.
            return;
        }

        // (Re-)read the directory
        let files = fs.readdirSync(this.path);

        // Convert to absolute paths
        for(let i = 0; i < files.length; i++) {
            files[i] = path.join(this.path, files[i]);
        }

        // Remove all paths that are to be ignored
        for(let f of files) {
            if((isDir(f) && ignoreDir(f)) || (isFile(f) && ignoreFile(f) && !isAttachment(f))) {
                files.splice(files.indexOf(f), 1);
            }
        }

        let nVirtualDirectories = [];
        let nChildren = [];
        let nAttachments = [];

        // Remove all children that are no longer present
        for(let c of this.children) {
            // Hop over virtual directories.
            if(c.type == 'virtual-directory') {
                nVirtualDirectories.push(c);
                continue;
            }
            if(!files.includes(c.path)) {
                c.shutdown();
                this.children.splice(this.children.indexOf(c), 1);
            }
        }

        // Iterate over all files
        for(let f of files) {
            // Do we already have it?
            let found = this.children.find((elem) => { return elem.path == f; });
            let fattach = this.attachments.find((elem) => { return elem.path == f; });
            if(found !== undefined || fattach !== undefined) {
                if(found) nChildren.push(found);
                if(fattach) nAttachments.push(fattach);
            } else {
                // Otherwise create new
                if(isFile(f) && !ignoreFile(f)) {
                    nChildren.push(new ZettlrFile(this, f));
                } else if(isDir(f) && !ignoreDir(f)) {
                    nChildren.push(new ZettlrDir(this, f));
                } else if(isAttachment(f)) {
                    nAttachments.push(new ZettlrAttachment(this, f));
                }
            }
        }

        // Add the virtual directories to the children's list
        this.children = nVirtualDirectories.concat(nChildren);
        this.attachments = nAttachments;

        // Final step: Sort
        this.children = sort(this.children, this.sorting);
        this.attachments.sort((a, b) => {
            // Negative return: a is smaller b (case insensitive)
            if(a.name.toLowerCase() < b.name.toLowerCase()) {
                return -1;
            } else if(a.name.toLowerCase() > b.name.toLowerCase()) {
                return 1;
            } else {
                return 0;
            }
        });

        // Last but not least check if we are a project
        if(ZettlrProject.isProject(this)) {
            // We can reuse the function here.
            this.makeProject();
        }

        return this;
    }

    /**
     * Creates a project for this directory.
     */
    makeProject()
    {
        if(!this.project) {
            this.project = new ZettlrProject(this);
        }
    }

    /**
     * Removes the project from this dir.
     * @return {[type]} [description]
     */
    removeProject()
    {
        if(this.project) {
            this.project.remove();
            this.project = null;
        }
    }

    /**
     * Returns the project.
     * @return {ZettlrProject} The Zettlr Project instance, or null, if there is none.
     */
    getProject()
    {
        return this.project;
    }

    /**
     * Toggles the sorting. Default is name-up
     * @param  {String} [type='name-up'] Can be an allowed sorting, or just time or name.
     * @return {ZettlrDir}               Chainability
     */
    toggleSorting(type = 'name-up')
    {
        if(ALLOW_SORTS.includes(type)) {
            this.sorting = type;
        } else if(type.indexOf('name') > -1) {
            if(this.sorting == 'name-up') {
                this.sorting = 'name-down';
            } else {
                this.sorting = 'name-up';
            }
        } else if(type.indexOf('time') > -1) {
            if(this.sorting == 'time-up') {
                this.sorting = 'time-down';
            } else {
                this.sorting = 'time-up';
            }
        } else {
            this.sorting = 'name-up';
        }

        this.children = sort(this.children, this.sorting);
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
        if(!obj) {
            // In rare occasions, it can happen that there is no object given
            return false;
        }

        if(typeof obj === 'number') {
            // Same problem as in the find-methods. Only here I don't care anymore.
            // Simply assume a hash. Nothing else could be it.
            obj = { 'hash': obj };
        } else if(!obj.hasOwnProperty('hash')) {
            // Prevent errors.
            return false;
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
        this.children = sort(this.children, this.sorting);
        return this;
    }

    /**
     * Loads virtual directories from disk
     */
    loadVirtualDirectories()
    {
        let data = this._vdInterface.getData();
        if(!data) {
            // No data in file
            return;
        }
        let arr = [];
        for(let vd of data) {
            arr.push(new ZettlrVirtualDirectory(this, vd, this._vdInterface));
        }

        // Initial load of virtual directories
        this.children = arr.concat(this.children);
        this.sort();
    }

    /**
     * Adds a virtual directory if it doesn't already exist.
     * @param {String} n The directory's name
     */
    addVirtualDir(n)
    {
        n = sanitize(n); // Same rules as "normal" directories. Why? To keep it JSON-safe.
        if(!this._vdInterface.has(n)) {
            let vd = { 'name': n, 'files': []};
            this._vdInterface.set(vd.name, vd);
            vd = new ZettlrVirtualDirectory(this, vd, this._vdInterface);
            this.children.push(vd);
            this.sort();
        } else {
            // Already exists!
            this.notifyChange(trans('system.error.virtual_dir_exists', n));
        }
    }

    /**
     * Returns the hash of the dir
     * @return {Number} The hash
     */
    getHash() { return this.hash; }

    /**
     * Returns the directory path
     * @return {String} The path
     */
    getPath() { return this.path; }

    /**
     * Returns the directory name
     * @return {String} The dir name
     */
    getName() { return this.name; }

    /**
     * Dummy function for recursive use. Always returns true.
     * @return {Boolean} Returns true, because this is a directory.
     */
    isDirectory() { return true; }

    /**
     * Dummy function for recursive use. Always returns false.
     * @return {Boolean} Returns false.
     */
    isVirtualDirectory() { return false; }

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

    /**
     * Checks whether or not the given path p is in the scope of this object
     * @param  {String}  p The path to test
     * @return {Mixed}   "this" if p equals path, true if in scope or false.
     */
    isScope(p)
    {
        if(p === this.path) {
            return this;
        } else if(p.indexOf(this.path) != -1) {
            return true;
        }

        return false;
    }
}

module.exports = ZettlrDir;
