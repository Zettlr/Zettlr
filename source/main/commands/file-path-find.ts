/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FilePathFind command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command finds the absolute path of a file
 *
 * END HEADER
 */

import path from 'path'
import ZettlrCommand from './zettlr-command'
import { getIDRE } from '../../common/regular-expressions'
import { filetypes as FILETYPES } from '../../common/data.json'
import { MDFileDescriptor } from '../modules/fsal/types'

export default class FilePathFind extends ZettlrCommand {
    constructor(app: any) {
        super(app, ['file-path-find'])
    }

    /**
      * Removes a file.
      * @param {String} evt The event name
      * @param  {Object} arg the parameters of the file to be deleted
      * @return {Boolean} Whether the file was successfully deleted.
      */
    async run(evt: string, arg: any): Promise<String> {

        // Initialise the file as the result of findExact failing
        let file = undefined
        // Search each type of file
        for (let type of FILETYPES) {
            file = this._app.getFileSystem().findExact((arg as string) + type, 'name')
            if (file !== undefined) {
                // If we find it, then return it
                return file.path
            }
        }
        // We can't find it, so return Not Found
        return "Not Found"
    }
}

module.exports = FilePathFind
