/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrFilter class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Manages the directory filters.
 *
 * END HEADER
 */

const path = require('path');
const fs   = require('fs');

const FILTER_MODES = [
    "contains",
    "filename_contains",
    "has_tag" // Let me solve: h!
];

/**
 * This class manages filters for directories, i.e. dynamic searches.
 * TODO: Not yet implemented. It's only here to indicate I'm working on it.
 */
class ZettlrFilter
{
    constructor(dir)
    {
        this._directory = dir;   // The managing directory
        this._filters = [];     // Holds all applicable filters
        this._file = path.join(this._directory.getPath(), '.ztr-filter');

        // Read the filter file if applicable
        this._read();
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
            // No filter file -> no filters
            return false;
        }

        // We've got filters!
        this._filters = JSON.parse(fs.readFileSync(this._file, { encoding: "utf8" }));
        return true;
    }

    /**
     * Adds a filter to the directory
     * @param {String} name  The (unique) name of the filter
     * @param {Object} rules An Array containing one or more filter rules.
     */
    add(name, rules)
    {
        try {
            let stat = fs.lstatSync(this._file)
        } catch(e) {
            // Explicitly create the file
            this._write();
        }

        if(typeof name != 'string') {
            throw new Error('Wrong type on add filter. Name must be string.');
        }

        if(!this._unique(name)) {
            throw new Error('Name of the filter must be unique!');
        }

        // Rules have two attributes: "mode" and "content".
        // "mode" can be either:
        // - "contains" (will execute a normal search in the directory using "content")
        // - "filename_contains" (will sort using filenames which include "content")
        // - "has_tag" (only shows files containing a specific tag given in "content")
        for(let rule of rules) {
            if(!FILTER_MODES.includes(rule.mode) || rule.content.length == 0) {
                rules.splice(rules.indexOf(rule), 1);
            }
        }

        // Add the filters and immediately write to disk.
        this._filters.push({ 'name': name, 'rules': rules });
        this._write();
    }

    /**
     * Writes the filters to disk and ensures they're hidden even on windows.
     */
    _write()
    {
        // TODO: We need to ensure the file is also hidden on Windows. But writing
        // with "w" will result in EPERM, we need to use r+ for this.
        // Maybe use this: https://nodejs.org/api/fs.html#fs_fs_ftruncatesync_fd_len
        // Truncates a file using its descriptor
        fs.writeFileSync(this._file, JSON.stringify(this._filters), { encoding: "utf8", flag: "w" });
    }

    // Is a filter name unique?
    _unique(n)
    {
        for(let fltr of this._filters) {
            // The lower case is only to ensure that for the end user the name also
            // looks unique more clearly.
            if(fltr.name == n || fltr.name.toLowerCase() == n.toLowerCase()) {
                return false;
            }
        }

        return true;
    }
}

module.exports = ZettlrFilter;
