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

class ZettlrInterface
{
    constructor(dbPath)
    {
        this._path = dbPath;
        this._data = [];
        this._timeout = null; // Minimise disk use
        // Initial read
        this._read();
    }

    getDatabase()
    {
        return this._path;
    }

    getData()
    {
        return this._data;
    }

    has(data)
    {
        return (this._data.indexOf(data) > -1);
    }

    set(row, value)
    {
        clearTimeout(this._timeout);
        let found = this._data.find((elem) => { return (elem.name == row); });
        if(found) {
            if(value != null) {
                // Use splice for the first time to not delete, but replace by giving the third argument.
                console.log(`Updating row ${row} in dataset.`);
                this._data.splice(this._data.indexOf(found), 1, value);
            } else {
                // Remove from dataset
                console.log(`Removing row ${row} from dataset.`);
                this._data.splice(this._data.indexOf(found), 1);
            }
        } else {
            // Create new
            this._data.push(value);
        }
        this._timeout = setTimeout(() => { this._write(); }, TIMEOUT);
        return this;
    }

    get(attribute)
    {
        if(this.has(attribute)) {
            return this._data[attribute];
        }

        return undefined;
    }

    _write()
    {
        if(this._data.length <= 0) {
            // No data to write, remove file if existent. TODO
        }
        fs.writeFileSync(this._path, JSON.stringify(this._data), { encoding: "utf8" });
    }

    _read()
    {
        try {
            fs.lstatSync(this._path);
            let data = fs.readFileSync(this._path, { encoding: "utf8" });
            this._data = JSON.parse(data);
        } catch(e) {
            this._data = []; // Empty object b/c file not found -> new database
        }
    }
}

module.exports = ZettlrInterface;
