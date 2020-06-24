const ZettlrDialog = require('./zettlr-dialog')

class KeymapsDialog extends ZettlrDialog {
    constructor() {
        super()
        this._dialog = 'keymaps'
    }

    preInit (data) {
        data.global = Object.keys(data["global"]).map(function(fun) {
            return {"function": fun, "keys": data["global"][fun]}
        })

        data.menu = Object.keys(data["menu"]).map(function(fun) {
            return {"function": fun, "keys": data["menu"][fun]}
        })

        data.editor = Object.keys(data["editor"]).map(function(fun) {
            return {"function": fun, "keys": data["editor"][fun]}
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

    _isGlobalKeymapName(name) {
        return name.split('-')[0] === "globalKeymapsValue"
    }

    _isMenuKeymapName(name) {
        return name.split('-')[0] === 'menuKeymapsValue'
    }

    _isEditorKeymapName(name) {
        return name.split('-')[0] === 'editorKeymapsValue'
    }

    _getFunction(name) {
        return name.split('-')[1]
    }

    proceed (data) {

        let globalKeymaps = {}
        let globalKeymapsKeys = data.filter((e) => this._isGlobalKeymapName(e.name))
        for (let i = 0; i < globalKeymapsKeys.length; i++) {
            let binding = globalKeymapsKeys[i].value
            let fun = this._getFunction(globalKeymapsKeys[i].name)
            globalKeymaps[fun] = binding
        }

        let menuKeymaps = {}
        let menuKeymapsKeys = data.filter((e) => this._isMenuKeymapName(e.name))
        for (let i = 0; i < menuKeymapsKeys.length; i++) {
            let binding = menuKeymapsKeys[i].value
            let fun = this._getFunction(menuKeymapsKeys[i].name)
            menuKeymaps[fun] = binding
        }

        let editorKeymaps = {}
        let editorKeymapsKeys = data.filter((e) => this._isEditorKeymapName(e.name))
        for (let i = 0; i < editorKeymaps.length; i++) {
            let binding = editorKeymapsKeys[i].value
            let fun = this._getFunction(editorKeymapsKeys[i].name)
            editorKeymaps[fun] = binding
        }

        let keymaps = {
            "menu": menuKeymaps,
            "editor": editorKeymaps,
            "global": globalKeymaps
        }

        global.ipc.send('update-keymaps', keymaps)
        this.close()
    }
}

module.exports = KeymapsDialog