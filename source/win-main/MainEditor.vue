<template>
  <div
    ref="editor"
    class="main-editor-wrapper"
    v-bind:style="{ 'font-size': `${fontSize}px` }"
    v-bind:class="{
      'code-file': !isMarkdown,
      'fullscreen': distractionFree
    }"
    v-on:wheel="onEditorScroll($event)"
    v-on:mousedown="editorMousedown($event)"
    v-on:mouseup="editorMouseup($event)"
    v-on:mousemove="editorMousemove($event)"
    v-on:dragenter="handleDragEnter($event, 'editor')"
    v-on:dragleave="handleDragLeave($event)"
    v-on:drop="handleDrop($event, 'editor')"
  >
    <div v-show="showSearch" class="main-editor-search">
      <div class="row">
        <input
          ref="searchinput"
          v-model="query"
          type="text"
          v-bind:placeholder="findPlaceholder"
          v-bind:class="{'has-regex': regexpSearch }"
          v-on:keypress.enter.exact="searchNext()"
          v-on:keypress.shift.enter.exact="searchPrevious()"
          v-on:keydown.esc.exact="showSearch = false"
        >
        <button
          v-bind:title="regexLabel"
          v-bind:class="{ 'active': regexpSearch }"
          v-on:click="toggleQueryRegexp()"
        >
          <clr-icon shape="regexp"></clr-icon>
        </button>
        <button
          v-bind:title="closeLabel"
          v-on:click="showSearch = false"
        >
          <clr-icon shape="times"></clr-icon>
        </button>
      </div>
      <div class="row">
        <input
          v-model="replaceString"
          type="text"
          v-bind:placeholder="replacePlaceholder"
          v-bind:class="{'monospace': regexpSearch }"
          v-on:keypress.enter.exact="replaceNext()"
          v-on:keypress.shift.enter.exact="replacePrevious()"
          v-on:keypress.alt.enter.exact="replaceAll()"
          v-on:keydown.esc.exact="showSearch = false"
        >
        <button
          v-bind:title="replaceNextLabel"
          v-on:click="replaceNext()"
        >
          <clr-icon shape="two-way-arrows"></clr-icon>
        </button>
        <button
          v-bind:title="replaceAllLabel"
          v-on:click="replaceAll()"
        >
          <clr-icon shape="step-forward-2"></clr-icon>
        </button>
      </div>
    </div>
    <textarea v-bind:id="editorId" ref="textarea" style="display:none;"></textarea>

    <div
      v-if="documentTabDrag"
      v-bind:class="{
        dropzone: true,
        top: true,
        dragover: documentTabDragWhere === 'top'
      }"
      v-on:drop="handleDrop($event, 'top')"
      v-on:dragenter="handleDragEnter($event, 'top')"
      v-on:dragleave="handleDragLeave($event)"
    >
      <clr-icon v-if="documentTabDragWhere === 'top'" shape="caret up"></clr-icon>
    </div>
    <div
      v-if="documentTabDrag"
      v-bind:class="{
        dropzone: true,
        left: true,
        dragover: documentTabDragWhere === 'left'
      }"
      v-on:drop="handleDrop($event, 'left')"
      v-on:dragenter="handleDragEnter($event, 'left')"
      v-on:dragleave="handleDragLeave($event)"
    >
      <clr-icon v-if="documentTabDragWhere === 'left'" shape="caret left"></clr-icon>
    </div>
    <div
      v-if="documentTabDrag"
      v-bind:class="{
        dropzone: true,
        bottom: true,
        dragover: documentTabDragWhere === 'bottom'
      }"
      v-on:drop="handleDrop($event, 'bottom')"
      v-on:dragenter="handleDragEnter($event, 'bottom')"
      v-on:dragleave="handleDragLeave($event)"
    >
      <clr-icon v-if="documentTabDragWhere === 'bottom'" shape="caret down"></clr-icon>
    </div>
    <div
      v-if="documentTabDrag"
      v-bind:class="{
        dropzone: true,
        right: true,
        dragover: documentTabDragWhere === 'right'
      }"
      v-on:drop="handleDrop($event, 'right')"
      v-on:dragenter="handleDragEnter($event, 'right')"
      v-on:dragleave="handleDragLeave($event)"
    >
      <clr-icon v-if="documentTabDragWhere === 'right'" shape="caret right"></clr-icon>
    </div>
  </div>
</template>

<script setup lang="ts">

/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Editor
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This displays the main editor for the app. It uses the
 *                  MarkdownEditor class to implement the full CodeMirror editor.
 *
 * END HEADER
 */

import MarkdownEditor from '@common/modules/markdown-editor'
import { Update } from '@codemirror/collab'
import objectToArray from '@common/util/object-to-array'
import { trans } from '@common/i18n-renderer'
// import extractYamlFrontmatter from '@common/util/extract-yaml-frontmatter'
// import YAML from 'yaml'

import { nextTick, ref, computed, onMounted, watch, toRef } from 'vue'
import { useStore } from 'vuex'
import { key as storeKey } from './store'
import { EditorCommands, MainEditorDocumentWrapper } from '@dts/renderer/editor'
import { hasMarkdownExt } from '@providers/fsal/util/is-md-or-code-file'
import { DocumentType, DP_EVENTS } from '@dts/common/documents'
import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import { EditorConfiguration } from '@common/modules/markdown-editor/util/configuration'

