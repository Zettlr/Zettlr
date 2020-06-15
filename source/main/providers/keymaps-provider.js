const path = require('path')
const EventEmitter = require('events')
const { app } = require('electron')
const fs = require('fs')

class KeymapsProvider extends EventEmitter {

    constructor() {
        super()
        this.keymapsPath = app.getPath('userData')
        this.keymapsFile = path.join(this.keymapsPath, 'keymaps.json')

        let homeEndBehaviour = global.config.get('editor.homeEndBehaviour')
        // This map needs to be function -> Keymap because we can not know in advance the keys the user wants to use
        // but we can define a set of function that can be mapped
        this.keymapsTpl = {}
        // Crossplatform shortcuts
        this.keymapsTpl['newlineAndIndentContinueMarkdownList'] = 'Enter'
        this.keymapsTpl['autoIndentMarkdownList'] = 'Tab'
        this.keymapsTpl['autoUnindentMarkdownList'] = 'Shift-Tab'
        this.keymapsTpl['CodeMirrorInsertMiddleLineBelow'] = 'Ctrl-Enter'
        this.keymapsTpl['CodeMirrorInsertMiddleLineAbove'] = 'Shift-Ctrl-Enter'
        this.keymapsTpl['sapLineUp'] = 'Alt-Up'
        this.keymapsTpl['swapLineDown'] = 'Alt-Down'

        if (process.platform === 'darwin') {
            /* TODO: Have a list of functionnalities to disable
            this.keymapsTpl['Cmd-F'] = 'False' // Disable the internal search
            this.keymapsTpl['Alt-B'] = 'False'// Disable word-backwarding on macOS (handled by Alt+ArrowLeft)
            this.keymapsTpl['Alt-F'] = 'False' // Disable word-forwarding on macOS (handled by Alt+ArrowRight)
             */
            this.keymapsTpl['editorPastAsPlain'] = 'Cmd-Shift-V'
            this.keymapsTpl['insertFootnote'] = 'Cmd-Alt-R'
            this.keymapsTpl['markdownMakeTaskList'] = 'Cmd-T'
            this.keymapsTpl['markdownComment'] = 'Shift-Cmd-C'
            this.keymapsTpl['markdownImage'] = 'Shift-Cmd-I'
            this.keymapsTpl['markDownLink'] = 'Cmd-K'
            this.keymapsTpl['markdownItalic'] = 'Cmd-I'
            this.keymapsTpl['markdownBold'] = 'Cmd-B'
        } else {
            // TODO: see above
            //this.keymapsTpl['Ctrl-F'] = 'False' // Disable the internal search
            // In this case we must also disable the other? Or is it by default?
            if (homeEndBehaviour) {
                this.keymapsTpl['goLineStart'] = 'Home'
                this.keymapsTpl['goLineEnd'] = 'End'
            } else {
                this.keymapsTpl['goLineLeftSmart'] = 'Home'
                this.keymapsTpl['goLineRight'] = 'End'
            }
            this.keymapsTpl['editorPastAsPlain'] = 'Ctrl-Shift-V'
            this.keymapsTpl['insertFootnote'] = 'Ctrl-Alt-F'
            this.keymapsTpl['markdownMakeTaskList'] = 'Ctrl-T'
            this.keymapsTpl['markdownComment'] = 'Shift-Ctrl-C'
            this.keymapsTpl['markdownImage'] = 'Shift-Ctrl-I'
            this.keymapsTpl['markDownLink'] = 'Ctrl-K'
            this.keymapsTpl['markdownItalic'] = 'Ctrl-I'
            this.keymapsTpl['markdownBold'] = 'Ctrl-B'
        }

        this.load()

        // TODO: check the keymaps. Defining a file with all the possible function/keymaps?

        global.keymaps = {
            get: (fun) => {
                return JSON.parse(JSON.stringify(this.get(fun)))
            },
            bulkSet: (ks) => {
                for (let k in ks) {
                    this.set(k, ks[k])
                }
                this.save()
            }
        }
    }

    set (fun, key) {
        // TODO: Maybe change this to allow custom keymaps on day?
        if (this.keymaps.hasOwnProperty(fun)) {
            this.keymaps[fun] = key
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

    save () {
        fs.writeFileSync(this.keymapsFile, JSON.stringify(this.keymaps, {encoding: 'utf8'}))
        if (global.hasOwnProperty('ipc')) {
            global.ipc.send('keymaps-update', {})
        }
    }
}

module.exports = new KeymapsProvider()