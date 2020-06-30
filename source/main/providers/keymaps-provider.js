const path = require('path')
const EventEmitter = require('events')
const { app } = require('electron')
const fs = require('fs')

class KeymapsProvider extends EventEmitter {

    _create_cmd_keymaps(...keys) {
        let leaderKey = process.platform === "darwin" ? "Cmd" : "Ctrl"
        return leaderKey + "+" + keys.join('+')
    }

    generateKeymapsTemplate () {
        this.keymapsTpl = {
            "menu": {
                "file-new": this._create_cmd_keymaps("N"),
                "dir-new": this._create_cmd_keymaps("Shift", "N"),
                "dir-open": this._create_cmd_keymaps("O"),
                "file-save": this._create_cmd_keymaps("S"),
                "export": this._create_cmd_keymaps("E"),
                "print": this._create_cmd_keymaps("P"),
                "file-rename": this._create_cmd_keymaps("R"),
                "dir-rename": this._create_cmd_keymaps("Shift", "R"),
                "file-delete": process.platform === 'darwin' ? this._create_cmd_keymaps("BackSpace") : "Delete",
                "dir-delete": process.platform === 'darwin' ? this._create_cmd_keymaps("Shift", "Backspace") : "Ctrl+Delete",
                "copy-as-html": this._create_cmd_keymaps("Alt", "C"),
                "paste-as-plain": this._create_cmd_keymaps("Shift" , "V"),
                "file-find": this._create_cmd_keymaps("F"),
                "dir-find": this._create_cmd_keymaps("Shift", "F"),
                "insert-id": this._create_cmd_keymaps("L"),
                "copy-current-id": this._create_cmd_keymaps("Shift", "L"),
                "toggle-theme": this._create_cmd_keymaps("Alt", "L"),
                "toggle-file-meta": this._create_cmd_keymaps("Alt", "S"),
                "toggle-distraction-free": this._create_cmd_keymaps("J"),
                "toggle-sidebar": this._create_cmd_keymaps("!"),
                "toggle-attachments": this._create_cmd_keymaps("?"),
                "zoom-reset": this._create_cmd_keymaps("O"),
                "zoom-in": this._create_cmd_keymaps("Plus"),
                "zoom-out": this._create_cmd_keymaps("-"),
                "win_minimize": this._create_cmd_keymaps("M"),
                "win_close": this._create_cmd_keymaps("Shift", "W"),
                "attempt-close-tab": this._create_cmd_keymaps("W"),
                "select-previous-tab": this._create_cmd_keymaps("Shift", "Tab"),
                "select-next-tab": this._create_cmd_keymaps("Tab"),
                "docs": "F1",
                "open-preferences": this._create_cmd_keymaps(","),
                "open-pdf-preferences": this._create_cmd_keymaps("Alt", ",")
            },
            "editor": {
                "new_line": "Enter",
                "auto_indent": "Tab",
                "auto_unindent": "Shift-Tab",
                "insert_below": this._create_cmd_keymaps("Enter"),
                "insert_above": "Shift-" + this._create_cmd_keymaps("Enter"),
                "swap_line_up": "Alt-Up",
                "swap_line_down": "Alt-Down",
                'past_as_plain': this._create_cmd_keymaps('Shift', 'V'),
                'insertFootnote': this._create_cmd_keymaps('Alt', 'R'),
                'markdownMakeTaskList': this._create_cmd_keymaps('T'),
                // Todo: Is Shift-Ctrl-I == Ctrl-Shift-I ?
                'markdownComment': 'Shift-' + this._create_cmd_keymaps('C'),
                'markdownImage': 'Shift-' + this._create_cmd_keymaps('I'),
                'markdownItalic': this._create_cmd_keymaps('I'),
                'markdownBold': this._create_cmd_keymaps('B'),
                // For these last two, the last keys must be Click and Scroll. But it might be Ctrl-Shift-Click
                // instead of Ctrl-Click.
                'open_link': this._create_cmd_keymaps('Click'),
                'create_link': this._create_cmd_keymaps('K'),
                'zoom': this._create_cmd_keymaps('Scroll')
            },
            "global": {
                "focus_editor": this._create_cmd_keymaps('Shift', 'e'),
                "focus_sidebar": this._create_cmd_keymaps('Shift', 't'),
                "exit": this._create_cmd_keymaps('Q'),

            }
        }

        if (process.platform !== 'darwin') {
            if (global.config.get('editor.homeEndBehaviour')) {
                this.keymapsTpl['editor']['goLineStart'] = 'Home'
                this.keymapsTpl['editor']['goLineEnd'] = 'End'
            } else {
                this.keymapsTpl['editor']['goLineLeftSmart'] = 'Home'
                this.keymapsTpl['editor']['goLineRight'] = 'End'
            }
        }
    }


    constructor() {
        super()
        this.generateKeymapsTemplate()
        this.keymapsPath = app.getPath('userData')
        this.keymapsFile = path.join(this.keymapsPath, 'keymaps.json')

        this.load()

        global.keymaps = {
            get: (fun) => {
                return JSON.parse(JSON.stringify(this.get(fun)))
            },
            bulkSet: (ks) => {
                for (let k in ks) {
                    this.set(k, ks[k])
                }
                this.save()
            },
            on: (evt, callback) => { this.on(evt, callback)}
        }
    }

    set (fun, key) {
        // TODO: Maybe change this to allow custom keymaps on day?
        if (this.keymaps.hasOwnProperty(fun)) {
            this.keymaps[fun] = key
            this.update()
            return true
        }
        console.log("Failed to set key " + key + " for function " + fun)
        return false
    }

    get (fun) {
        if (!fun) {
            return this.getKeymaps()
        }
        if (this.keymaps.hasOwnProperty(fun)) {
            return this.keymaps[fun]
        } else {
            return null
        }
    }

    getKeymaps() {
        return this.keymaps
    }

    load () {
        this.keymaps = this.keymapsTpl
        try {
            fs.lstatSync(this.keymapsFile)
            this.keymaps = JSON.parse(fs.readFileSync(this.keymapsFile, {encoding: 'utf8'}))
        } catch (e) {
            fs.writeFileSync(this.keymapsFile, JSON.stringify(this.keymapsTpl), {encoding: 'utf8'})
        }
    }

    update() {
        this.emit('update')
    }

    save () {
        fs.writeFileSync(this.keymapsFile, JSON.stringify(this.keymaps, {encoding: 'utf8'}))
        if (global.hasOwnProperty('ipc')) {
            global.ipc.send('keymaps-update', {})
        }
        this.update()
    }
}

module.exports = new KeymapsProvider()