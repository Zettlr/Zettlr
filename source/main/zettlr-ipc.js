// This manages the IPC events for the main process

const {trans} = require('../common/lang/i18n.js');

class ZettlrIPC
{
    constructor(zettlrObj)
    {
        this.parent = zettlrObj;
        this.ipc = require('electron').ipcMain;

        // Provide the ipc with a reference of this object.
        this.ipc.parent = this;
        this.ipc.on('message', this.dispatch);
    }

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

    // This sends a message to the current window's renderer process.
    send(command, content)
    {
        // sender = this.parent.getWindow().getWindow().webContents;
        let sender = this.parent.window.getWindow().webContents;
        sender.send('message', {
            'command': command,
            'content': content
        });
    }
}

module.exports = ZettlrIPC;
