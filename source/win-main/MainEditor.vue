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
    ></div>
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
    ></div>
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
    ></div>
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
    ></div>
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

import countWords from '@common/util/count-words'
import MarkdownEditor from '@common/modules/markdown-editor'
import CodeMirror from 'codemirror'
import extractCitations from '@common/util/extract-citations'
import objectToArray from '@common/util/object-to-array'
import { trans } from '@common/i18n-renderer'
import extractYamlFrontmatter from '@common/util/extract-yaml-frontmatter'
import YAML from 'yaml'

import { nextTick, ref, computed, onMounted, watch, toRef } from 'vue'
import { useStore } from 'vuex'
import { key as storeKey } from './store'
import { EditorCommands, MainEditorDocumentWrapper } from '@dts/renderer/editor'
import retrieveDocumentFromMain from './util/retrieve-document-from-main'
import { hasMarkdownExt } from '@providers/fsal/util/is-md-or-code-file'
import { DP_EVENTS } from '@dts/common/documents'
import { CodeFileMeta, MDFileMeta } from '@dts/common/fsal'

const ipcRenderer = window.ipc
const path = window.path

const props = defineProps({
  readabilityMode: {
    type: Boolean,
    default: false
  },
  distractionFree: {
    type: Boolean,
    default: false
  },
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
  }
})

const store = useStore(storeKey)

// TEMPLATE REFS
const editor = ref<HTMLDivElement|null>(null)
const textarea = ref<HTMLTextAreaElement|null>(null)
const searchinput = ref<HTMLInputElement|null>(null)

// UNREFFED STUFF
let mdEditor: MarkdownEditor|null = null
const openDocuments: MainEditorDocumentWrapper[] = []

// EVENT LISTENERS
ipcRenderer.on('shortcut', (event, command) => {
  if (mdEditor?.codeMirror.hasFocus() !== true) {
    return // None of our business
  }

  if (command === 'save-file') {
    const activeDoc = openDocuments.find(doc => doc.path === activeFile.value?.path)
    if (activeDoc !== undefined) {
      save(activeDoc).catch(err => console.error(err))
    }
  } else if (command === 'close-window') {
    // TODO: Implement tab closing
  } else if (command === 'search') {
    showSearch.value = !showSearch.value
  }
})

function announceDocumentModified (doc: MainEditorDocumentWrapper): void {
  ipcRenderer.invoke('documents-provider', {
    command: 'update-file-modification-status',
    payload: {
      path: doc.path,
      isClean: doc.cmDoc.isClean(),
      timestamp: Date.now(),
      contents: (!doc.cmDoc.isClean()) ? doc.cmDoc.getValue() : ''
    }
  })
    .catch(err => console.error(err))
}

ipcRenderer.on('documents-update', (evt, { event, context }) => {
  const openPaths = openDocuments.map(x => x.path)
  const { filePath } = context
  if (event === DP_EVENTS.FILE_SAVED && openPaths.includes(filePath)) {
    // We have to re-load the document from main. Basically, what we do here is
    // to load it using our utility function, and then just copying over the
    // content, omitting the loaded document.
    const thisDoc = openDocuments.find(x => x.path === filePath) as MainEditorDocumentWrapper
    retrieveDocumentFromMain(filePath, path.extname(filePath), shouldCountChars.value, autoSave, () => {})
      .then(newDoc => {
        const newValue = newDoc.cmDoc.getValue()
        if (thisDoc.cmDoc.getValue() === newValue) {
          return
        }

        thisDoc.cmDoc.setValue(newValue)
        thisDoc.cmDoc.markClean()
        // Immediately notify main that this is not, in fact, modified
        announceDocumentModified(thisDoc)
      })
      .catch(err => console.error(err))
  } else if (event === DP_EVENTS.FILE_REMOTELY_CHANGED && openPaths.includes(filePath)) {
    const descriptor = context.descriptor as MDFileMeta|CodeFileMeta
    const thisDoc = openDocuments.find(x => x.path === filePath) as MainEditorDocumentWrapper
    // Replace its content, if applicable
    if (thisDoc.cmDoc.getValue() !== descriptor.content) {
      thisDoc.cmDoc.setValue(descriptor.content)
      thisDoc.cmDoc.markClean()
      announceDocumentModified(thisDoc)
    }
  }
})

