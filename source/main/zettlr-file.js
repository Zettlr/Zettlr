// MODEL HANDLING FILES

const trash     = require('trash');
const fs        = require('fs');
const path      = require('path');
const sanitize  = require('sanitize-filename');

function FileError(msg) {
    this.name = 'File error';
    this.msg = msg;
}

class ZettlrFile
{
    constructor(parent, fname = null)
    {
        this.parent     = parent;
        this.name       = '';
        this.path       = '';
        this.hash       = null;
        this.type       = 'file';
        this.ext        = '';
        this.snippet    = '';
        this.content    = ''; // Will only be not empty when the file is modified.
        this.isModified = false;

        // Prepopulate if filename is given
        if(fname !== null) {
            this.path = fname;
            this.name = path.basename(this.path);
            this.hash = this.hashPath(this.path);
            this.ext  = path.extname(this.path);

            // The file might've been just created. Test that
            try {
                let stat = fs.lstatSync(this.path);
            }catch(e) {
                // Error? -> create
                fs.writeFileSync(this.path, '', { encoding: "utf8" });
            }

            this.read();
        }
    }

    setContent(cnt)
    {
        this.content = cnt;
        // Also update snippet to reflect changes at the beginning of the file
        this.snippet = (cnt.length > 50) ? cnt.substr(0, 50) + '…' : cnt ;
        this.isModified = true;
    }

    read()
    {
        // (Re-)read content of file
        let cnt = fs.readFileSync(this.path, { encoding: "utf8" });
        this.snippet = (cnt.length > 50) ? cnt.substr(0, 50) + '…' : cnt ;
        this.isModified = false;

        return cnt;
    }

    // Returns the file content if hashes match
    get(hash)
    {
        if(this.hash == hash) {
            return this.read();
        }
        return null;
    }

    // Push this hash into the array and return
    getFileHashes(arr)
    {
        return arr.push(this.hash);
    }

    // The object should return itself with content included
    // -- only for send to client
    withContent()
    {
        // We need to duplicate the file object, because otherwise the content
        // will remain in the RAM. If you open a lot files during one session
        // with Zettlr it will gradually fill up all space, rendering your
        // computer more and more slow.
        let f = {};
        Object.assign(f, this);
        f.content = this.read();
        return f;
    }

    // Dummy function, always returns null (as this is no directory)
    // Eases recursive use in findDir of directories.
    findDir(obj)
    {
        return null;
    }

    // This function either returns this OR null depending on the prop
    findFile(obj)
    {
        let prop = '';

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
    }

    save()
    {
        fs.writeFileSync(this.path, this.content, { encoding: "utf8" });
        this.content = '';
        this.isModified = false;
    }

    isModified()
    {
        return this.isModified;
    }

    remove()
    {
        // Removes the file from system and also from parent object.
        trash([this.path]); // We'll just trust that promise :D
        this.parent.remove(this);
    }

    rename(name)
    {
        name = sanitize(name);

        // Rename this file.
        if((name == null) || (name == '')) {
            throw new FileError('The new name did not contain any allowed characters.');
        }

        // Make sure we got an extension.
        if(path.extname(name) != '.md') {
            name += '.md';
        }

        // Rename
        this.name = name;
        let newpath = path.join(path.dirname(this.path), this.name);

        fs.renameSync(this.path, newpath);
        // Remove old file
        this.path = newpath;

        // Let the parent sort itself again to reflect possible changes in order.
        this.parent.sort();

        // Chainability
        return this;
    }

    move(toPath)
    {
        // First detach the object.
        this.detach();

        // Find new path:
        let oldPath = this.path;
        this.path = path.join(toPath, this.name);
        this.hash = this.hashPath(this.path);

        // Move
        fs.renameSync(oldPath, this.path);

        // Chainability
        return this;
    }

    // Detach from parent.
    detach()
    {
        this.parent.remove(this);
        this.parent = null;
        return this;
    }

    search(terms)
    {
        // Now suuuuuuurchhhh
        let matches = 0;

        // First match the title (might help)
        for(let t of terms) {
            if(t.operator === 'AND') {
                if(this.name.indexOf(t.word) > -1) {
                    matches++;
                }
            } else {
                // OR
                for(let wd of t.word) {
                    if(this.name.indexOf(wd) > -1) {
                        matches++;
                        break;
                    }
                }
            }
        }

        // Abort immediately
        if(matches == terms.length) {
            return true;
        }

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
        return false;
    }

    isFile()
    {
        return true;
    }
}

module.exports = ZettlrFile;
