const path = require('path')
const EventEmitter = require('events')
const { app } = require('electron')
const fs = require('fs')

class KeymapsProvider extends EventEmitter {
  // TODO: Some bindings seems to need delimiter - (e.g. CodeMirror) and other + (e.g. ?)
  // See if we can make this uniform in some way
  _createCmdKeymaps (delimiter, ...keys) {
    let leaderKey = process.platform === 'darwin' ? 'Cmd' : 'Ctrl'
    return leaderKey + delimiter + keys.join(delimiter)
  }

  generateKeymapsTemplate () {
    this.keymapsTpl = {
      'menu': {
        'file-new': this._createCmdKeymaps('+', 'N'),
        'dir-new': this._createCmdKeymaps('+', 'Shift', 'N'),
        'dir-open': this._createCmdKeymaps('+', 'O'),
        'file-save': this._createCmdKeymaps('+', 'S'),
        'export': this._createCmdKeymaps('+', 'E'),
        'print': this._createCmdKeymaps('+', 'P'),
        'file-rename': this._createCmdKeymaps('+', 'R'),
        'dir-rename': this._createCmdKeymaps('+', 'Shift', 'R'),
        'file-delete': process.platform === 'darwin' ? this._createCmdKeymaps('+', 'BackSpace') : 'Delete',
        'dir-delete': process.platform === 'darwin' ? this._createCmdKeymaps('+', 'Shift', 'Backspace') : 'Ctrl+Delete',
        'copy-as-html': this._createCmdKeymaps('+', 'Alt', 'C'),
        'paste-as-plain': this._createCmdKeymaps('+', 'Shift', 'V'),
        'file-find': this._createCmdKeymaps('+', 'F'),
        'dir-find': this._createCmdKeymaps('+', 'Shift', 'F'),
        'insert-id': this._createCmdKeymaps('+', 'L'),
        'copy-current-id': this._createCmdKeymaps('+', 'Shift', 'L'),
        'toggle-theme': this._createCmdKeymaps('+', 'Alt', 'L'),
        'toggle-file-meta': this._createCmdKeymaps('+', 'Alt', 'S'),
        'toggle-distraction-free': this._createCmdKeymaps('+', 'J'),
        'toggle-sidebar': this._createCmdKeymaps('+', '!'),
        'toggle-attachments': this._createCmdKeymaps('+', '?'),
        'zoom-reset': this._createCmdKeymaps('+', 'O'),
        'zoom-in': this._createCmdKeymaps('+', 'Plus'),
        'zoom-out': this._createCmdKeymaps('+', '-'),
        'win_minimize': this._createCmdKeymaps('+', 'M'),
        'win_close': this._createCmdKeymaps('+', 'Shift', 'W'),
        'attempt-close-tab': this._createCmdKeymaps('+', 'W'),
        'select-previous-tab': this._createCmdKeymaps('+', 'Shift', 'Tab'),
        'select-next-tab': this._createCmdKeymaps('+', 'Tab'),
        'docs': 'F1',
        'open-preferences': this._createCmdKeymaps('+', ', '),
        'open-pdf-preferences': this._createCmdKeymaps('+', 'Alt', ', '),
        'minimize': this._createCmdKeymaps('+', 'M'),
        'close': this._createCmdKeymaps('+', 'Shift', 'W')
      },
      'editor': {
        'new_line': 'Enter',
        'auto_indent': 'Tab',
        'auto_unindent': 'Shift-Tab',
        'insert_below': this._createCmdKeymaps('-', 'Enter'),
        'insert_above': 'Shift-' + this._createCmdKeymaps('-', 'Enter'),
        'swap_line_up': 'Alt-Up',
        'swap_line_down': 'Alt-Down',
        'past_as_plain': this._createCmdKeymaps('-', 'Shift', 'V'),
        'insertFootnote': this._createCmdKeymaps('-', 'Alt', 'R'),
        'markdownMakeTaskList': this._createCmdKeymaps('-', 'T'),
        // Todo: Is Shift-Ctrl-I == Ctrl-Shift-I ?
        'markdownComment': 'Shift-' + this._createCmdKeymaps('-', 'C'),
        'markdownImage': 'Shift-' + this._createCmdKeymaps('-', 'I'),
        'markdownItalic': this._createCmdKeymaps('-', 'I'),
        'markdownBold': this._createCmdKeymaps('-', 'B'),
        'open_link': this._createCmdKeymaps('-', 'Click'),
        'create_link': this._createCmdKeymaps('-', 'K'),
        'zoom': this._createCmdKeymaps('-', 'Scroll'),
        'cut': this._createCmdKeymaps('-', 'X'),
        'copy': this._createCmdKeymaps('-', 'C'),
        'paste': this._createCmdKeymaps('-', 'V'),
        'selectAll': this._createCmdKeymaps('-', 'A')
      },
      'global': {
        'focus_editor': this._createCmdKeymaps('+', 'Shift', 'e'),
        'focus_sidebar': this._createCmdKeymaps('+', 'Shift', 't'),
        'exit': this._createCmdKeymaps('+', 'Q')
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

  constructor () {
    super()
    this.generateKeymapsTemplate()
    this.keymapsPath = app.getPath('userData')
    this.keymapsFile = path.join(this.keymapsPath, 'keymaps.json')

    this.save()
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
      on: (evt, callback) => { this.on(evt, callback) }
    }
  }

  set (fun, key) {
    if (this.keymaps.hasOwnProperty(fun)) {
      this.keymaps[fun] = key
      this.update()
      return true
    }
    console.log('Failed to set key ' + key + ' for function ' + fun)
    return false
  }

  get (fun) {
    let kmps = this.getKeymaps()
    if (!fun) {
      return kmps
    }
    // Since the dictionnary of keymaps is define in a two-level dict we need to find the value
    // of the function in the sub-dictionnary.
    // If more than one level -> recursive search? What about the perf?
    for (const key of Object.keys(kmps)) {
      const dict = kmps[key]
      if (fun in dict) {
        return dict[fun]
      }
    }
    return null
  }

  getKeymaps () {
    return this.keymaps
  }

  load () {
    this.keymaps = this.keymapsTpl
    try {
      fs.lstatSync(this.keymapsFile)
      this.keymaps = JSON.parse(fs.readFileSync(this.keymapsFile, { encoding: 'utf8' }))
    } catch (e) {
      fs.writeFileSync(this.keymapsFile, JSON.stringify(this.keymapsTpl), { encoding: 'utf8' })
    }
    this.update()
  }

  save () {
    fs.writeFileSync(this.keymapsFile, JSON.stringify(this.keymaps, { encoding: 'utf8' }))
    if (global.hasOwnProperty('ipc')) {
      global.ipc.send('keymaps-update', {})
    }
    this.update()
  }

  update () {
    this.emit('update')
  }
}

module.exports = new KeymapsProvider()