const ipcRenderer = window.ipc

const props = defineProps({
  leafId: {
    type: String,
    required: true
  },
  windowId: {
    type: String,
    required: true
  },
  editorCommands: {
    type: Object as () => EditorCommands,
    required: true
  },
  distractionFree: {
    type: Boolean,
    required: true
  }
})

const store = useStore(storeKey)

// TEMPLATE REFS
const editor = ref<HTMLDivElement|null>(null)
const textarea = ref<HTMLTextAreaElement|null>(null)
const searchinput = ref<HTMLInputElement|null>(null)

// UNREFFED STUFF
let mdEditor: MarkdownEditor|null = null

// AUTHORITY CALLBACKS
async function pullUpdates (filePath: string, version: number): Promise<false|Update[]> {
  // Requests new updates from the authority. It may be that the returned
  // promise pends for minutes or even hours -- until new changes are available
  return await new Promise((resolve, reject) => {
    ipcRenderer.on('documents-update', (evt, { event, context }) => {
      if (event !== DP_EVENTS.CHANGE_FILE_STATUS || context.filePath !== filePath) {
        return
      }

      ipcRenderer.invoke('documents-authority', {
        command: 'pull-updates',
        payload: { filePath, version }
      })
        .then((result: false|Update[]) => {
          resolve(result)
        })
        .catch(err => reject(err))
    })
  })
}

async function pushUpdates (filePath: string, version: number, updates: any): Promise<boolean> {
  // Submits new updates to the authority, returns true if successful
  return await ipcRenderer.invoke('documents-authority', {
    command: 'push-updates',
    payload: { filePath, version, updates }
  })
}

async function getDoc (filePath: string): Promise<{ content: string, type: DocumentType, startVersion: number }> {
  // Fetches a fresh document
  return await ipcRenderer.invoke('documents-authority', {
    command: 'get-document',
    payload: { filePath }
  })
}

// EVENT LISTENERS
ipcRenderer.on('shortcut', (event, command) => {
  if (mdEditor?.hasFocus() !== true) {
    return // None of our business
  }

  if (command === 'close-window') {
    // TODO: Implement tab closing
  } else if (command === 'search') {
    showSearch.value = !showSearch.value
  } else if (command === 'toggle-typewriter-mode') {
    mdEditor.hasTypewriterMode = !mdEditor.hasTypewriterMode
  }
})

ipcRenderer.on('citeproc-database-updated', (event, dbPath: string) => {
  // TODO
  // const activeDoc = openDocuments.find(doc => doc.path === activeFile.value?.path)

  // if (activeDoc === undefined) {
  //   return // Nothing to do
  // }

  // const usesMainLib = activeDoc.library === CITEPROC_MAIN_DB

  // if (dbPath === activeDoc.library || (usesMainLib && dbPath === CITEPROC_MAIN_DB)) {
  //   updateCitationKeys(activeDoc).catch(e => console.error('Could not update citation keys', e))
  // }
})

// MOUNTED HOOK
onMounted(() => {
  // As soon as the component is mounted, initiate the editor
  mdEditor = new MarkdownEditor(editor.value as HTMLElement, getDoc, pullUpdates, pushUpdates)

  // We have to set this to the appropriate value after mount, afterwards it
  // will be updated as appropriate.
  mdEditor.countChars = shouldCountChars.value

  // Update the document info on corresponding events
  mdEditor.on('change', () => {
    store.commit('updateTableOfContents', mdEditor?.tableOfContents)
  })

  mdEditor.on('cursorActivity', () => {
    // Don't update every keystroke to not run into performance problems with
    // very long documents, since calculating the word count needs considerable
    // time, and without the delay, typing seems "laggy".
    if (mdEditor !== null) {
      store.commit('activeDocumentInfo', mdEditor.documentInfo)
    }
  })

  mdEditor.on('focus', () => {
    store.dispatch('lastLeafId', props.leafId).catch(err => console.error(err))
    if (mdEditor !== null) {
      store.commit('updateTableOfContents', mdEditor.tableOfContents)
    }
  })

  mdEditor.on('zettelkasten-link', (linkContents) => {
    ipcRenderer.invoke('application', {
      command: 'force-open',
      payload: {
        linkContents,
        newTab: undefined, // let open-file command decide based on preferences
        leafId: props.leafId,
        windowId: props.windowId
      }
    })
      .catch(err => console.error(err))

    if (store.state.config['zkn.autoSearch'] === true) {
      // TODO (bindInstance.$root as any).startGlobalSearch(linkContents)
    }
  })

  mdEditor.on('zettelkasten-tag', (tag) => {
    // TODO (bindInstance.$root as any).startGlobalSearch(tag)
  })

  // Lastly, run the initial load cycle
  loadActiveFile().catch(err => console.error(err))

  // Supply the configuration object once initially
  mdEditor.setOptions(editorConfiguration.value)
})

// DATA SETUP
const regexpSearch = ref(false)
const showSearch = ref(false)
const query = ref('')
const replaceString = ref('')
const findTimeout = ref<any>(undefined)
const anchor = ref<undefined|any>(undefined) // TODO: Correct position
const documentTabDrag = ref(false)
const documentTabDragWhere = ref<undefined|string>(undefined)

