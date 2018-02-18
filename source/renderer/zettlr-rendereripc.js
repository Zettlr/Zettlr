/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrRendererIPC class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Handles communication with the main process.
 *
 * END HEADER
 */

const {trans} = require('../common/lang/i18n.js');

/**
 * ZettlrRendererIPC class
 */
class ZettlrRendererIPC
{
    /**
     * Initialize the communications Array
     * @param {ZettlrRenderer} parent The renderer object.
     */
    constructor(parent)
    {
        this.parent = parent;
        this.ipc = require("electron").ipcRenderer;
        this.ipc.parent = this;
        this.ipc.on('message', this.dispatch);
    }

    /**
     * Dispatch a command to the parent
     * @param  {Event} event Unused event paramenter
     * @param  {Object} arg   The message body
     * @return {void}       Nothing to return.
     */
    dispatch(event, arg)
    {
        // handleEvent expects arg to contain at least 'command' and 'content'
        // properties
        if(!arg.hasOwnProperty('command')) {
            console.error(trans('system.no_command', arg));
            return;
        }
        if(!arg.hasOwnProperty('content')) {
            arg.content = {};
        }
        this.parent.parent.handleEvent(event, arg);
    }

    /**
     * Wrapper for ipc send
     * @param  {String} command The command to send
     * @param  {Mixed} arg     Additional content for the command
     * @return {void}         Nothing to return.
     */
    send(command, arg)
    {
        this.ipc.send('message', {
            'command': command,
            'content': arg
        });
    }
}

module.exports = ZettlrRendererIPC;
