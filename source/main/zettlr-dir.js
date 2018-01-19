// THIS CLASS CONTROLS A SINGLE DIRECTORY
const path       = require('path');
const fs         = require('fs');
const sanitize   = require('sanitize-filename');
const ZettlrFile = require('./zettlr-file.js');
const {shell}    = require('electron');
// chokidar watchdog
const chokidar   = require('chokidar');

function DirectoryError(msg) {
    this.name = 'Directory error';
    this.message = msg;
}

class ZettlrDir
{
    constructor(parent, dir = null)
    {
        this.path = "";
        this.name = "";
        this.hash = null;
        this.children = [];
        this.type = 'directory';
        this.parent = parent;
        this.watchdog = null;
        this.watching = false; // Is chokidar already watching?

        // Prepopulate if given.
        if(dir != null) {
            this.path = dir;
            this.name = path.basename(this.path);
            this.hash = this.hashPath(this.path);

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
                    let fhash = this.hashPath(path.dirname(p));
                    let dir = this.findDir({ 'hash': fhash });
                    dir.scan();
                    // TODO: notify Zettlr if the file is currently visible.
                    if(this.parent.getCurrentDir().contains(this.hashPath(p))) {
                        this.parent.fsNotify('add', dir.findFile({ 'hash': this.hashPath(p) }));
                    }
                });

                this.watchdog.on('change', p => {
                    // A file has changed
                    let file = this.findFile({ 'hash': this.hashPath(p) });
                    // Update
                    file.read();
                    if(this.parent.getCurrentDir().contains(file.hash)) {
                        this.parent.fsNotify('change', file);
                    }
                });

                this.watchdog.on('unlink', p => {
                    // File has been removed
                    let dir = this.findDir({ 'hash': this.hashPath(path.dirname(p)) });
                    dir.scan();
                    if(this.parent.getCurrentDir().contains(this.hashPath(p))) {
                        this.parent.fsNotify('unlink', dir.findFile({ hash: this.hashPath(p) }));
                    }
                });

                this.watchdog.on('addDir', p => {
                    if(!this.watching) return;
                    // Add the dir
                    let dir = this.findDir({ hash: this.hashPath(path.dirname(p)) });

                    // If a dir is added to the root and the root is huge
                    // guess what happens: exactly, freeze! (e.g.: fine-tune
                    // in the next version)
                    dir.scan();
                    if(this.parent.getCurrentDir().contains(this.hashPath(p))) {
                        this.parent.fsNotify('addDir', dir);
                    }
                });

                this.watchdog.on('unlinkDir', p => {
                    let dir = this.findDir({hash: this.hashPath(p) });
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
        } else {
            // Try a file
            if(this.findFile({ 'hash': obj.hash}) !== null) {
                return true;
            }
        }

        return false;
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
        this.sort();

        // Return dir for chainability
        return dir;
    }

    newfile(name = null)
    {
        if(name == null) {
            // Just take the current time.
            let date = new Date();
            let yyyy = date.getFullYear();
            let mm = date.getMonth() + 1;
            if(mm <= 9) mm =  '0' + mm;
            let dd = date.getDate();
            if(dd <= 9) dd = '0' + dd;
            let hh = date.getHours();
            if(hh <= 9) hh =  '0' + hh;
            let m = date.getMinutes();
            if(m <= 9) m =  '0' + m;
            let ss = date.getSeconds();
            if(ss <= 9) ss =  '0' + ss;
            let add = yyyy + "-" + mm + "-" + dd + " " + hh + ":" + m + ":" + ss;

            name = "New file " + add + ".md";
        }

        name = sanitize(name);
        // This gets executed once the user has not entered any allowed characters
        if((name === '') || (name === null)) {
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
        this.sort();
        return f;
    }

    get(hash)
    {
        // This function is supposed to return the file contents with the hash.
        // Let each children decide if they are correct.
        let cnt = null;
        for(let c of this.children) {
            cnt = c.get(hash);
            if(cnt != null) {
                // Got it -> return and abort.
                return cnt;
            }
        }

        return cnt;
    }

    remove(obj = this)
    {
        if(obj === this) {
            // Remove this directory but ONLY if it is NOT the root.
            // Root's parent is the Zettlr object itself
            if( (!this.parent.hasOwnProperty('type')) && (this.parent.type !== 'directory') ) {
                return false;
            }

            if(shell.moveItemToTrash(this.path)) {
                // While it is trashing, remove and stuff
                this.parent.remove(this);
            } else {
                throw new DirectoryError('Could not move directory to trash!');
            }
        } else {
            // Remove a file (function was called by a children)
            let index = this.children.indexOf(obj);

            // Should (normally) always be true
            if(index > -1) {
                this.children.splice(index, 1);
            } else {
                // If this ever gets written to console, I'd need to inspect ...
                console.error('I am ' + this.name);
                console.error('Could not find children inside children array!');
                for(let c of this.children) {
                    console.log('Children: ' + c.name);
                }
                console.log('*'.repeat(30));
                console.log('Not found was: ' + obj.name);
                return false;
            }
        }

        return true;
    }

    // Sort the children of this directory
    sort()
    {
        // First sort through children array (necessary if new children were added)
        this.children.sort((a, b) => {
            // Negative return: a is smaller b
            if(a.name < b.name) {
                return -1;
            } else if(a.name > b.name) {
                return 1;
            } else {
                return 0;
            }
        });

        // Now split the children into files and directories and concat again
        let f = [];
        let d = [];

        for(let c of this.children) {
            if(c.type === 'file') {
                f.push(c);
            } else if(c.type === 'directory') {
                d.push(c);
            }
        }

        // Shoud still be sorted from readdirSync and only split into directories and files.
        this.children = f.concat(d);
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
        this.hash = this.hashPath(this.path);

        // Move
        fs.renameSync(oldPath, this.path);
        this.children = []; // Unreference old list

        // Re-read
        this.readDir();

        // Chainability
        return this;
    }

    // Attach a new children to this element (mainly happens while moving)
    attach(newchild)
    {
        this.children.push(newchild);
        // Set the correct new parent
        newchild.parent = this;
        this.sort();

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

        // Final step: Sort the children from files (first) and directories (after)
        this.sort();
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

    // Just very basic hashing function (thanks to https://stackoverflow.com/a/7616484)
    hashPath(pathname)
    {
        let hash = 0, i, chr;
        if (pathname.length === 0) return hash;

        for(i = 0; i < pathname.length; i++) {
            chr = pathname.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    // Dummy functions
    isDirectory()
    {
        return true;
    }

    isFile()
    {
        return false;
    }

    isRoot()
    {
        // The Zettlr object is the only possible non-dir parent of a dir
        return !this.parent.isDirectory();
    }
}

module.exports = ZettlrDir;