// COMPUTED PROPERTIES
const editorId = computed(() => `cm-text-${props.leafId}`)
const useH1 = computed<boolean>(() => store.state.config.fileNameDisplay.includes('heading'))
const useTitle = computed<boolean>(() => store.state.config.fileNameDisplay.includes('title'))
const filenameOnly = computed<boolean>(() => store.state.config['zkn.linkFilenameOnly'])
const fontSize = computed<number>(() => store.state.config['editor.fontSize'])
const shouldCountChars = computed<boolean>(() => store.state.config['editor.countChars'])
const tagDatabase = computed(() => store.state.tagDatabase)
const globalSearchResults = computed(() => store.state.searchResults)
const node = computed(() => store.state.paneData.find(leaf => leaf.id === props.leafId))
const activeFile = computed(() => node.value?.activeFile) // TODO: MAYBE REMOVE
const lastLeafId = computed(() => store.state.lastLeafId)

const editorConfiguration = computed<EditorConfiguration>(() => {
  // We update everything, because not so many values are actually updated
  // right after setting the new configurations. Plus, the user won't update
  // everything all the time, but rather do one initial configuration, so
  // even if we incur a performance penalty, it won't be noticed that much.
  return {
    // keyMap: store.state.config['editor.inputMode'],
    // direction: store.state.config['editor.direction'],
    // rtlMoveVisually: store.state.config['editor.rtlMoveVisually'],
    indentUnit: store.state.config['editor.indentUnit'],
    indentWithTabs: store.state.config['editor.indentWithTabs'],
    autoCloseBrackets: store.state.config['editor.autoCloseBrackets'],
    autocorrect: {
      active: store.state.config['editor.autoCorrect.active'],
      style: store.state.config['editor.autoCorrect.style'],
      magicQuotes: {
        primary: store.state.config['editor.autoCorrect.magicQuotes.secondary'],
        secondary: store.state.config['editor.autoCorrect.magicQuotes.secondary']
      },
      replacements: store.state.config['editor.autoCorrect.replacements']
    },
    imagePreviewWidth: store.state.config['display.imageWidth'],
    imagePreviewHeight: store.state.config['display.imageHeight'],
    boldFormatting: store.state.config['editor.boldFormatting'],
    italicFormatting: store.state.config['editor.italicFormatting'],
    muteLines: store.state.config.muteLines,
    citeStyle: store.state.config['editor.citeStyle'],
    readabilityAlgorithm: store.state.config['editor.readabilityAlgorithm'],
    idRE: store.state.config['zkn.idRE'],
    idGen: store.state.config['zkn.idGen'],
    renderCitations: store.state.config['display.renderCitations'],
    renderIframes: store.state.config['display.renderIframes'],
    renderImages: store.state.config['display.renderImages'],
    renderLinks: store.state.config['display.renderLinks'],
    renderMath: store.state.config['display.renderMath'],
    renderTasks: store.state.config['display.renderTasks'],
    renderHeadings: store.state.config['display.renderHTags'],
    renderTables: store.state.config['editor.enableTableHelper'],
    renderEmphasis: store.state.config['display.renderEmphasis'],
    linkStart: store.state.config['zkn.linkStart'],
    linkEnd: store.state.config['zkn.linkEnd'],
    linkPreference: store.state.config['zkn.linkWithFilename'],
    linkFilenameOnly: store.state.config['zkn.linkFilenameOnly'],
    readabilityMode: false, // TODO
    typewriterMode: false, // TODO
    metadata: {
      path: '',
      id: '',
      library: '' // TODO
    }
  } as EditorConfiguration
})

// External commands/"event" system
watch(toRef(props.editorCommands, 'jumpToLine'), () => {
  const { filePath, lineNumber, setCursor } = props.editorCommands.data
  // Execute a jtl-command if the current displayed file is the correct one
  if (filePath === activeFile.value?.path) {
    jtl(lineNumber, setCursor)
  }
})
watch(toRef(props.editorCommands, 'moveSection'), () => {
  if (lastLeafId.value !== props.leafId) {
    return
  }
  const { from, to } = props.editorCommands.data
  mdEditor?.moveSection(from, to)
})
watch(toRef(props.editorCommands, 'readabilityMode'), (newValue) => {
  if (lastLeafId.value !== props.leafId) {
    return
  }

  if (mdEditor !== null) {
    mdEditor.readabilityMode = !mdEditor.readabilityMode
    if (mdEditor.readabilityMode) {
      store.commit('addReadabilityActiveLeaf', props.leafId)
    } else {
      store.commit('removeReadabilityActiveLeaf', props.leafId)
    }
  }
})

watch(toRef(props, 'distractionFree'), (newValue) => {
  if (mdEditor !== null) {
    mdEditor.distractionFree = props.distractionFree
  }
})
watch(toRef(props.editorCommands, 'addKeywords'), () => {
  if (lastLeafId.value !== props.leafId) {
    return
  }
  const keywords: string[] = props.editorCommands.data
  addKeywordsToFile(keywords)
})
watch(toRef(props.editorCommands, 'executeCommand'), () => {
  if (lastLeafId.value !== props.leafId) {
    return
  }
  const command: string = props.editorCommands.data
  mdEditor?.runCommand(command)
  mdEditor?.focus()
})
watch(toRef(props.editorCommands, 'replaceSelection'), () => {
  if (lastLeafId.value !== props.leafId) {
    // return TODO
  }
  // const textToInsert: string = props.editorCommands.data
  // mdEditor?.replaceSelection(textToInsert)
})

