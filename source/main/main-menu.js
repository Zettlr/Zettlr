// Main menu file

const {Menu} = require('electron');
const electron = require('electron');
const app = electron.app

const template = [
    {
        label: 'File',
        submenu: [
            {
                label: 'New File…',
                accelerator: 'CmdOrCtrl+N',
                click (item, focusedWindow) {
                    // Trigger new file in current directory
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'new-file'});
                }
            },
            {
                label: 'New Folder…',
                accelerator: 'CmdOrCtrl+Shift+N',
                click (item, focusedWindow) {
                    // Trigger new folder in current directory
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'new-dir'});
                }
            },
            { type: 'separator' },
            {
                label: 'Open…',
                accelerator: 'CmdOrCtrl+O',
                click (item, focusedWindow) {
                    // Trigger open folder action
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'open-dir'});
                }
            },
            {
                label: 'Save',
                accelerator: 'CmdOrCtrl+S',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'save-file'});
                }
            },
            { type: 'separator' },
            {
                label: 'Export…',
                accelerator: 'CmdOrCtrl+E',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'export'});
                }
            },
            { type: 'separator' },
            {
                label: 'Rename file…',
                accelerator: 'CmdOrCtrl+R',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'rename-file'});
                }
            },
            {
                label: 'Rename directory…',
                accelerator: 'CmdOrCtrl+Shift+R',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'rename-dir'});
                }
            },
            { type: 'separator' },
            {
                label: 'Delete current file',
                accelerator: 'CmdOrCtrl+D',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'remove-file'});
                }
            }, {
                label: 'Delete current directory',
                accelerator: 'CmdOrCtrl+Shift+D',
                click(item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'remove-dir'});
                }
            }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectall' },
            { type: 'separator' },
            {
                label: 'Find in file…',
                accelerator: 'CmdOrCtrl+F',
                click(item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'find-file'});
                }
            },
            {
                label: 'Find in directory…',
                accelerator: 'CmdOrCtrl+Shift+F',
                click(item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'find-dir'});
                }
            }
        ]
    },
    {
        label: 'View',
        submenu: [
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+Y',
                click (item, focusedWindow) {
                    if (focusedWindow) focusedWindow.reload();
                }
            },
            {
                label: 'Toggle Developer Tools',
                accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                click (item, focusedWindow) {
                    if (focusedWindow) focusedWindow.webContents.toggleDevTools();
                }
            },
            { type: 'separator' },
            {
                label: 'Toggle light and dark theme',
                accelerator: 'CmdOrCtrl+Alt+L',
                click(item, focusedWindow) {
                    if (focusedWindow) focusedWindow.webContents.send('message', { 'command': 'toggle-theme'});
                }
            },
            {
                label: 'Toggle text snippets',
                accelerator: 'CmdOrCtrl+Alt+S',
                click(item, focusedWindow) {
                    if (focusedWindow) focusedWindow.webContents.send('message', { 'command': 'toggle-snippets'});
                }
            },
            { type: 'separator' },
            { role: 'resetzoom' },
            { role: 'zoomin' },
            { role: 'zoomout' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    },
    {
        role: 'window',
        submenu: [
            { role: 'minimize' },
            { role: 'close' }
        ]
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Learn More',
                click () { require('electron').shell.openExternal('https://www.zettlr.com/') }
            }
        ]
    }
]

if(process.platform != 'darwin') {
    // On windows and linux add a quit option.
    // On macOS this is automatically added to the "name"-submenu, which will
    // be added in the next step.
    template[0].submenu.push({
        type: 'separator',
    },{
        label: 'Preferences',
        accelerator: 'CmdOrCtrl+,',
        click (item, focusedWindow) {
            if(focusedWindow) focusedWindow.webContents.send('message', {'command': 'open-preferences'});
        }
    },
    { type: 'separator' },
    { role: 'quit' });
}

if (process.platform === 'darwin') {
    const name = app.getName();
    template.unshift({
        label: name, // This will be only set on macOS if dedicated binary
        submenu: [
            { role: 'about' },
            {
                label: 'Preferences',
                accelerator: 'CmdOrCtrl+,',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', {'command': 'open-preferences'});
                }
            },
            { type: 'separator' },
            { role: 'services', submenu: [] },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideothers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
        ]
    });
    // Edit menu.
    template[2].submenu.push(
        { type: 'separator' },
        {
            label: 'Speech',
            submenu: [
                { role: 'startspeaking' },
                { role: 'stopspeaking' }
            ]
        }
    )
    // Window menu.
    template[4].submenu = [
        {
            label: 'Close',
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
        },
        {
            label: 'Minimize',
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize'
        },
        { label: 'Zoom', role: 'zoom' },
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' }
    ]
}

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
