/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrInterface
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Handles a small JSON database on disk. This model/interface
 *                  is necessary to throttle access to the database (b/c independent
 *                  objects may at the same time try to access one file in write
 *                  mode).
 *
 *                  The data itself has the form of a single database table, where
 *                  each row describes one dataset and it's attributes the columns.
 *
 * END HEADER
 */

const path    = require('path');
const fs      = require('fs');

// Needed to throttle the file access
const TIMEOUT = 1000; // = require('../common/data.json').poll_time;

/**
 * This class provides a fake db-like interface for a JSON database. It provides
 * only rudimentary functionality fitted to the specific needs of Virtual Directories.
 */
class ZettlrInterface
{
    /**
     * Create an Interface and read in a potential database.
     * @param {string} dbPath The path of the JSON database to be used.
     */
    constructor(dbPath)
    {
        this._path = dbPath;
        this._data = [];
        this._timeout = null; // Minimise disk use
        // Initial read
        this._read();
    }

    /**
     * Simply returns the database path.
     * @return {String} The database path.
     */
    getDatabase()
    {
        return this._path;
    }

    /**
     * Returns the data saved in the database.
     * @return {Array} The data array.
     */
    getData()
    {
        return this._data;
    }

    /**
     * Checks if a certain row exists in the database
     * @param  {String}  rowname The name of the row to check.
     * @return {Boolean}         True, if the row exists, or false.
     */
    has(rowname)
    {
        return (this._data.find((elem) => { return (elem.name == rowname); }) != undefined);
    }

    /**
     * Updates a given row with value.
     * @param {String} row   The rowname to be searched for.
     * @param {Mixed} value The value for this row.
     */
    set(row, value)
    {
        clearTimeout(this._timeout);
        let found = this._data.find((elem) => { return (elem.name == row); });
        if(found) {
            if(value != null) {
                // Use splice for the first time to not delete, but replace by giving the third argument.
                this._data.splice(this._data.indexOf(found), 1, value);
            } else {
                // Remove from dataset
                this._data.splice(this._data.indexOf(found), 1);
            }
        } else {
            // Create new
            this._data.push(value);
        }
        this._timeout = setTimeout(() => { this._write(); }, TIMEOUT);
        return this;
    }

    /**
     * Retrieves a row from the database.
     * @param  {String} row The row name
     * @return {Mixed}           The row data, if there is any. Undefined, if not.
     */
    get(row)
    {
        let found = this._data.find((elem) => { return (elem.name == row); });
        if(found) {
            return found;
        }

        return undefined;
    }

    /**
     * Immediately writes all changes to disk without waiting for the timeout to
     * finish.
     * @return {ZettlrInterface} This for chainability.
     */
    flush()
    {
        // Immediately write all data to disk
        clearTimeout(this._timeout);
        this._write();
        return this;
    }

    /**
     * Writes the data to disk.
     */
    _write()
    {
        if(this._data.length <= 0) {
            // No data to write, remove file if existent. TODO
        }
        fs.writeFileSync(this._path, JSON.stringify(this._data), { encoding: "utf8" });
    }

    /**
     * Reads all data from the database, if there is one.
     * @return {ZettlrInterface} The interface itself.
     */
    _read()
    {
        try {
            fs.lstatSync(this._path);
            let data = fs.readFileSync(this._path, { encoding: "utf8" });
            this._data = JSON.parse(data);
        } catch(e) {
            this._data = []; // Empty object b/c file not found -> new database
        }

        return this;
    }
}

module.exports = ZettlrInterface;