const findPlaceholder = trans('dialog.find.find_placeholder')
const replacePlaceholder = trans('dialog.find.replace_placeholder')
const replaceNextLabel = trans('dialog.find.replace_next_label')
const replaceAllLabel = trans('dialog.find.replace_all_label')
const closeLabel = trans('dialog.find.close_label')
const regexLabel = trans('dialog.find.regex_label')

const isMarkdown = computed(() => {
  if (activeFile.value == null) {
    return true // By default, assume Markdown
  }

  return hasMarkdownExt(activeFile.value.path)
})

const fsalFiles = computed(() => {
  const tree = store.state.fileTree
  const files = []

  for (const item of tree) {
    if (item.type === 'directory') {
      const contents = objectToArray(item, 'children').filter(descriptor => descriptor.type === 'file')
      files.push(...contents)
    } else if (item.type === 'file') {
      files.push(item)
    }
  }

  return files
})

// WATCHERS
watch(useH1, () => { updateFileDatabase() })
watch(useTitle, () => { updateFileDatabase() })
watch(filenameOnly, () => { updateFileDatabase() })
watch(fsalFiles, () => { updateFileDatabase() })

watch(editorConfiguration, (newValue) => {
  mdEditor?.setOptions(newValue)
})

watch(tagDatabase, (newValue) => {
  if (mdEditor === null) {
    return
  }

  // We must deproxy the tag database
  const tags: string[] = []
  for (const tag in newValue) {
    tags.push(tag)
  }

  mdEditor.setCompletionDatabase('tags', tags)
})

watch(globalSearchResults, () => { maybeHighlightSearchResults() })

watch(activeFile, async () => {
  await loadActiveFile()
})

watch(query, (newValue) => {
  // Make sure to switch the regexp search depending on the search input
  const isRegexp = /^\/.+\/[gimy]{0,4}$/.test(newValue)
  if (isRegexp && regexpSearch.value === false) {
    regexpSearch.value = true
  } else if (!isRegexp && regexpSearch.value === true) {
    regexpSearch.value = false
  }
})

watch(showSearch, (newValue, oldValue) => {
  if (newValue === true && oldValue === false) {
    // The user activated search, so focus the input and run a search (if
    // the query wasnt' empty)
    nextTick()
      .then(() => {
        searchinput.value?.focus()
        searchinput.value?.select()
      })
      .catch(err => console.error(err))
  } else if (newValue === false) {
    // Always "stopSearch" if the input is not shown, since this will clear
    // out, e.g., the matches on the scrollbar
    mdEditor?.stopSearch()
  }
})

watch(shouldCountChars, (newValue) => {
  if (mdEditor !== null) {
    mdEditor.countChars = newValue
  }
})

// METHODS
async function loadActiveFile () {
  if (mdEditor === null) {
    console.error('Received a file update but the editor was not yet initiated!')
    return
  }

  if (activeFile.value == null) {
    // TODO: REMOVE DOCUMENT!
    store.commit('updateTableOfContents', mdEditor.tableOfContents)
    // Update the citation keys with an empty array
    mdEditor.setCompletionDatabase('citations', [])
    return
  }

  swapDocument(activeFile.value.path)
}

function swapDocument (doc: string) {
  if (mdEditor === null) {
    console.error(`Could not swap to document ${doc}: Editor was not initialized`)
    return
  }

  if (activeFile.value == null) {
    console.error(`Could not swap to document ${doc}: Was not yet set as active file!`)
    return
  }

  // Provide the editor instance with metadata for the new file
  mdEditor.setOptions({
    metadata: {
      path: doc,
      id: '', /* TODO activeFile.id */
      library: CITEPROC_MAIN_DB
    }
  })

  mdEditor.swapDoc(doc)
    .then(() => {
      store.commit('updateTableOfContents', mdEditor?.tableOfContents)
      store.commit('activeDocumentInfo', mdEditor?.documentInfo)
      // Check if there are search results available for this file that we can
      // pull in and highlight
      maybeHighlightSearchResults()
      // TODO
      // Update the citation keys
      // if (doc.library !== undefined) {
      //   updateCitationKeys(doc).catch(e => console.error('Could not update citation keys', e))
      // }
    })
    .catch(err => console.error(err))
}

function jtl (lineNumber: number, setCursor: boolean = false) {
  if (mdEditor !== null) {
    mdEditor.jtl(lineNumber) // TODO: Cursor?
  }
}

// eslint-disable-next-line no-unused-vars
async function updateCitationKeys (doc: MainEditorDocumentWrapper): Promise<void> {
  if (mdEditor === null) {
    return
  }

  const items: any[] = (await ipcRenderer.invoke('citeproc-provider', {
    command: 'get-items',
    payload: { database: doc.library }
  }))
    .map((item: any) => {
      // Get a rudimentary author list
      let authors = ''
      if (item.author !== undefined) {
        authors = item.author.map((author: any) => {
          if (author.family !== undefined) {
            return author.family
          } else if (author.literal !== undefined) {
            return author.literal
          } else {
            return undefined
          }
        }).filter((elem: any) => elem !== undefined).join(', ')
      }

      let title = ''
      if (item.title !== undefined) {
        title = item.title
      } else if (item['container-title'] !== undefined) {
        title = item['container-title']
      }

      // This is just a very crude representation of the citations.
      return {
        citekey: item.id,
        displayText: `${item.id}: ${authors} - ${title}`
      }
    })

  mdEditor.setCompletionDatabase('citations', items)
}

