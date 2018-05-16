/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrVirtualDirectory
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Creates a virtual directory (for manually sorting files)
 *
 * END HEADER
 */

 const path = require('path');
 const fs   = require('fs');

/**
 * Manages virtual directories containing manually added files.
 */
class ZettlrVirtualDirectory
{
    constructor(dir)
    {
        this._directory = dir;
        this._file = path.join(this._directory.getPath(), '.ztr-virtual-dir');
        this._virtualDirectories = [];
    }

    /**
     * Adds a virtual directory and (optionally) files to it. Creates the virtual
     * dir if necessary.
     * TODO: Make it possible to add without IDs, but by relative paths.
     * @param {String} name       Directory name
     * @param {Array}  [files=[]] An array containing IDs of files.
     */
    add(name, files = [])
    {
        // Is the name valid?
        if(!this._unique(name) || name.length == 0) {
            return false;
        }

        // Does this directory already exist?
        let dir = this._virtualDirectories.find((elem) => { return (elem.name == name); });
        if(!dir) {
            dir = { 'name': name, 'files': [] };
            this._virtualDirectories.push(dir);
        }

        for(let f of files) {
            if(this._directory.containsID(f))
            dir.files.push(f);
        }
    }

    /**
     * Read filters from our filter file (or return false if no filters were found)
     * @return {Boolean} True, if filters have been loaded and false if not.
     */
    _read()
    {
        try {
            let stat = fs.lstatSync(this._file)
        } catch(e) {
            // No file -> no virtual directories
            return false;
        }

        // We've got filters!
        this._virtualDirectories = JSON.parse(fs.readFileSync(this._file, { encoding: "utf8" }));
        return true;
    }

    _write()
    {
        // TODO: We need to ensure the file is also hidden on Windows. But writing
        // with "w" will result in EPERM, we need to use r+ for this.
        // Maybe use this: https://nodejs.org/api/fs.html#fs_fs_ftruncatesync_fd_len
        // Truncates a file using its descriptor
        fs.writeFileSync(this._file, JSON.stringify(this._virtualDirectories), { encoding: "utf8", flag: "w" });
    }

    // Is a filter name unique?
    _unique(n)
    {
        for(let dir of this._virtualDirectories) {
            // The lower case is only to ensure that for the end user the name also
            // looks unique more clearly.
            if(dir.name == n || dir.name.toLowerCase() == n.toLowerCase()) {
                return false;
            }
        }

        return true;
    }
}

module.exports = ZettlrVirtualDirectory
