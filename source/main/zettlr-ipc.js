/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrIPC class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This class is basically the postmaster of the app.
 *
 * END HEADER
 */

const {trans} = require('../common/lang/i18n.js');

/**
 * ZettlrIPC, controlling communication with the renderer.
 */
class ZettlrIPC
{
    /**
     * Create the ipc
     * @param {Zettlr} zettlrObj The application main object
     */
    constructor(zettlrObj)
    {
        this.parent = zettlrObj;
        this.ipc = require('electron').ipcMain;

        // Provide the ipc with a reference of this object.
        this.ipc.parent = this;
        this.ipc.on('message', this.dispatch);
    }

    /**
     * This function gets called every time the renderer sends a message.
     * @param  {IPCEvent} event The event (never used)
     * @param  {Object} arg   The message's body
     * @return {void}       Does not return anything.
     */
    dispatch(event, arg)
    {
        // handleEvent expects arg to contain at least 'command' and 'content'
        // properties
        if(!arg.hasOwnProperty('command')) {
            console.error(trans('system.no_command'), arg);
            return;
        }
        if(!arg.hasOwnProperty('content')) {
            arg.content = {};
        }
        this.parent.parent.handleEvent(event, arg);
    }

    /**
     * This sends a message to the current window's renderer process.
     * @param  {String} command The command to be sent
     * @param  {Mixed} content Can be either simply a string or a whole object
     * @return {ZettlrIPC}         This for chainability.
     */
    send(command, content)
    {
        // sender = this.parent.getWindow().getWindow().webContents;
        let sender = this.parent.window.getWindow().webContents;
        sender.send('message', {
            'command': command,
            'content': content
        });

        return this;
    }
}

module.exports = ZettlrIPC;