function updateFileDatabase () {
  if (mdEditor === null) {
    return
  }

  const fileDatabase: Array<{ filename: string, id: string }> = []

  for (const file of fsalFiles.value) {
    const fname = file.name.substr(0, file.name.lastIndexOf('.'))
    let displayText = fname // Fallback: Only filename
    if (useTitle.value && typeof file.frontmatter?.title === 'string') {
      // (Else) if there is a frontmatter, use that title
      displayText = file.frontmatter.title
    } else if (useH1.value && file.firstHeading !== null) {
      // The user wants to use first headings as fallbacks
      displayText = file.firstHeading
    }

    if (file.id !== '' && !filenameOnly.value) {
      displayText = `${file.id}: ${displayText}`
    }

    fileDatabase.push({
      // Use the ID, if given, or the filename
      filename: (file.id !== '' && !filenameOnly.value) ? file.id : fname,
      id: (file.id !== '' && !filenameOnly.value) ? file.id : ''
    })
  }

  mdEditor.setCompletionDatabase('files', fileDatabase)
}

function toggleQueryRegexp () {
  const isRegexp = /^\/.+\/[gimy]{0,4}$/.test(query.value.trim())

  if (isRegexp) {
    const match = /^\/(.+)\/[gimy]{0,4}$/.exec(query.value.trim())
    if (match !== null) {
      query.value = match[1]
    }
  } else {
    query.value = `/${query.value}/`
  }
}

// SEARCH FUNCTIONALITY BLOCK
function searchNext () {
  // Make sure to clear out a timeout to prevent Zettlr from auto-searching
  // again after the user deliberately searched by pressing Enter.
  if (findTimeout.value !== undefined) {
    clearTimeout(findTimeout.value)
    findTimeout.value = undefined
  }
  mdEditor?.searchNext(query.value)
}

// NOTE: These functions have to be "piped" through the setup since expressions
// inside the template will only be evaluated once, ergo for them mdEditor will
// always be null and they will never call the corresponding function.
function searchPrevious () { mdEditor?.searchPrevious(query.value) }
function replaceNext () { mdEditor?.replaceNext(query.value, replaceString.value) }
function replacePrevious () { mdEditor?.replacePrevious(query.value, replaceString.value) }
function replaceAll () { mdEditor?.replaceAll(query.value, replaceString.value) }

function maybeHighlightSearchResults () {
  const doc = activeFile.value
  if (doc == null || mdEditor === null) {
    return // No open file/no editor
  }

  const result = globalSearchResults.value.find((r: any) => r.file.path === doc.path)
  if (result !== undefined) {
    // Construct CodeMirror.Ranges from the results
    const rangesToHighlight = []
    for (const res of result.result) {
      const line: number = res.line
      for (const range of res.ranges) {
        const { from, to } = range
        rangesToHighlight.push({
          anchor: { line, ch: from },
          head: { line, ch: to }
        })
      }
    }
    mdEditor.highlightRanges(rangesToHighlight as any)
  }
}

/**
 * Scrolls the editor according to the value if the user scrolls left of the
 * .CodeMirror-scroll element
 *
 * @param   {WheelEvent}  event  The mousewheel event
 */
function onEditorScroll (event: WheelEvent) {
  if (event.target !== editor.value) {
    return // Only handle if the event's target is the editor itself
  }

  const scroller = editor.value?.querySelector('.CodeMirror-scroll')

  if (scroller != null) {
    scroller.scrollTop += event.deltaY
  }
}

/**
 * Triggers when the user presses any mouse button
 *
 * @param   {MouseEvent}  event  The mouse event
 */
function editorMousedown (event: MouseEvent) {
  // start selecting lines only if we are on the left margin and the left mouse button is pressed
  if (event.target !== editor.value || event.button !== 0 || mdEditor === null) {
    // return TODO
  }

  // set the start point of the selection to be where the mouse was clicked
  // anchor.value = mdEditor.codeMirror.coordsChar({ left: event.pageX, top: event.pageY })
  // mdEditor.codeMirror.setSelection(anchor.value)
}

function editorMousemove (event: MouseEvent) {
  if (anchor.value === undefined || mdEditor === null) {
    // return TODO
  }
  // get the point where the mouse has moved
  // const addPoint = mdEditor.codeMirror.coordsChar({ left: event.pageX, top: event.pageY })
  // use the original start point where the mouse first was clicked
  // and change the end point to where the mouse has moved so far
  // mdEditor.codeMirror.setSelection(anchor.value, addPoint)
}

/**
 * Triggers when the user releases any mouse button
 *
 * @param   {MouseEvent}  event  The mouse event
 */
