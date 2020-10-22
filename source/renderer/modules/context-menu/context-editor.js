const { trans } = require('../../../common/lang/i18n')

const TEMPLATE = [
  {
    label: 'menu.bold',
    accelerator: 'CmdOrCtrl+B',
    command: 'cm-command',
    content: 'markdownBold'
  },
  {
    label: 'menu.italic',
    accelerator: 'CmdOrCtrl+I',
    command: 'cm-command',
    content: 'markdownItalic'
  },
  {
    type: 'separator'
  },
  {
    label: 'menu.insert_link',
    accelerator: 'CmdOrCtrl+K',
    command: 'cm-command',
    content: 'markdownLink'
  },
  {
    label: 'menu.insert_ol',
    command: 'cm-command',
    content: 'markdownMakeOrderedList'
  },
  {
    label: 'menu.insert_ul',
    command: 'cm-command',
    content: 'markdownMakeUnorderedList'
  },
  {
    label: 'menu.insert_tasklist',
    accelerator: 'CmdOrCtrl+T',
    command: 'cm-command',
    content: 'markdownMakeTaskList'
  },
  {
    label: 'gui.formatting.blockquote',
    command: 'cm-command',
    content: 'markdownBlockquote'
  },
  {
    label: 'gui.formatting.insert_table',
    command: 'cm-command',
    content: 'markdownInsertTable'
  },
  {
    type: 'separator'
  },
  {
    label: 'menu.cut',
    accelerator: 'CmdOrCtrl+X',
    role: 'cut'
  },
  {
    label: 'menu.copy',
    accelerator: 'CmdOrCtrl+C',
    role: 'copy'
  },
  {
    label: 'menu.copy_html',
    accelerator: 'CmdOrCtrl+Alt+C',
    command: 'copy-as-html'
  },
  {
    label: 'menu.paste',
    accelerator: 'CmdOrCtrl+V',
    role: 'paste'
  },
  {
    label: 'menu.paste_plain',
    accelerator: 'CmdOrCtrl+Shift+V',
    command: 'paste-as-plain'
  },
  {
    type: 'separator'
  },
  {
    label: 'menu.select_all',
    accelerator: 'CmdOrCtrl+A',
    role: 'selectAll'
  }
]

module.exports = function contextEditor (event) {
  let template = TEMPLATE.slice(0) // Copy the template
  const elem = event.target

  // If the user has right-clicked a link, select the link contents to make it
  // look better and give visual feedback that the user is indeed about to copy
  // the whole link into the clipboard, not a part of it.
  if (elem.classList.contains('cma')) {
    shouldSelectWordUnderCursor = false // Don't select the word under cursor
    let selection = window.getSelection()
    let range = document.createRange()
    range.selectNodeContents(elem)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  // Don't select the word under cursor if we've right-clicked a citation
  if (elem.classList.contains('citeproc-citation')) {
    shouldSelectWordUnderCursor = false
    // Also, remove the selected part of the citation
    let selection = window.getSelection()
    selection.removeAllRanges()
  }

  // If the word is spelled wrong, request suggestions
  let typoPrefix = []
  if (elem.classList.contains('cm-spell-error')) {
    let suggestions = global.typo.suggest(elem.text())
    if (suggestions.length > 0) {
      for (let sug of suggestions) {
        typoPrefix.push({
          label: sug // ,
          // 'click': (item, win) => {
          //   // TODO this is ugly!
          //   this._body.getRenderer().getEditor().replaceWord(sug)
          // }
        })
      }
    } else {
      typoPrefix.push({
        label: trans('menu.no_suggestions'),
        enabled: false
      })
    }

    typoPrefix.push({ type: 'separator' })
    // Always add an option to add a word to the user dictionary
    typoPrefix.push({
      label: trans('menu.add_to_dictionary') // ,
      // 'click': (item, win) => {
      //   // elem.text() contains the misspelled word
      //   ipc.sendSync('typo', {
      //     type: 'add',
      //     'term': elem.text()
      //   })
      // }
    })
    // Final separator
    typoPrefix.push({ type: 'separator' })
  }

  // Now we can display the menu
}
