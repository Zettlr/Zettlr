const ZettlrCommand = require('./zettlr-command')

class GetKeymaps extends ZettlrCommand {
    constructor(app) {
        super(app, 'get-keymaps');
    }

    run(evt, arg) {
        let toSend = global.keymaps.get()
        global.ipc.send('keymaps', toSend)
    }
}

module.exports = GetKeymaps