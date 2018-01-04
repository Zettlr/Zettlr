/* RENDERER COMMUNICATIONS */

class ZettlrRendererIPC
{
    constructor(parent)
    {
        this.parent = parent;
        this.ipc = require("electron").ipcRenderer;
        this.ipc.parent = this;
        this.ipc.on('message', this.dispatch);
    }

    // Dispatch a command to the parent
    dispatch(event, arg)
    {
        // handleEvent expects arg to contain at least 'command' and 'content'
        // properties
        if(!arg.hasOwnProperty('command')) {
            console.error('Received a message with no command!', arg);
            return;
        }
        if(!arg.hasOwnProperty('content')) {
            arg.content = {};
        }
        this.parent.parent.handleEvent(event, arg);
    }

    // Wrapper for ipc send
    send(command, arg)
    {
        this.ipc.send('message', {
            'command': command,
            'content': arg
        });
    }
}

module.exports = ZettlrRendererIPC;
