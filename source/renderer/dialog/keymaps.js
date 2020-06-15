const ZettlrDialog = require('./zettlr-dialog')

class KeymapsDialog extends ZettlrDialog {
    constructor() {
        super()
        this._dialog = 'keymaps'
    }

    preInit (data) {
        data.keymaps = Object.keys(data).map(function(fun) {
            return {"function": fun, "keys": data[fun]}
        })
        return data
    }

    postAct () {
        let form = this._modal.find('form#dialog')
        form.on('submit', (e) => {
            e.preventDefault()
            this.proceed(form.serializeArray())
        })
    }

    proceed (data) {
        let keymaps = {}
        let functions = data.filter((e) => e.name === 'keymapsFunction[]')
        let keys = data.filter((e) => e.name === 'keymapsValue[]')
        for (let i = 0; i < keys.length; i++) {
            keymaps[functions[i].value] = keys[i].value
        }
        // TODO: Check the keymaps ?
        global.ipc.send('update-keymaps', keymaps)
        this.close()
    }
}

module.exports = KeymapsDialog