// THIS CLASS CONTROLS A SINGLE DIRECTORY
const path       = require('path');
const fs         = require('fs');
const sanitize   = require('sanitize-filename');
const trash      = require('trash');
const ZettlrFile = require('./zettlr-file.js');

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

            // Populate children array
            this.readDir();
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

    // Check whether or not this dir contains the given dir
    contains(dir)
    {
        if(this.findDir({ 'hash': dir.hash }) !== null) {
            return true;
        } else {
            return false;
        }
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
            date = new Date();
            yyyy = date.getFullYear();
            mm = date.getMonth() + 1;
            if(mm <= 9) mm =  '0' + mm;
            dd = date.getDate();
            if(dd <= 9) dd = '0' + dd;
            hh = date.getHours();
            if(hh <= 9) hh =  '0' + hh;
            m = date.getMinutes();
            if(m <= 9) m =  '0' + m;
            ss = date.getSeconds();
            if(ss <= 9) ss =  '0' + ss;
            add = "-" + yyyy + "-" + mm + "-" + dd + " " + hh + ":" + m + ":" + ss;

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

            trash([this.path]);  // We'll just trust that promise :D
            // While it is trashing, remove and stuff
            this.parent.remove(this);
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

    readDir()
    {
        // Reads this directory.
        try {
            let stat = fs.lstatSync(this.path);
        }catch(e) {
            // Do not create directories here, only read.
            throw new DirectoryError('Directory does not exist!');
        }

        // Read the directory
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
}

module.exports = ZettlrDir;
