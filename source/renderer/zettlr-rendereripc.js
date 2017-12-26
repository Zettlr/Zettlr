/* RENDERER COMMUNICATIONS */

function ZettlrRendererIPC(parent)
{
    // Reference to ZettlrRenderer-object
    this.parent = parent;
    this.ipc = require("electron").ipcRenderer;

    // METHODS
    this.init;
    this.dispatch;
    this.send;

    this.init = function() {
        // Provide ipcRenderer with reference to this
        this.ipc.parent = this;
        this.ipc.on('message', this.dispatch);
    };

    // Dispatch a command to the parent
    this.dispatch = function(event, arg) { // TESTING
        // var nodeConsole = require('console');
        // var myConsole = new nodeConsole.Console(process.stdout, process.stderr);
        // myConsole.log('XXX RENDERER-IPC XXX', arg);
        this.parent.parent.handleEvent(event, arg);
    };

    // Wrapper for ipc send
    this.send = function(command, arg) {
        this.ipc.send('message', {
            'command': command,
            'content': arg
        });
    };
}

module.exports = ZettlrRendererIPC;
