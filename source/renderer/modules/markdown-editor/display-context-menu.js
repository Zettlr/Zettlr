// Displays a context menu for the MarkdownEditor class
const { trans } = require('../../../common/lang/i18n')
const { clipboard } = require('electron')

var currentMenu = []
var currentSuggestions = []
var linkToCopy = null

const TEMPLATE = [
  {
    label: 'menu.bold',
    accelerator: 'CmdOrCtrl+B',
    command: 'markdownBold'
  },
  {
    label: 'menu.italic',
    accelerator: 'CmdOrCtrl+I',
    command: 'markdownItalic'
  },
  {
    type: 'separator'
  },
  {
    label: 'menu.insert_link',
    accelerator: 'CmdOrCtrl+K',
    command: 'markdownLink'
  },
  {
    label: 'menu.insert_ol',
    command: 'markdownMakeOrderedList'
  },
  {
    label: 'menu.insert_ul',
    command: 'markdownMakeUnorderedList'
  },
  {
    label: 'menu.insert_tasklist',
    accelerator: 'CmdOrCtrl+T',
    command: 'markdownMakeTaskList'
  },
  {
    label: 'gui.formatting.blockquote',
    command: 'markdownBlockquote'
  },
  {
    label: 'gui.formatting.insert_table',
    command: 'markdownInsertTable'
  },
  {
    type: 'separator'
  },
  {
    label: 'menu.cut',
    accelerator: 'CmdOrCtrl+X',
    command: 'cut'
  },
  {
    label: 'menu.copy',
    accelerator: 'CmdOrCtrl+C',
    command: 'copy'
  },
  {
    label: 'menu.copy_html',
    accelerator: 'CmdOrCtrl+Alt+C',
    command: 'copyAsHTML'
  },
  {
    label: 'menu.paste',
    accelerator: 'CmdOrCtrl+V',
    command: 'paste'
  },
  {
    label: 'menu.paste_plain',
    accelerator: 'CmdOrCtrl+Shift+V',
    command: 'pasteAsPlain'
  },
  {
    type: 'separator'
  },
  {
    label: 'menu.select_all',
    accelerator: 'CmdOrCtrl+A',
    command: 'selectAll'
  }
]

// Contains a list of all labels that should be disabled
// in readonly mode of the editor
const readOnlyDisabled = [
  'menu.bold',
  'menu.italic',
  'menu.insert_link',
  'menu.insert_ol',
  'menu.insert_ul',
  'menu.insert_tasklist',
  'gui.formatting.blockquote',
  'gui.formatting.insert_table',
  'menu.cut',
  'menu.paste',
  'menu.paste_plain'
]

module.exports = function displayContextMenu (event, isReadOnly, commandCallback, replaceCallback) {
  const elem = event.target
  let buildMenu = []
  let shouldSelectWordUnderCursor = true

  // First build the context menu
  for (const item of TEMPLATE) {
    let buildItem = {}
    if (item.hasOwnProperty('label')) {
      buildItem.id = item.label
      buildItem.label = trans(item.label)
    }

    if (item.hasOwnProperty('type')) {
      buildItem.type = item.type
    } else {
      buildItem.type = 'normal'
    }

    if (item.hasOwnProperty('accelerator')) {
      buildItem.accelerator = item.accelerator
    }

    if (item.command !== undefined) {
      buildItem.command = item.command
    }

    if (isReadOnly && readOnlyDisabled.includes(item.label)) {
      buildItem.enabled = false
    } else {
      buildItem.enabled = true
    }

    buildMenu.push(buildItem)
  }

  // If the user has right-clicked a link, select the link contents to make it
  // look better and give visual feedback that the user is indeed about to copy
  // the whole link into the clipboard, not a part of it.
  if (elem.classList.contains('cma')) {
    shouldSelectWordUnderCursor = false
    let selection = window.getSelection()
    let range = document.createRange()
    range.selectNodeContents(elem)
    selection.removeAllRanges()
    selection.addRange(range)

    let url = elem.getAttribute('title')
    linkToCopy = (url.indexOf('mailto:') === 0) ? url.substr(7) : url
    buildMenu.unshift({
      id: 'menu.open_link',
      label: trans('menu.open_link'),
      enabled: true,
      type: 'normal'
    }, {
      // It's either "Copy Link" or "Copy Mail"
      id: 'menu.copy_link',
      enabled: true,
      type: 'normal',
      label: (url.indexOf('mailto:') === 0) ? trans('menu.copy_mail') : trans('menu.copy_link')
    }, {
      type: 'separator'
    })
  }

  // Don't select the word under cursor if we've right-clicked a citation
  if (elem.classList.contains('citeproc-citation')) {
    shouldSelectWordUnderCursor = false
    // Also, remove the selected part of the citation
    let selection = window.getSelection()
    selection.removeAllRanges()

    let keys = elem.dataset.citekeys.split(',')
    // Add menu items for all cite keys to open the corresponding PDFs
    buildMenu.push({ type: 'separator' })
    buildMenu.push({
      label: trans('menu.open_attachment'),
      type: 'submenu',
      enabled: true,
      submenu: keys.map(key => {
        return {
          id: `citekey-${key}`,
          label: key,
          enabled: true
        }
      })
    })
  }

  // If the word is spelled wrong, request suggestions
  let typoPrefix = []
  if (elem.classList.contains('cm-spell-error')) {
    currentSuggestions = global.typo.suggest(elem.textContent)
    if (currentSuggestions.length > 0) {
      for (let i = 0; i < currentSuggestions.length; i++) {
        typoPrefix.push({
          id: `acceptSuggestion-${i}`,
          type: 'normal',
          enabled: true,
          label: currentSuggestions[i]
        })
      }
    } else {
      typoPrefix.push({
        label: trans('menu.no_suggestions'),
        enabled: false
      })
    }

    // TODO: Re-implement
    // typoPrefix.push({ type: 'separator' })
    // Always add an option to add a word to the user dictionary
    // typoPrefix.push({
    //   label: trans('menu.add_to_dictionary') // ,
    //   // 'click': (item, win) => {
    //   //   // elem.text() contains the misspelled word
    //   //   ipc.sendSync('typo', {
    //   //     type: 'add',
    //   //     'term': elem.text()
    //   //   })
    //   // }
    // })
    // Final separator
    typoPrefix.push({ type: 'separator' })

    buildMenu = typoPrefix.concat(buildMenu)
  }

  currentMenu = buildMenu

  // Now we can display the menu
  const point = { x: event.clientX, y: event.clientY }
  global.menuProvider.show(point, buildMenu, (clickedID) => {
    if (clickedID.startsWith('acceptSuggestion-')) {
      const idx = parseInt(clickedID.substr(17), 10) // Retrieve the ID
      console.log('Replacing with ' + currentSuggestions[idx])
      replaceCallback(currentSuggestions[idx])
      return
    }

    if (clickedID.startsWith('citekey-')) {
      global.ipc.send('open-attachment', { 'citekey': clickedID.substr(8) })
      return
    }

    let found = currentMenu.find((elem) => {
      return elem.id === clickedID
    })

    if (found !== undefined) {
      if (found.id === 'menu.copy_link') {
        // Write the extracted link to the clipboard
        clipboard.writeText(linkToCopy)
      } else {
        // Standard command
        commandCallback(found.command)
      }
    }
  })

  // Return the callback and whether the word under cursor should be selected
  return shouldSelectWordUnderCursor
}
