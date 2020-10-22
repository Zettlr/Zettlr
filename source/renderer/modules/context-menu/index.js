module.exports = function popup (event) {
  // Will be returned, if true, selects word under cursor
  let shouldSelectWordUnderCursor = true

  let elem = event.target
  // No context menu for sorters (we cannot check for class "sorter" as the sorter
  // overlays the full directory)
  if (elem.classList.contains('sortType')) return false

  let hash = null
  let typoPrefix = []
  let scopes = [] // Used to hold the scopes
  let attr = [] // Used to hold the attributes
  let template // Path to the template file to use.

  // If the user has right-clicked a link, select the link contents to make it
  // look better and give visual feedback that the user is indeed about to copy
  // the whole link into the clipboard, not a part of it.
  if (elem.classList.contains('cma')) {
    shouldSelectWordUnderCursor = false // Don't select the word under cursor
    let selection = window.getSelection()
    let range = document.createRange()
    range.selectNodeContents(elem[0])
    selection.removeAllRanges()
    selection.addRange(range)
  }

  // Don't select the word under cursor if we've right-clicked a citation
  if (elem.hasClass('citeproc-citation')) {
    shouldSelectWordUnderCursor = false
    // Also, remove the selected part of the citation
    let selection = window.getSelection()
    selection.removeAllRanges()
  }

  // First: determine where the click happened (file manager or editor)
  if (elem.parents('#file-manager').length > 0) {
    shouldSelectWordUnderCursor = false // Don't select when right-clicking the file manager
    // Here's what the options of elements the user might click are:
    //
    // 1. The surrounding .container
    // 2. The .list-item, which is what we want
    // 3. The .filename
    // 4. The .taglist (or a descendant)
    // 5. The .meta (or a descendant)
    //
    // So the following works:
    if (elem.hasClass('container')) elem = elem.children('list-item').first()
    if (elem.hasClass('filename') || elem.hasClass('meta') || elem.hasClass('taglist') || elem.hasClass('sorter')) {
      elem = elem.parent() // Move up 1 level
    } else if (elem.is('span') || elem.hasClass('tagspacer') || elem.hasClass('collapse-indicator')) {
      elem = elem.parent().parent() // Move up 2 levels
    } else if (elem.hasClass('tag')) {
      elem = elem.parent().parent().parent() // Move up 3 levels
    }

    // Determine whether this is a dir or a file
    if (elem.hasClass('file') || elem.hasClass('alias')) template = TEMPLATES.file
    if (elem.hasClass('directory') || elem.hasClass('dead-directory') || elem.attr('id') === 'file-list') template = TEMPLATES.directory

    // Determine the scopes
    if (elem.hasClass('project')) {
      scopes.push('project')
    } else if (elem.hasClass('directory')) {
      scopes.push('no-project')
    }

    // Directory-scope can also be reached by right-clicking empty space in the file list or a directory
    if (elem.hasClass('directory') || elem.attr('id') === 'file-list') scopes.push('directory')
    if (elem.hasClass('dead-directory')) scopes.push('dead-directory')
    if (elem.hasClass('alias')) scopes.push('alias')
    if (elem.hasClass('root')) scopes.push('root')

    hash = elem.attr('data-hash')
    // Push all attributes into the attributes array
    for (let i = 0, nodes = elem[0].attributes; i < elem[0].attributes.length; i++) {
      if (!nodes.item(i).nodeValue) continue // Don't include empty attributes
      // The attributes are a NamedNodeMap, so we have to use weird function calling to retrieve them
      attr.push({ 'name': nodes.item(i).nodeName, 'value': nodes.item(i).nodeValue })
    }
  } else if (elem.parents('.CodeMirror').length > 0) {
    // TODO
    contextEditor(event)
  } else if (elem.is('input[type="text"]') || elem.is('textarea')) {
    shouldSelectWordUnderCursor = false // Don't select when right-clicking a text field
    template = TEMPLATES.text
  } else if (elem.parents('#document-tabs').length > 0) {
    // We can have:
    // 1. A close-icon
    // 2. The file name
    // 3. The document itself
    if (elem.hasClass('filename') || elem.hasClass('close')) elem = elem.parent()
    template = TEMPLATES.tabs
    shouldSelectWordUnderCursor = false
    hash = elem.attr('data-hash')
    if (elem.attr('data-id')) attr.push({ 'data-id': elem.attr('data-id') })
  }

  // Now build with all information we have gathered.

  let menu = this._buildFromSource(template, hash, scopes, attr)
  if (elem.hasClass('cm-spell-error')) menu = typoPrefix.concat(menu)

  // If the element is a link, add an "open link" context menu entry
  if (elem.hasClass('cma')) {
    let url = elem.attr('title')
    menu.unshift({
      'label': trans('menu.open_link'),
      'click': (item, win) => {
        require('electron').shell.openExternal(url)
      }
    }, {
      // It's either "Copy Link" or "Copy Mail"
      'label': (url.indexOf('mailto:') === 0) ? trans('menu.copy_mail') : trans('menu.copy_link'),
      'click': (item, win) => {
        let toCopy = (url.indexOf('mailto:') === 0) ? url.substr(7) : url
        require('electron').clipboard.writeText(toCopy)
      }
    }, {
      'type': 'separator'
    })
  }
  return {
    shouldSelectWordUnderCursor,
    menu
  }
}
