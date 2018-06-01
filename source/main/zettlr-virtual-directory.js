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
        this._realDirectories = []; // Representation of _virtualDirectories containing links to the actual ZettlrFileObjects
    }

    /**
     * Adds a virtual directory and (optionally) files to it. Creates the virtual
     * dir if necessary.
     * TODO: Make it possible to add without IDs, but by relative paths.
     * @param {String} name       Directory name
     * @param {Array}  [files=[]] An array containing IDs of files.
     * @return {Boolean} Whether or not the directory and/or files were added correctly.
     */
    add(name, files = [])
    {
        // Is the name valid?
        if(typeof name != 'string') {
            return false;
        }

        // Does this directory already exist?
        let dir = this._virtualDirectories.find((elem) => { return (elem.name.toLowerCase() == name.toLowerCase()); });
        if(!dir) {
            dir = { 'name': name, 'files': [] };
            this._virtualDirectories.push(dir);
        }

        for(let f of files) {
            // Only push files existing within this directory.
            if(this._directory.isScope(f)) {
                dir.files.push(this._makeRelative(f)); // Always only store relative paths.
            }
        }

        // Immediately reflect changes on disk
        this._write();
        return true;
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
        this._refresh(); // Initial refresh
        return true;
    }

    _write()
    {
        // TODO: We need to ensure the file is also hidden on Windows. But writing
        // with "w" will result in EPERM, we need to use r+ for this.
        // Maybe use this: https://nodejs.org/api/fs.html#fs_fs_ftruncatesync_fd_len
        // Truncates a file using its descriptor
        //
        // Update June 1st: I don't think we need to ensure the bullshitty attribute
        // thing Windows does.
        fs.writeFileSync(this._file, JSON.stringify(this._virtualDirectories), { encoding: "utf8", flag: "w" });
        this._refresh();
    }

    /**
     * This function makes sure all files are correct representations of virtualDirectories
     */
    _refresh()
    {
        this._realDirectories = [];

        for(let dir of this._virtualDirectories)
        {
            let real = { 'name': dir.name, 'files': []};
            for(let file of dir.files) {
                // 1. Find file
                // 2. Add file
                // 3. Add complete dir.
                let file = this._directory.findFile({'path': this._makeAbsolute(file)});
                if(file) {
                    real.files.push(file);
                }
            }
            this._realDirectories.push(real);
        }
    }

    /**
     * Makes a path relative (extracts the root directory's path from interval)
     * @param  {String} p The path to be returned relative
     * @return {String}   The relative path
     */
    _makeRelative(p)
    {
        if(this._isAbsolute(p)) {
            return p.replace(this._root, '');
        }

        return p;
    }

    /**
     * Returns an absolute path (i.e. a path containing the complete path to file)
     * @param  {String} p The path to be returned absolute
     * @return {String}   The absolute path.
     */
    _makeAbsolute(p)
    {
        if(!this._isAbsolute(p)) {
            return path.join(this._root, p);
        }

        return p;
    }

    /**
     * Whether or not the path is absolute (i.e. contains the root string's path)
     * @param  {String}  p The path to checked
     * @return {Boolean}   True, if the path contains the root directory's path
     */
    _isAbsolute(p)
    {
        if(p.indexOf(this._root) == 0) {
            return true;
        }

        return false;
    }
}

module.exports = ZettlrVirtualDirectory