function editorMouseup (event: MouseEvent) {
  if (anchor.value === undefined || mdEditor === null) {
    // This event gets also fired when someone, e.g., wants to edit an image
    // caption, so we must explicitly check if we are currently in a left-
    // side selection event, and if we aren't, don't do anything.
    return
  }

  // when the mouse is released, set anchor to undefined to stop adding lines
  anchor.value = undefined
  // Also, make sure the editor is focused.
  mdEditor.focus()
}

// TODO
// eslint-disable-next-line no-unused-vars
function addKeywordsToFile (keywords: string[]) {
  // if (mdEditor === null || activeFile.value == null) {
  //   return
  // }

  // // Split the contents of the editor into frontmatter and contents, then
  // // add the keywords to the frontmatter, slice everything back together
  // // and then overwrite the editor's contents.
  // let { frontmatter, content } = extractYamlFrontmatter(mdEditor.value)

  // let postFrontmatter = '\n'
  // if (frontmatter !== null) {
  //   if ('keywords' in frontmatter) {
  //     frontmatter.keywords = frontmatter.keywords.concat(keywords)
  //   } else if ('tags' in frontmatter) {
  //     frontmatter.tags = frontmatter.tags.concat(keywords)
  //   } else {
  //     frontmatter.keywords = keywords
  //   }
  // } else {
  //   // Frontmatter was null, so create one
  //   frontmatter = {}
  //   frontmatter.keywords = keywords
  //   postFrontmatter += '\n' // Make sure if we're now ADDING a frontmatter to space it from the content
  // }

  // // Glue it back together and set it as content
  // const activeDocument = openDocuments.find(doc => activeFile.value?.path === doc.path)
  // if (activeDocument === undefined) {
  //   return
  // }
  // activeDocument.cmDoc.setValue('---\n' + YAML.stringify(frontmatter) + '---' + postFrontmatter + content)
}

function handleDrop (event: DragEvent, where: 'editor'|'top'|'left'|'right'|'bottom') {
  const DELIM = (process.platform === 'win32') ? ';' : ':'
  const documentTab = event.dataTransfer?.getData('zettlr/document-tab')
  if (documentTab !== undefined && documentTab.includes(DELIM)) {
    documentTabDrag.value = false
    event.stopPropagation()
    event.preventDefault()
    // At this point, we have received a drop we need to handle it. There
    // are two possibilities: Either the user has dropped the file onto the
    // editor, which means the file should be moved from its origin here.
    // Or, the user has dropped the file onto one of the four edges. In that
    // case, we need to first split this specific leaf, and then move the
    // dropped file there. The drag data contains both the origin and the
    // path, separated by the $PATH delimiter -> window:leaf:absPath
    const [ originWindow, originLeaf, filePath ] = documentTab.split(DELIM)
    if (where === 'editor' && props.leafId === originLeaf) {
      // Nothing to do, the user dropped the file on the origin
      return false
    }

    // Now actually perform the act
    if (where === 'editor') {
      ipcRenderer.invoke('documents-provider', {
        command: 'move-file',
        payload: {
          originWindow,
          targetWindow: props.windowId,
          originLeaf,
          targetLeaf: props.leafId,
          path: filePath
        }
      })
        .catch(err => console.error(err))
    } else {
      const dir = ([ 'left', 'right' ].includes(where)) ? 'horizontal' : 'vertical'
      const ins = ([ 'top', 'left' ].includes(where)) ? 'before' : 'after'
      ipcRenderer.invoke('documents-provider', {
        command: 'split-leaf',
        payload: {
          originWindow: props.windowId,
          originLeaf: props.leafId,
          direction: dir,
          insertion: ins,
          path: filePath,
          fromWindow: originWindow,
          fromLeaf: originLeaf
        }
      })
        .catch(err => console.error(err))
    }
  }
}

function handleDragEnter (event: DragEvent, where: 'editor'|'top'|'left'|'right'|'bottom') {
  const hasDocumentTab = event.dataTransfer?.types.includes('zettlr/document-tab') ?? false
  if (hasDocumentTab) {
    event.stopPropagation()
    documentTabDrag.value = true
    documentTabDragWhere.value = where
  }
}

function handleDragLeave (event: DragEvent) {
  const hasDocumentTab = event.dataTransfer?.types.includes('zettlr/document-tab') ?? false
  if (hasDocumentTab && editor.value !== null) {
    const bounds = editor.value.getBoundingClientRect()
    const outX = event.clientX < bounds.left || event.clientX > bounds.right
    const outY = event.clientY < bounds.top || event.clientY > bounds.bottom
    if (outX || outY) {
      documentTabDrag.value = false
      documentTabDragWhere.value = undefined
    }
  }
}

</script>

<style lang="less">
// Editor Geometry

// Editor margins left and right for all breakpoints in both fullscreen and
// normal mode.
@editor-margin-fullscreen-sm:   50px;
@editor-margin-fullscreen-md:  5vw;
@editor-margin-fullscreen-lg:  10vw;
@editor-margin-fullscreen-xl:  20vw;
@editor-margin-fullscreen-xxl: 30vw;

@editor-margin-normal-sm:  20px;
@editor-margin-normal-md:  50px;
@editor-margin-normal-lg: 100px;

@dropzone-size: 60px;

