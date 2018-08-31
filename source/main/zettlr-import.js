/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrImport class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The importer is used to import various formats into Markdown
 *                  and save the resulting file somewhere inside the root tree
 *                  of the Zettlr instance.
 *
 * END HEADER
 */

const commandExists     = require('command-exists').sync;
const path              = require('path');
const fs                = require('fs');
const { isDir, isFile } = require('../common/zettlr-helpers.js');

const FILES             = require('../common/data.json').import_files;
// TODO

/**
 * Error object constructor.
 * @param       {String} msg              The message
 * @param       {String} [name='Import error']       The name of the error.
 * @constructor
 */
function ImportError(msg, name = 'Import error') {
    this.name = name;
    this.message = msg;
}

/**
 * This function checks a given file list and checks how good it is at guessing
 * the file format. Also this is used to decide manually which files to import
 * and which not.
 * @param  {Array} fileList An array containing a file list. If it's a string, a directory is assumed which is then read.
 * @return {Object} A sanitised object containing all files with some detected attributes.
 */
function checkImportIntegrity(fileList)
{
    let resList = [];

    if(!Array.isArray(fileList) && isDir(fileList)) {
        // We have to read in the directory if it is one.
        // (Re-)Reads this directory.
        try {
            let stat = fs.lstatSync(fileList);
        }catch(e) {
            // Complain big time
            throw ImportError(`${fileList} does not exist`);
        }

        let base = fileList;
        fileList = fs.readdirSync(fileList);

        // Convert to absolute paths
        for(let i = 0; i < fileList.length; i++) {
            fileList[i] = path.join(base, fileList[i]);
        }
    }

    // Now do the integrity check.
    for(let i = 0; i < fileList.length; i++) {
        // Is this a standard file?
        if(!isFile(fileList[i])) {
            continue;
        }

        // Guess the file format from the extension.
    }

    return resList;
}

function ZettlrImport(fileOrFolder)
{

}

module.exports = ZettlrImport;
