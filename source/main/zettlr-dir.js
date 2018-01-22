// THIS CLASS CONTROLS A SINGLE DIRECTORY
const path         = require('path');
const fs           = require('fs');
const sanitize     = require('sanitize-filename');
const ZettlrFile   = require('./zettlr-file.js');
const {shell}      = require('electron');
// chokidar watchdog
const chokidar     = require('chokidar');

// Include helpers
const { hash, sort, generateName } = require('../common/zettlr-helpers.js');

function DirectoryError(msg) {
    this.name = 'Directory error';
    this.message = msg;
}

class ZettlrDir
{
    constructor(parent, dir = null)
    {
        this.path     = "";
        this.name     = "";
        this.hash     = null;
        this.children = [];
        this.type     = 'directory';
        this.parent   = parent;
        this.watchdog = null;
        this.watching = false; // Is chokidar already watching?

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

            if(this.isRoot()) {
                // Begin watching the base dir.
                this.watchdog = chokidar.watch(this.path, {
                    ignored: /(^|[\/\\])\../,
                    persistent: true
                });

                // Only scan this dir AFTER the watchdog is ready to prevent
                // inconsistencies!
                this.watchdog.on('ready', () => {
                    this.watching = true;
                    this.scan();
                });

                this.watchdog.on('add', p => {
                    if(!this.watching) return;
                    // Simply add the file.

                    // First hash the path, find the corresponding dir and
                    // tell it to re-scan itself.
                    let fhash = hash(path.dirname(p));
                    let dir = this.findDir({ 'hash': fhash });
                    let file = dir.addChild(p);
                    if(file == null) {
                        // File was not markdown -> ignore
                        return;
                    }
                    if(this.parent.getCurrentDir().contains(hash(p))) {
                        this.parent.fsNotify('add', file);
                    }
                });

                this.watchdog.on('change', p => {
                    // A file has changed
                    let file = this.findFile({ 'hash': hash(p) });
                    // Update
                    file.read();
                    if(this.parent.getCurrentDir().contains(file.hash)) {
                        this.parent.fsNotify('change', file);
                    }
                });

                this.watchdog.on('unlink', p => {
                    // File has been removed
                    let dir = this.findDir({ 'hash': hash(path.dirname(p)) });
                    let file = dir.findFile({ 'hash': hash(p) });
                    dir.scan();
                    this.parent.fsNotify('unlink', file);
                });

                this.watchdog.on('addDir', p => {
                    if(!this.watching) return;
                    // Add the dir
                    let dir = this.findDir({ 'hash': hash(path.dirname(p)) });

                    // Tell the directory to add the new one
                    let newdir = dir.addChild(p);
                    if(this.parent.getCurrentDir().contains(hash(p))) {
                        this.parent.fsNotify('addDir', newdir);
                    }
                });

                this.watchdog.on('unlinkDir', p => {
                    let dir = this.findDir({ 'hash': hash(p) });
                    let contains = false;
                    if(this.parent.getCurrentDir().contains(dir.hash)) {
                        contains = true;
                    } else {
                        contains = false;
                    }
                    dir.remove();
                    this.parent.fsNotify('unlinkDir', contains); // true = contained the dir
                });
            } else {
                // No root dir - directly scan.
                // Populate children array
                this.scan();
            }
        }
    }

    // Takes an object and returns a ZettlrDir-object (or null)
    findDir(obj)
    {
        let prop;

        if(obj.hasOwnProperty('path') && obj.path != null) {
            prop = 'path';
        } else if(obj.hasOwnProperty('hash') && obj.hash != null) {
            prop = 'hash';
        } else {
            // This is just self-preservation. I ALWAYS call this function ONLY
            // with a hash, and NOT with Hash: <hash> which ALWAYS results in the
            // strangest errors. I can't stand it anymore! Now at least it won't
            // proceed in any way.
            throw new DirectoryError("I don't know what to search for!");
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

    findFile(obj)
    {
        let prop;

        if(obj.hasOwnProperty('path') && obj.path != null) {
            prop = 'path';
        } else if(obj.hasOwnProperty('hash') && obj.hash != null) {
            prop = 'hash';
        } else {
            // This is just self-preservation. I ALWAYS call this function ONLY
            // with a hash, and NOT with Hash: <hash> which ALWAYS results in the
            // strangest errors. I can't stand it anymore! Now at least it won't
            // proceed in any way.
            throw new DirectoryError("I don't know what to search for!");
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

    getFileHashes(arr = [])
    {
        for(let c of this.children) {
            // Concat all directories's hash arrays
            arr.concat(c.getFileHashes(arr));
        }
        // And return
        return arr;
    }

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

    // Triggered by the watchdog - add a child
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

    // Attach a new children to this element (mainly happens while moving)
    attach(newchild)
    {
        this.children.push(newchild);
        // Set the correct new parent
        newchild.parent = this;
        this.children = sort(this.children);

        return this;
    }

    // Detach from parent.
    detach()
    {
        this.parent.remove(this);
        this.parent = null;
        return this;
    }

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
                if(extname == '.md' || extname == '.txt') {
                    // Exclude non-md- and -txt-files
                    this.children.push(new ZettlrFile(this, p));
                }
            } // With else if exlude everything like symlinks etc and skip them
        }

        // Final step: Sort
        this.children = sort(this.children);
    }

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

    // Check whether or not this dir contains the given object (dir or file)
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

    // On renames, ZettlrFile objects will trigger sorts on this object
    sort() { this.children = sort(this.children); }

    // Dummy functions
    isDirectory() { return true; }
    isFile()      { return false; }
    isRoot()      { return !this.parent.isDirectory(); }
}

module.exports = ZettlrDir;
