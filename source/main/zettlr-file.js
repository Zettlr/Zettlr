// MODEL HANDLING FILES

const trash = require('trash');
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');

function FileError(msg) {
    this.name = 'File error';
    this.msg = msg;
}

function ZettlrFile(parent, fname = null)
{
    this.parent = parent;
    this.name = "";
    this.path = "";
    this.hash = null;
    this.type = "file";
    this.ext = "";
    this.snippet = "";
    this.content = ''; // Will only be not empty when the file is modified.
    this.isModified = false;

    this.setContent = function(cnt) {
        this.content = cnt;
        // Also update snippet to reflect changes at the beginning of the file
        this.snippet = (cnt.length > 50) ? cnt.substr(0, 50) + '…' : cnt ;
        this.isModified = true;
    };

    this.read = function() {
        // (Re-)read content of file
        cnt = fs.readFileSync(this.path, { encoding: "utf8" });
        this.snippet = (cnt.length > 50) ? cnt.substr(0, 50) + '…' : cnt ;
        this.isModified = false;

        return cnt;
    };

    // Returns the file content if hashes match
    this.get = function(hash) {
        if(this.hash == hash) {
            return this.read();
        }
        return null;
    };

    // Push this hash into the array and return
    this.getFileHashes = function(arr) {
        return arr.push(this.hash);
    };

    // The object should return itself with content included
    // -- only for send to client
    this.withContent = function() {
        f = this; // Duplicate
        f.content = this.read();
        return f;
    };

    // Dummy function, always returns null (as this is no directory)
    // Eases recursive use in findDir of directories.
    this.findDir = function(obj) {
        return null;
    };

    // This function either returns this OR null depending on the prop
    this.findFile = function(obj) {
        let prop;

        if(obj.hasOwnProperty('path') && obj.path != null) {
            prop = 'path';
        } else if(obj.hasOwnProperty('hash') && obj.hash != null) {
            prop = 'hash';
        }

        if(this[prop] == obj[prop]) {
            return this;
        }

        // This is not the file you are looking for.
        return null;
    };

    this.save = function() {
        fs.writeFileSync(this.path, this.content, { encoding: "utf8" });
        this.content = '';
        this.isModified = false;
    };

    this.isModified = function() {
        return this.isModified;
    };

    this.remove = function() {
        // Removes the file from system and also from parent object.
        trash([this.path]); // We'll just trust that promise :D
        this.parent.remove(this);
    };

    this.rename = function(name) {
        // Rename this file.
        if((name == null) || (name == '')) {
            return;
        }

        // Make sure we got an extension.
        if(path.extname(name) != '.md') {
            name += '.md';
        }

        // Rename
        this.name = name;
        newpath = path.join(path.dirname(this.path), this.name);

        fs.renameSync(this.path, newpath);
        // Remove old file
        this.path = newpath;

        // Chainability
        return this;
    }

    this.move = function(toPath) {
        // First detach the object.
        this.detach();

        // Find new path:
        oldPath = this.path;
        this.path = path.join(toPath, this.name);
        this.hash = this.hashPath(this.path);

        // Move
        fs.renameSync(oldPath, this.path);

        // Chainability
        return this;
    };

    // Detach from parent.
    this.detach = function() {
        this.parent.remove(this);
        this.parent = null;
        return this;
    };

    this.search = function(terms) {
        // Now suuuuuuurchhhh
        let matches = 0;

        // Do a full text search.
        let cnt = this.read();
        cnt = cnt.toLowerCase();

        for(let t of terms) {
            if(t.operator === 'AND') {
                if(cnt.indexOf(t.word) > -1) {
                    matches++;
                }
            } else {
                // OR operator.
                for(let wd of t.word) {
                    if(cnt.indexOf(wd) > -1) {
                        matches++;
                        break;
                    }
                }
            }
        }
        return (matches == terms.length);
    };

    // Just very basic hashing function (thanks to https://stackoverflow.com/a/7616484)
    this.hashPath = function(pathname) {
        let hash = 0, i, chr;
        if (pathname.length === 0) return hash;

        for(i = 0; i < pathname.length; i++) {
            chr = pathname.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    };

    // Dummy functions
    this.isDirectory = () => { return false; };
    this.isFile = () => { return true; };

    // Prepopulate
    if(fname != null) {
        this.path = fname;
        this.name = path.basename(this.path);
        this.hash = this.hashPath(this.path);
        this.ext = path.extname(this.path);

        // The file might've been just created. Test that
        try {
            stat = fs.lstatSync(this.path);
        }catch(e) {
            // Error? -> create
            fs.writeFileSync(this.path, '', { encoding: "utf8" });
        }

        this.read();
    }

    // END POPULATE
}

module.exports = ZettlrFile;
