// This manages the IPC events for the main process
function ZettlrIPC(zettlrObj) {

    // Parent object
    this.parent = zettlrObj;
    this.ipc = require('electron').ipcMain;

    // METHODS
    this.init;                  // Initializes the receiver
    this.send;                  // Sends a message to the renderer process
    this.dispatch;              // Dispatches an event to the parent object.

    this.init = function() {
        // Provide the ipc with a reference of this object.
        this.ipc.parent = this;
        this.ipc.on('message', this.dispatch);
    };

    this.dispatch = function(event, arg) {
        // console.log(arg);
        this.parent.parent.handleEvent(event, arg);
    };

    // This sends a message to the current window's renderer process.
    this.send = function(command, content) {
        // sender = this.parent.getWindow().getWindow().webContents;
        sender = this.parent.window.getWindow().webContents;
        sender.send('message', {
            'command': command,
            'content': content
        });
    };
}

module.exports = ZettlrIPC;
