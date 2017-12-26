// MAIN ENTRY POINT FOR ELECTRON APPLICATION //

// First require the complete electron environment and put it into var
const electron = require('electron');

// Module to control application life.
const app = electron.app;
const process = require('process');

// Include the global Zettlr class
const Zettlr = require('./main/zettlr.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
// (Which actually would be funny — if only for developers)
let zettlr;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
    // First create a new zettlr-object. This will be kept in memory until the
    // app is closed.
    zettlr = new Zettlr(this);

    // Initialize the app. It will take care of opening windows, reading files
    // etc. etc.
    zettlr.init();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        // Save config before exit.
        zettlr.shutdown();
        app.quit();
    }
});

app.on('will-quit', function() {
    // Necessary for macOS, because otherwise config won't be saved
    // Save config before exit.
    zettlr.shutdown();
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    zettlr.openWindow();
});

process.on('unhandledRejection', (err) => {
    // Just log to console.
    console.log('Received an unhandled rejection: ' + err.message);
});