.main-editor-wrapper {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: #ffffff;
  transition: 0.2s background-color ease;
  position: relative;

  &.fullscreen {
    position: fixed;
    z-index: 1000; // Ensure this editor instance is on top of any other pane
    top: 40px; // Titlebar height
    bottom: 0;
    left: 0;
    right: 0;
  }

  div.main-editor-search {
    position: absolute;
    width: 300px;
    right: 0;
    z-index: 7; // One less and the scrollbar will on top of the input field
    padding: 5px 10px;

    div.row { display: flex; }

    input {
      flex: 3;
      &.has-regex { font-family: monospace; }
    }

    button {
      flex: 1;
      max-width: 24px;
    }
  }

  @keyframes caretup {
    from { margin-bottom: 0; opacity: 1; }
    50% { opacity: 0; }
    75% { margin-bottom: @dropzone-size; opacity: 0; }
    to { margin-bottom: @dropzone-size; opacity: 0; }
  }
  @keyframes caretdown {
    from { margin-top: 0; opacity: 1; }
    50% { opacity: 0; }
    75% { margin-top: @dropzone-size; opacity: 0; }
    to { margin-top: @dropzone-size; opacity: 0; }
  }
  @keyframes caretleft {
    from { margin-right: 0; opacity: 1; }
    50% { opacity: 0; }
    75% { margin-right: @dropzone-size; opacity: 0; }
    to { margin-right: @dropzone-size; opacity: 0; }
  }
  @keyframes caretright {
    from { margin-left: 0; opacity: 1; }
    50% { opacity: 0; }
    75% { margin-left: @dropzone-size; opacity: 0; }
    to { margin-left: @dropzone-size; opacity: 0; }
  }

  div.dropzone {
    position: absolute;
    background-color: rgba(0, 0, 0, 0);
    transition: all 0.3s ease;
    // Display the direction caret centered ...
    display: flex;
    align-items: center;
    // ... and in white (against the dragover background color)
    color: white;

    clr-icon { margin: 0; }

    &.dragover {
      background-color: rgba(21, 61, 107, 0.5);
      box-shadow: 0px 0px 5px 0px rgba(0, 0, 0, .2);
      backdrop-filter: blur(2px);
    }

    &.top {
      top: 0;
      width: 100%;
      height: @dropzone-size;
      flex-direction: column-reverse;
      clr-icon { animation: 1s ease-out infinite running caretup; }
    }

    &.left {
      top: 0;
      left: 0;
      height: 100%;
      width: @dropzone-size;
      flex-direction: row-reverse;
      clr-icon { animation: 1s ease-out infinite running caretleft; }
    }

    &.right {
      top: 0;
      right: 0;
      height: 100%;
      width: @dropzone-size;
      flex-direction: row;
      clr-icon { animation: 1s ease-out infinite running caretright; }
    }

    &.bottom {
      bottom: 0;
      width: 100%;
      height: @dropzone-size;
      justify-content: center;
      align-items: flex-start;
      clr-icon { animation: 1s ease-out infinite running caretdown; }
    }
  }

  .cm-editor {
    // The CodeMirror editor needs to respect the new tabbar; it cannot take
    // up 100 % all for itself anymore.
    margin-left: 0.5em;
    height: 100%;
    font-family: inherit;
    // background: none;

    // @media(min-width: 1025px) { margin-left: @editor-margin-normal-lg; }
    // @media(max-width: 1024px) { margin-left: @editor-margin-normal-md; }
    // @media(max-width:  900px) { margin-left: @editor-margin-normal-sm; }
    margin-left: 5%;
  }

  // If a code file is loaded, we need to display the editor contents in monospace.
  &.code-file .cm-editor {
    font-family: monospace;

    margin-left: 0px;
    .cm-content {
      padding-right: 0px;
    }

    // We're using this solarized theme here: https://ethanschoonover.com/solarized/
    // See also the CodeEditor.vue component, which uses the same colours
    @base03:    #002b36;
    @base02:    #073642;
    @base01:    #586e75;
    @base00:    #657b83;
    @base0:     #839496;
    @base1:     #93a1a1;
    @base2:     #eee8d5;
    @base3:     #fdf6e3;
    @yellow:    #b58900;
    @orange:    #cb4b16;
    @red:       #dc322f;
    @magenta:   #d33682;
    @violet:    #6c71c4;
    @blue:      #268bd2;
    @cyan:      #2aa198;
    @green:     #859900;

    color: @base01;
    .cm-string     { color: @green; }
    .cm-string-2   { color: @green; }
    .cm-keyword    { color: @green; }
    .cm-atom       { color: @green; }
    .cm-tag        { color: @blue; }
    .cm-qualifier  { color: @blue; }
    .cm-builtin    { color: @blue; }
    .cm-variable-2 { color: @yellow; }
    .cm-variable   { color: @yellow; }
    .cm-comment    { color: @base1; }
    .cm-attribute  { color: @orange; }
    .cm-property   { color: @magenta; }
    .cm-type       { color: @red; }
    .cm-number     { color: @violet; }

    // Reset the margins for code files (top/bottom, see the other
    // CodeMirror-code definition)
    .CodeMirror-code { margin: 0; }
  }

  .cm-content {
    margin: 5em 0em;
    @media(max-width: 1024px) { margin: @editor-margin-fullscreen-md 0em; }

    .mute { opacity:0.2; }
  }

  .cm-content {
    // padding-right: 5em;
    padding-right: 5%;
    // @media(min-width: 1025px) { padding-right: @editor-margin-normal-lg; }
    // @media(max-width: 1024px) { padding-right: @editor-margin-normal-md; }
    // @media(max-width:  900px) { padding-right: @editor-margin-normal-sm; }
    overflow-x: hidden !important; // Necessary to hide the horizontal scrollbar

    // We need to override a negative margin
    // and a bottom padding from the standard
    // CSS for some calculations to be correct
    // such as the table editor
    margin-bottom: 0px;
    padding-bottom: 0px;
  }

  .CodeMirror.CodeMirror-readonly {
    .CodeMirror-cursor { display: none !important; }
  }

  // Math equations in text mode
  .katex {
    font-size: 1.1em; // reduce font-size of math a bit
    display: inline-block; // needed for display math to behave properly
    user-select: none; // Disable user text selection
  }

  // Math equations in display mode
  .katex-display, .katex-display > .katex > .katex-html {
    display: inline-block; // needed for display math to behave properly
    width: 100%; // display math should be centred
    margin-bottom: -0.5em; // counterbalance additional empty line that is added by code mirror due to a bug https://github.com/codemirror/CodeMirror/issues/6600
  }
}