// MOUNTED HOOK
onMounted(() => {
  // As soon as the component is mounted, initiate the editor
  mdEditor = new MarkdownEditor(editorId.value, editorConfiguration)

  // We have to set this to the appropriate value after mount, afterwards it
  // will be updated as appropriate.
  mdEditor.countChars = shouldCountChars.value

  // Update the document info on corresponding events
  mdEditor.on('change', (changeObj: CodeMirror.EditorChange) => {
    if (mdEditor === null || activeFile.value === null) {
      return
    }

    const activeDocument = openDocuments.find(doc => activeFile.value?.path === doc.path)
    if (activeDocument === undefined) {
      return
    }

    // Announce that the file is modified (if applicable) to the whole application
    if (changeObj.origin !== 'setValue') {
      announceDocumentModified(activeDocument)
    }

    store.commit('updateTableOfContents', mdEditor.tableOfContents)
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
        linkContents: linkContents,
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
})

// DATA SETUP
const currentlyFetchingFiles = ref<string[]>([])
const regexpSearch = ref(false)
const showSearch = ref(false)
const query = ref('')
const replaceString = ref('')
const findTimeout = ref<any>(undefined)
const docInfoTimeout = ref<any>(undefined)
const anchor = ref<undefined|CodeMirror.Position>(undefined)
const documentTabDrag = ref(false)
const documentTabDragWhere = ref<undefined|string>(undefined)

// COMPUTED PROPERTIES
const editorId = computed(() => `cm-text-${props.leafId}`)
const useH1 = computed<boolean>(() => store.state.config.fileNameDisplay.includes('heading'))
const useTitle = computed<boolean>(() => store.state.config.fileNameDisplay.includes('title'))
const filenameOnly = computed<boolean>(() => store.state.config['zkn.linkFilenameOnly'])
const fontSize = computed<number>(() => store.state.config['editor.fontSize'])
const shouldCountChars = computed<boolean>(() => store.state.config['editor.countChars'])
const autoSave = computed(() => store.state.config['editor.autoSave'])
const tagDatabase = computed(() => store.state.tagDatabase)
const cslItems = computed(() => store.state.cslItems)
const globalSearchResults = computed(() => store.state.searchResults)
const node = computed(() => store.state.paneData.find(leaf => leaf.id === props.leafId))
const activeFile = computed(() => node.value?.activeFile)
const openFiles = computed(() => node.value?.openFiles ?? [])
const lastLeafId = computed(() => store.state.lastLeafId)

const editorConfiguration = computed<any>(() => {
  // We update everything, because not so many values are actually updated
  // right after setting the new configurations. Plus, the user won't update
  // everything all the time, but rather do one initial configuration, so
  // even if we incur a performance penalty, it won't be noticed that much.
  const doubleQuotes = store.state.config['editor.autoCorrect.magicQuotes.primary'].split('…')
  const singleQuotes = store.state.config['editor.autoCorrect.magicQuotes.secondary'].split('…')
  return {
    keyMap: store.state.config['editor.inputMode'],
    direction: store.state.config['editor.direction'],
    rtlMoveVisually: store.state.config['editor.rtlMoveVisually'],
    indentUnit: store.state.config['editor.indentUnit'],
    indentWithTabs: store.state.config['editor.indentWithTabs'],
    autoCloseBrackets: store.state.config['editor.autoCloseBrackets'],
    autoCorrect: {
      style: store.state.config['editor.autoCorrect.style'],
      quotes: {
        single: {
          start: singleQuotes[0],
          end: singleQuotes[1]
        },
        double: {
          start: doubleQuotes[0],
          end: doubleQuotes[1]
        }
      },
      replacements: store.state.config['editor.autoCorrect.replacements']
    },
    zettlr: {
      imagePreviewWidth: store.state.config['display.imageWidth'],
      imagePreviewHeight: store.state.config['display.imageHeight'],
      markdownBoldFormatting: store.state.config['editor.boldFormatting'],
      markdownItalicFormatting: store.state.config['editor.italicFormatting'],
      muteLines: store.state.config.muteLines,
      citeStyle: store.state.config['editor.citeStyle'],
      readabilityAlgorithm: store.state.config['editor.readabilityAlgorithm'],
      zettelkasten: {
        idRE: store.state.config['zkn.idRE'],
        idGen: store.state.config['zkn.idGen'],
        linkStart: store.state.config['zkn.linkStart'],
        linkEnd: store.state.config['zkn.linkEnd'],
        linkWithFilename: store.state.config['zkn.linkWithFilename']
      },
      render: {
        citations: store.state.config['display.renderCitations'],
        iframes: store.state.config['display.renderIframes'],
        images: store.state.config['display.renderImages'],
        links: store.state.config['display.renderLinks'],
        math: store.state.config['display.renderMath'],
        tasks: store.state.config['display.renderTasks'],
        headingTags: store.state.config['display.renderHTags'],
        tables: store.state.config['editor.enableTableHelper'],
        emphasis: store.state.config['display.renderEmphasis']
      }
    }
  }
})

// External commands/"event" system
watch(toRef(props.editorCommands, 'jumpToLine'), () => {
  if (lastLeafId.value !== props.leafId) {
    return
  }
  const { lineNumber, setCursor } = props.editorCommands.data
  jtl(lineNumber, setCursor)
})
watch(toRef(props.editorCommands, 'moveSection'), () => {
  if (lastLeafId.value !== props.leafId) {
    return
  }
  const { from, to } = props.editorCommands.data
  moveSection(from, to)
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
  executeCommand(command)
})
watch(toRef(props.editorCommands, 'replaceSelection'), () => {
  if (lastLeafId.value !== props.leafId) {
    return
  }
  const textToInsert: string = props.editorCommands.data
  replaceSelection(textToInsert)
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
watch(cslItems, (newValue) => {
  if (mdEditor === null) {
    return
  }

  // We have received new items, so we should update them in the editor.
  const items = newValue.map((item: any) => {
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
      text: item.id,
      displayText: `${item.id}: ${authors} - ${title}`
    }
  })
  mdEditor.setCompletionDatabase('citekeys', items)
})

watch(toRef(props, 'readabilityMode'), (newValue) => {
  if (mdEditor !== null) {
    mdEditor.readabilityMode = newValue
  }
})

watch(toRef(props, 'distractionFree'), (newValue) => {
  if (mdEditor !== null) {
    mdEditor.distractionFree = newValue
  }
})

watch(editorConfiguration, (newValue) => {
  if (mdEditor !== null) {
    mdEditor.setOptions(newValue)
  }
})

watch(tagDatabase, (newValue) => {
  if (mdEditor === null) {
    return
  }

  // We must deproxy the tag database
  const unproxy: any = {}
  for (const tag in newValue) {
    unproxy[tag] = {
      text: newValue[tag].text,
      count: newValue[tag].count,
      className: newValue[tag].className
    }
  }

  mdEditor.setCompletionDatabase('tags', unproxy)
})

watch(globalSearchResults, () => { maybeHighlightSearchResults() })

watch(activeFile, async () => {
  await loadActiveFile()
})

watch(openFiles, (newValue) => {
// watch(() => props.openFiles, (newValue) => {
  // The openFiles array in the store has changed --> remove all documents
  // that are not present anymore
  for (const doc of openDocuments) {
    const found = newValue.find(descriptor => descriptor.path === doc.path)
    if (found === undefined) {
      // Remove the document from our array
      const idx = openDocuments.indexOf(doc)
      openDocuments.splice(idx, 1)
    }
  }
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
    mdEditor.swapDoc(CodeMirror.Doc('', 'multiplex'), 'multiplex')
    mdEditor.readOnly = true
    store.commit('updateTableOfContents', mdEditor.tableOfContents)
    // Update the citation keys with an empty array
    updateCitationKeys()
    return
  }

  const doc = openDocuments.find(doc => doc.path === activeFile.value?.path)

  if (doc !== undefined) {
    // Simply swap it
    swapDocument(doc)
  } else if (!currentlyFetchingFiles.value.includes(activeFile.value.path)) {
    // We have to request the document beforehand
    currentlyFetchingFiles.value.push(activeFile.value.path)
    const newDoc = await retrieveDocumentFromMain(
      activeFile.value.path,
      path.extname(activeFile.value.path),
      shouldCountChars.value,
      autoSave,
      (doc) => { save(doc).catch(e => console.error(e)) }
    )

    openDocuments.push(newDoc)
    const idx = currentlyFetchingFiles.value.findIndex(e => e === newDoc.path)
    currentlyFetchingFiles.value.splice(idx, 1)
    // Let's check whether the active file has in the meantime changed
    // If it has, don't overwrite the current one
    if (activeFile.value.path === newDoc.path && mdEditor !== null) {
      swapDocument(newDoc)
    }
  } // Else: The file might currently being fetched, so let's wait ...
}

function swapDocument (doc: MainEditorDocumentWrapper) {
  if (mdEditor === null) {
    console.error(`Could not swap to document ${doc.path}: Editor was not initialized`)
    return
  }

  if (activeFile.value == null) {
    console.error(`Could not swap to document ${doc.path}: Was not yet set as active file!`)
    return
  }

  if (mdEditor.codeMirror.getDoc() === doc.cmDoc) {
    // swapDocument gets called whenever the state changes, so add a check
    // here whether the document is already the loaded one.
    return
  }

  // Provide the editor instance with metadata for the new file
  mdEditor.setOptions({
    zettlr: {
      markdownImageBasePath: path.dirname(activeFile.value.path),
      metadata: { path: activeFile.value.path, id: '' /* TODO activeFile.id */ }
    }
  })
  mdEditor.swapDoc(doc.cmDoc, doc.mode)
  mdEditor.readOnly = false
  store.commit('updateTableOfContents', mdEditor.tableOfContents)
  store.commit('activeDocumentInfo', mdEditor.documentInfo)
  // Check if there are search results available for this file that we can
  // pull in and highlight
  maybeHighlightSearchResults()
  // Update the citation keys
  updateCitationKeys()
}

// TODO
// eslint-disable-next-line no-unused-vars
function maybeUpdateActiveDocumentInfo () {
  if (docInfoTimeout.value !== undefined) {
    return // There will be an update soon enough.
  }

  docInfoTimeout.value = setTimeout(() => {
    docInfoTimeout.value = undefined
    if (mdEditor !== null) {
      store.commit('activeDocumentInfo', mdEditor.documentInfo)
    }
  }, 1000)
}

// TODO
// eslint-disable-next-line no-unused-vars
function jtl (lineNumber: number, setCursor: boolean = false) {
  if (mdEditor !== null) {
    mdEditor.jtl(lineNumber, setCursor)
  }
}

async function save (doc: MainEditorDocumentWrapper) {
  if (doc.cmDoc.isClean() === true) {
    return // Nothing to save
  }

  const newContents = doc.cmDoc.getValue()
  const currentWordCount = countWords(newContents, shouldCountChars.value)

  const result = await ipcRenderer.invoke('documents-provider', {
    command: 'save-file',
    payload: {
      windowId: props.windowId,
      leafId: props.leafId,
      path: doc.path,
      contents: doc.cmDoc.getValue(),
      offsetWordCount: currentWordCount - doc.lastWordCount
    }
  })

  if (result !== true) {
    console.error('Retrieved a falsy result from main, indicating an error with saving the file.')
    return
  }

  doc.lastWordCount = currentWordCount

  // Everything worked out, so clean up
  doc.cmDoc.markClean()
  store.dispatch('regenerateTagSuggestions').catch(e => console.error(e))
  announceDocumentModified(doc)

  // Also, extract all cited keys
  updateCitationKeys()
  // Saving can additionally do some changes to the files which are relevant
  // to the autocomplete, so make sure to update that as well. See #2330
  updateFileDatabase()
}

function updateCitationKeys () {
  if (mdEditor === null) {
    return
  }

  const value = mdEditor.value

  const citations = extractCitations(value)
  const keys = []
  for (const citation of citations) {
    keys.push(...citation.citations.map(elem => elem.id))
  }
  store.commit('updateCitationKeys', keys)
  // After we have updated the current file's citation keys, it is time
  // to generate a new list of references.
  store.dispatch('updateBibliography').catch(e => console.error(e))
}

function updateFileDatabase () {
  if (mdEditor === null) {
    return
  }

  const fileDatabase: any = {}

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

    fileDatabase[file.path] = {
      // Use the ID, if given, or the filename
      text: (file.id !== '' && !filenameOnly.value) ? file.id : fname,
      displayText: displayText,
      id: (file.id !== '' && !filenameOnly.value) ? file.id : ''
    }
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

// TODO
// eslint-disable-next-line no-unused-vars
function executeCommand (cmd: string) {
  // Executes a markdown command on the editor instance
  mdEditor?.runCommand(cmd)
  mdEditor?.focus()
}

// TODO
// eslint-disable-next-line no-unused-vars
function replaceSelection (value: string) {
  mdEditor?.codeMirror?.replaceSelection(value)
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

function searchPrevious () {
  mdEditor?.searchPrevious(query.value)
}

function replaceNext () {
  mdEditor?.replaceNext(query.value, replaceString.value)
}

function replacePrevious () {
  mdEditor?.replacePrevious(query.value, replaceString.value)
}

function replaceAll () {
  mdEditor?.replaceAll(query.value, replaceString.value)
}

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
          anchor: { line: line, ch: from },
          head: { line: line, ch: to }
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
    return
  }

  // set the start point of the selection to be where the mouse was clicked
  anchor.value = mdEditor.codeMirror.coordsChar({ left: event.pageX, top: event.pageY })
  mdEditor.codeMirror.setSelection(anchor.value)
}

function editorMousemove (event: MouseEvent) {
  if (anchor.value === undefined || mdEditor === null) {
    return
  }
  // get the point where the mouse has moved
  const addPoint = mdEditor.codeMirror.coordsChar({ left: event.pageX, top: event.pageY })
  // use the original start point where the mouse first was clicked
  // and change the end point to where the mouse has moved so far
  mdEditor.codeMirror.setSelection(anchor.value, addPoint)
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
  mdEditor.codeMirror.focus()
}

// TODO
// eslint-disable-next-line no-unused-vars
function addKeywordsToFile (keywords: string[]) {
  if (mdEditor === null || activeFile.value == null) {
    return
  }

  // Split the contents of the editor into frontmatter and contents, then
  // add the keywords to the frontmatter, slice everything back together
  // and then overwrite the editor's contents.
  let { frontmatter, content } = extractYamlFrontmatter(mdEditor.value)

  let postFrontmatter = '\n'
  if (frontmatter !== null) {
    if ('keywords' in frontmatter) {
      frontmatter.keywords = frontmatter.keywords.concat(keywords)
    } else if ('tags' in frontmatter) {
      frontmatter.tags = frontmatter.tags.concat(keywords)
    } else {
      frontmatter.keywords = keywords
    }
  } else {
    // Frontmatter was null, so create one
    frontmatter = {}
    frontmatter.keywords = keywords
    postFrontmatter += '\n' // Make sure if we're now ADDING a frontmatter to space it from the content
  }

  // Glue it back together and set it as content
  const activeDocument = openDocuments.find(doc => activeFile.value?.path === doc.path)
  if (activeDocument === undefined) {
    return
  }
  activeDocument.cmDoc.setValue('---\n' + YAML.stringify(frontmatter) + '---' + postFrontmatter + content)
}

// TODO
// eslint-disable-next-line no-unused-vars
function getValue () {
  return mdEditor?.value ?? ''
}

// TODO
// eslint-disable-next-line no-unused-vars
function moveSection (from: number, to: number) {
  mdEditor?.moveSection(from, to)
}

function handleDrop (event: DragEvent, where: 'editor'|'top'|'left'|'right'|'bottom') {
  const documentTab = event.dataTransfer?.getData('zettlr/document-tab')
  if (documentTab !== undefined && documentTab.includes(':')) {
    documentTabDrag.value = false
    event.stopPropagation()
    event.preventDefault()
    // At this point, we have received a drop we need to handle it. There
    // are two possibilities: Either the user has dropped the file onto the
    // editor, which means the file should be moved from its origin here.
    // Or, the user has dropped the file onto one of the four edges. In that
    // case, we need to first split this specific leaf, and then move the
    // dropped file there. The drag data contains both the origin and the
    // path, separated by colons -> window:leaf:absPath
    const [ originWindow, originLeaf, filePath ] = documentTab.split(':')
    if (where === 'editor' && props.leafId === originLeaf) {
      // Nothing to do, the user dropped the file on the origin
      return false
    }

    // Now actually perform the act
    if (where === 'editor') {
      ipcRenderer.invoke('documents-provider', {
        command: 'move-file',
        payload: {
          originWindow: originWindow,
          targetWindow: props.windowId,
          originLeaf: originLeaf,
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

.main-editor-wrapper {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: #ffffff;
  transition: 0.2s background-color ease;
  position: relative;

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

  div.dropzone {
    position: absolute;
    background-color: rgba(0, 0, 0, 0);
    transition: all 0.3s ease;

    &.dragover {
      background-color: rgba(21, 61, 107, 0.5);
      box-shadow: 0px 0px 5px 0px rgba(0, 0, 0, .5);
    }

    &.top {
      top: 0;
      width: 100%;
      height: 10%;
      min-height: 60px;
    }

    &.left {
      top: 0;
      left: 0;
      height: 100%;
      width: 10%;
      min-width: 60px;
    }

    &.right {
      top: 0;
      right: 0;
      height: 100%;
      width: 10%;
      min-width: 60px;
    }

    &.bottom {
      bottom: 0;
      width: 100%;
      height: 10%;
      min-height: 60px;
    }
  }

  .CodeMirror {
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
  &.code-file .CodeMirror {
    font-family: monospace;

    margin-left: 0px;
    .CodeMirror-scroll {
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

  .CodeMirror-code {
    margin: 5em 0em;
    @media(max-width: 1024px) { margin: @editor-margin-fullscreen-md 0em; }

    .mute { opacity:0.2; }
  }

  .CodeMirror-scroll {
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
    .CodeMirror {
    @media(min-width: 1301px) { margin-left: @editor-margin-fullscreen-xxl !important; }
    @media(max-width: 1300px) { margin-left: @editor-margin-fullscreen-xl  !important; }
    @media(max-width: 1100px) { margin-left: @editor-margin-fullscreen-lg  !important; }
    @media(max-width: 1000px) { margin-left: @editor-margin-fullscreen-md  !important; }
    @media(max-width:  800px) { margin-left: @editor-margin-fullscreen-sm  !important; }

    .CodeMirror-scroll {
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