body.dark .main-editor-wrapper {
  background-color: rgba(20, 20, 30, 1);
  .CodeMirror .CodeMirror-gutters { background-color: rgba(20, 20, 30, 1); }
}

body.darwin .main-editor-wrapper {
  // On macOS the tabbar is 30px high.
  &:not(.fullscreen) {
    height: calc(100% - 30px);
  }

  div.main-editor-search {
    background-color: rgba(230, 230, 230, 1);
    border-bottom-left-radius: 6px;
    padding: 6px;
    box-shadow: -2px 2px 4px 1px rgba(0, 0, 0, .3);

    input[type="text"], button {
      border-radius: 0;
      margin: 0;
    }

    button:hover { background-color: rgb(240, 240, 240); }
    button.active { background-color: rgb(200, 200, 200) }
  }
}

body.darwin.dark .main-editor-wrapper {
  div.main-editor-search {
    background-color: rgba(60, 60, 60, 1);
  }
}

body.win32 .main-editor-wrapper, body.linux .main-editor-wrapper {
  // On Windows, the tab bar is 30px high
  &:not(.fullscreen) {
    height: calc(100% - 30px);
  }

  div.main-editor-search {
    background-color: rgba(230, 230, 230, 1);
    box-shadow: -2px 2px 4px 1px rgba(0, 0, 0, .3);

    button { max-width: fit-content; }
    button, input { border-width: 1px; }

    button:hover { background-color: rgb(240, 240, 240); }
    button.active { background-color: rgb(200, 200, 200) }
  }
}

// CodeMirror fullscreen
.main-editor-wrapper.fullscreen {
    .cm-editor {
    @media(min-width: 1301px) { margin-left: @editor-margin-fullscreen-xxl !important; }
    @media(max-width: 1300px) { margin-left: @editor-margin-fullscreen-xl  !important; }
    @media(max-width: 1100px) { margin-left: @editor-margin-fullscreen-lg  !important; }
    @media(max-width: 1000px) { margin-left: @editor-margin-fullscreen-md  !important; }
    @media(max-width:  800px) { margin-left: @editor-margin-fullscreen-sm  !important; }

    .cm-content {
      @media(min-width: 1301px) { padding-right: @editor-margin-fullscreen-xxl !important; }
      @media(max-width: 1300px) { padding-right: @editor-margin-fullscreen-xl  !important; }
      @media(max-width: 1100px) { padding-right: @editor-margin-fullscreen-lg  !important; }
      @media(max-width: 1000px) { padding-right: @editor-margin-fullscreen-md  !important; }
      @media(max-width:  800px) { padding-right: @editor-margin-fullscreen-sm  !important; }
    }
  }
}

body.darwin {
    .main-editor-wrapper.fullscreen {
     border-top: 1px solid #d5d5d5;
  }

  &.dark {
    .main-editor-wrapper.fullscreen {
      border-top-color: #505050;
    }
  }
}

// Define the readability classes
.cm-readability-0   { background-color: hsv(52, 27.6%, 96.5%); color: #444444 !important; }
.cm-readability-1   { background-color: hsv( 1, 19.7%, 89.8%); color: #444444 !important; }
.cm-readability-2   { background-color: hsv( 184, 36%, 93.7%); color: #444444 !important; }
.cm-readability-3   { background-color: hsv( 202, 20.4%, 96.1%); color: #444444 !important; }
.cm-readability-4   { background-color: hsv( 31, 41.9%, 90%); color: #444444 !important; }
.cm-readability-5   { background-color: hsv( 91, 36%, 95%); color: #444444 !important; }
.cm-readability-6   { background-color: hsv( 91, 80%, 91%); color: #444444 !important; }
.cm-readability-7   { background-color: hsv( 52, 60%, 40%); color: #444444 !important; }
.cm-readability-8   { background-color: hsv( 1, 62.4%, 52.5%); color: #444444 !important; }
.cm-readability-9   { background-color: hsv( 184, 70%, 45.5%); color: #444444 !important; }
.cm-readability-10  { background-color: hsv( 201, 89%, 24.5%); color: #444444 !important; }
</style>
