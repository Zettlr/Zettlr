<template>
  <div
    ref="mainEditorWrapper"
    class="main-editor-wrapper"
    role="region"
    v-bind:aria-label="`Markdown Editor: Currently editing file ${pathBasename(props.file.path)}`"
    v-bind:style="{ 'font-size': `${fontSize}px` }"
    v-bind:class="{
      'code-file': !isMarkdown,
      fullscreen: distractionFree
    }"
  >
    <div v-bind:id="`cm-text-${props.leafId}`">
      <!-- This element will be replaced with Codemirror's wrapper element on mount -->
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

import MarkdownEditor, { type EditorViewPersistentState } from '@common/modules/markdown-editor'
import objectToArray from '@common/util/object-to-array'

import { ref, computed, onMounted, onBeforeUnmount, watch, toRef, onUpdated } from 'vue'
import { type EditorCommands } from './App.vue'
import { hasMarkdownExt } from '@common/util/file-extention-checks'
import { DP_EVENTS, type OpenDocument } from '@dts/common/documents'
import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import { type EditorConfigOptions } from '@common/modules/markdown-editor/util/configuration'
import type { AnyDescriptor, CodeFileDescriptor, MDFileDescriptor } from '@dts/common/fsal'
import { getBibliographyForDescriptor as getBibliography } from '@common/util/get-bibliography-for-descriptor'
import { EditorSelection } from '@codemirror/state'
import { documentAuthorityIPCAPI } from '@common/modules/markdown-editor/util/ipc-api'
import { useConfigStore, useDocumentTreeStore, useTagsStore, useWindowStateStore, useWorkspacesStore } from 'source/pinia'
import { isAbsolutePath, pathBasename, pathDirname, resolvePath } from '@common/util/renderer-path-polyfill'
import type { DocumentManagerIPCAPI, DocumentsUpdateContext } from 'source/app/service-providers/documents'
import type { CiteprocProviderIPCAPI } from 'source/app/service-providers/citeproc'
import type { ProjectInfo } from 'source/common/modules/markdown-editor/plugins/project-info-field'

const ipcRenderer = window.ipc

// This function overwrites the getBibliographyForDescriptor function to ensure
// the library is always absolute. We have to do it this ridiculously since the
// function is called in both main and renderer processes, and we still have the
// issue that path-browserify is entirely unusable.
function getBibliographyForDescriptor (descriptor: MDFileDescriptor): string {
  const library = getBibliography(descriptor)

  if (library !== CITEPROC_MAIN_DB && !isAbsolutePath(library)) {
    return resolvePath(descriptor.dir, library)
  } else {
    return library
  }
}

const props = defineProps<{
  leafId: string
  windowId: string
  activeFile: OpenDocument|null
  editorCommands: EditorCommands
  distractionFree: boolean
  file: OpenDocument
  persistentStateMap: Map<string, EditorViewPersistentState>
}>()

const emit = defineEmits<(e: 'globalSearch', query: string) => void>()

const windowStateStore = useWindowStateStore()
const documentTreeStore = useDocumentTreeStore()
const workspacesStore = useWorkspacesStore()
const configStore = useConfigStore()
const tagStore = useTagsStore()

// UNREFFED STUFF
let currentEditor: MarkdownEditor|null = null

// EVENT LISTENERS
ipcRenderer.on('citeproc-database-updated', (_event, _dbPath: string) => {
  const descriptor = activeFileDescriptor.value

  if (descriptor === undefined || descriptor.type !== 'file') {
    return // Nothing to do
  }

  const library = getBibliographyForDescriptor(descriptor)
  updateCitationKeys(library).catch(e => {
    console.error('Could not update citation keys', e)
  })
})

ipcRenderer.on('shortcut', (event, command) => {
  if (currentEditor?.hasFocusWithin() !== true) {
    return // None of our business
  }

  if (command === 'save-file') {
    // Main is telling us to save, so tell main to save the current file.
    ipcRenderer.invoke('documents-provider', {
      command: 'save-file',
      payload: { path: props.file.path }
    } as DocumentManagerIPCAPI)
      .then(result => {
        if (result !== true) {
          console.error('Retrieved a falsy result from main, indicating an error with saving the file.')
        }
      })
      .catch(e => console.error(e))
  } else if (command === 'search') {
    showSearch.value = !showSearch.value
  } else if (command === 'toggle-typewriter-mode') {
    currentEditor.hasTypewriterMode = !currentEditor.hasTypewriterMode
  } else if (command === 'copy-as-html') {
    currentEditor.copyAsHTML()
  } else if (command === 'paste-as-plain') {
    currentEditor.pasteAsPlainText()
  }
})

ipcRenderer.on('documents-update', (e, payload: { event: DP_EVENTS, context: DocumentsUpdateContext }) => {
  const { event, context } = payload
  if (event === DP_EVENTS.FILE_REMOTELY_CHANGED && context.filePath === props.file.path) {
    // The currently loaded document has been changed remotely. This event indicates
    // that the document provider has already reloaded the document and we only
    // need to tell the main editor to reload it as well.
    currentEditor?.reload().catch(e => console.error(e))
  } else if (event === DP_EVENTS.FILE_SAVED && context.filePath === props.file.path) {
    // The file has been saved to disk. This means we should probably update the
    // descriptor to know of, e.g., library changes.
    ipcRenderer.invoke('application', { command: 'get-descriptor', payload: props.file.path })
      .then((descriptor: MDFileDescriptor|CodeFileDescriptor|undefined) => {
        if (descriptor === undefined) {
          throw new Error(`Could not swap document: Could not retrieve descriptor for path ${props.file.path}!`)
        }

        activeFileDescriptor.value = descriptor
        const library = descriptor.type === 'file' ? getBibliographyForDescriptor(descriptor) : undefined
        if (library !== undefined) {
          updateCitationKeys(library).catch(e => console.error('Could not update citation keys', e))
        }

        // Provide the editor instance with updated metadata
        currentEditor?.setOptions({
          metadata: {
            path: props.file.path,
            id: descriptor.type === 'file' ? descriptor.id : '',
            library: library ?? CITEPROC_MAIN_DB
          }
        })
      })
      .catch(err => console.error(err))
  }
})

ipcRenderer.on('reload-editors', _e => {
  currentEditor?.reload().catch(err => console.error('Failed to reload editor after `reload-editors` event', err))
})

// Update the file database whenever links have been updated
ipcRenderer.on('links', _e => {
  updateFileDatabase().catch(err => console.error('Could not update file database', err))
})

// MOUNTED HOOK
onMounted(() => {
  loadDocument().catch(err => console.error(err))
})

onBeforeUnmount(() => {
  if (currentEditor !== null) {
    props.persistentStateMap.set(props.file.path, currentEditor.persistentState)
    currentEditor.unmount()
  }
})

onUpdated(() => {
  // We hook into the onUpdated lifecycle event since that will fire when the
  // data for this component update, which includes visibility with the v-show
  // directive. In case that the editor component is mounted and non-hidden, we
  // will fire
  if (currentEditor === null) {
    return
  }

  const currentFilePath = currentEditor.documentPath
  if (currentFilePath !== props.activeFile?.path) {
    // File path has changed -> unmount and remount (duplicate code from
    // onMounted and onBeforeUnmount hooks).
    props.persistentStateMap.set(currentFilePath, currentEditor.persistentState)
    currentEditor.unmount()
    loadDocument().catch(err => console.error(err))
  }

  if (!currentEditor.hasFocus()) {
    currentEditor.focus()
  }
})

// DATA SETUP
const showSearch = ref(false)
const mainEditorWrapper = ref<HTMLDivElement|null>(null)

// COMPUTED PROPERTIES
const useH1 = computed<boolean>(() => configStore.config.fileNameDisplay.includes('heading'))
const useTitle = computed<boolean>(() => configStore.config.fileNameDisplay.includes('title'))
const filenameOnly = computed<boolean>(() => configStore.config.zkn.linkFilenameOnly)
const fontSize = computed<number>(() => configStore.config.editor.fontSize)
const globalSearchResults = computed(() => windowStateStore.searchResults)
const snippets = computed(() => windowStateStore.snippets)
const tags = computed(() => tagStore.tags)
const isMarkdown = computed(() => hasMarkdownExt(props.file.path))

const activeFileDescriptor = ref<undefined|MDFileDescriptor|CodeFileDescriptor>(undefined)

const editorConfiguration = computed<EditorConfigOptions>(() => {
  // We update everything, because not so many values are actually updated
  // right after setting the new configurations. Plus, the user won't update
  // everything all the time, but rather do one initial configuration, so
  // even if we incur a performance penalty, it won't be noticed that much.
  const { editor, display, zkn, darkMode } = configStore.config
  return {
    indentUnit: editor.indentUnit,
    indentWithTabs: editor.indentWithTabs,
    autoCloseBrackets: editor.autoCloseBrackets,
    autocorrect: {
      active: editor.autoCorrect.active,
      matchWholeWords: editor.autoCorrect.matchWholeWords,
      magicQuotes: {
        primary: editor.autoCorrect.magicQuotes.primary,
        secondary: editor.autoCorrect.magicQuotes.secondary
      },
      replacements: editor.autoCorrect.replacements
    },
    autocompleteSuggestEmojis: editor.autocompleteSuggestEmojis,
    imagePreviewWidth: display.imageWidth,
    imagePreviewHeight: display.imageHeight,
    boldFormatting: editor.boldFormatting,
    italicFormatting: editor.italicFormatting,
    muteLines: configStore.config.muteLines,
    citeStyle: editor.citeStyle,
    readabilityAlgorithm: editor.readabilityAlgorithm,
    idRE: zkn.idRE,
    idGen: zkn.idGen,
    renderCitations: display.renderCitations,
    renderingMode: display.renderingMode,
    renderIframes: display.renderIframes,
    renderImages: display.renderImages,
    renderLinks: display.renderLinks,
    renderMath: display.renderMath,
    renderTasks: display.renderTasks,
    renderHeadings: display.renderHTags,
    renderTables: editor.enableTableHelper,
    renderEmphasis: display.renderEmphasis,
    linkPreference: zkn.linkWithFilename,
    zknLinkFormat: zkn.linkFormat,
    linkFilenameOnly: zkn.linkFilenameOnly,
    inputMode: editor.inputMode,
    lintMarkdown: editor.lint.markdown,
    // The editor only needs to know if it should use languageTool
    lintLanguageTool: editor.lint.languageTool.active,
    distractionFree: props.distractionFree.valueOf(),
    showStatusbar: editor.showStatusbar,
    showFormattingToolbar: editor.showFormattingToolbar,
    darkMode,
    theme: display.theme,
    highlightWhitespace: editor.showWhitespace,
    showMarkdownLineNumbers: editor.showMarkdownLineNumbers,
    countChars: editor.countChars
  } satisfies EditorConfigOptions
})

// BEGIN: PROJECT INFO
function updateProjectInfo (): ProjectInfo|null {
  // If this file is part of a project, the project must be defined in any
  // containing folder -> traverse up the file tree until we have found one.
  let dir = workspacesStore.getDir(pathDirname(props.file.path))
  while (dir !== undefined && dir.settings.project === null) {
    dir = workspacesStore.getDir(dir.dir)
  }

  if (dir === undefined || dir.settings.project === null) {
    return null // No project found in the tree
  }

  // Check if this file is part of the project.
  const absPaths = dir.settings.project.files.map(p => resolvePath(dir.path, p))
  if (!absPaths.includes(props.file.path)) {
    return null
  }

  const extractedMetadata = absPaths
    .map(p => {
      return workspacesStore.getFile(p)
    })
    .filter (d => d !== undefined && d.type === 'file')
    .map(d => {
      return {
        wordCount: d.wordCount,
        charCount: d.charCount,
        path: d.path,
        displayName: d.yamlTitle ?? d.firstHeading ?? d.name
      }
    })

  // It is! So now we can return the proper project info.
  return {
    name: dir.settings.project.title,
    files: extractedMetadata
      .map(p => ({ path: p.path, displayName: p.displayName })),
    wordCount: extractedMetadata
      .map(p => p.wordCount)
      .reduce((p, c) => p + c, 0),
    charCount: extractedMetadata
      .map(p => p.charCount)
      .reduce((p, c) => p + c, 0)
  }
}

// Update the project info as soon as anything in the workspaces has changed.
workspacesStore.$subscribe(_mutation => {
  if (currentEditor !== null) {
    currentEditor.projectInfo = updateProjectInfo()
  }
})
// END: PROJECT INFO

// External commands/"event" system
watch(toRef(props.editorCommands, 'jumpToLine'), () => {
  const { filePath, lineNumber } = props.editorCommands.data
  // Execute a jtl-command if the current displayed file is the correct one
  if (filePath === props.file.path && typeof lineNumber === 'number') {
    jtl(lineNumber)
  }
})

watch(toRef(props.editorCommands, 'moveSection'), () => {
  if (props.activeFile?.path !== props.file.path || documentTreeStore.lastLeafId !== props.leafId) {
    return
  }

  const { from, to } = props.editorCommands.data
  if (typeof from === 'number' && typeof to === 'number') {
    currentEditor?.moveSection(from, to)
  }
})

watch(toRef(props.editorCommands, 'readabilityMode'), () => {
  if (currentEditor === null || props.activeFile?.path !== props.file.path) {
    return
  }

  currentEditor.readabilityMode = !currentEditor.readabilityMode
})

watch(toRef(props, 'distractionFree'), () => {
  if (currentEditor !== null && props.activeFile?.path === props.file.path && documentTreeStore.lastLeafId === props.leafId) {
    currentEditor.distractionFree = props.distractionFree
  }
})

watch(toRef(props.editorCommands, 'executeCommand'), () => {
  if (props.activeFile?.path !== props.file.path || currentEditor === null) {
    return
  }

  if (documentTreeStore.lastLeafId !== props.leafId) {
    // This editor, even though it may be focused, was not the last focused
    // See https://github.com/Zettlr/Zettlr/issues/4361
    return
  }

  const command: string = props.editorCommands.data
  currentEditor.runCommand(command)
  currentEditor.focus()
})

watch(toRef(props.editorCommands, 'replaceSelection'), () => {
  if (props.activeFile?.path !== props.file.path) {
    return
  }

  if (documentTreeStore.lastLeafId !== props.leafId) {
    // This editor, even though it may be focused, was not the last focused
    // See https://github.com/Zettlr/Zettlr/issues/4361
    return
  }

  const textToInsert: string = props.editorCommands.data
  currentEditor?.replaceSelection(textToInsert)
})

const fsalFiles = computed<MDFileDescriptor[]>(() => {
  const tree = workspacesStore.rootDescriptors
  const files = []

  for (const item of tree) {
    if (item.type === 'directory') {
      const contents = objectToArray<AnyDescriptor>(item, 'children')
        .filter((descriptor): descriptor is MDFileDescriptor => {
          return descriptor.type === 'file'
        })
      files.push(...contents)
    } else if (item.type === 'file') {
      files.push(item)
    }
  }

  return files
})

// WATCHERS
watch(useH1, () => { updateFileDatabase().catch(err => console.error('Could not update file database', err)) })
watch(useTitle, () => { updateFileDatabase().catch(err => console.error('Could not update file database', err)) })
watch(filenameOnly, () => { updateFileDatabase().catch(err => console.error('Could not update file database', err)) })
watch(fsalFiles, () => { updateFileDatabase().catch(err => console.error('Could not update file database', err)) })

watch(editorConfiguration, (newValue) => {
  currentEditor?.setOptions(newValue)
})

watch(globalSearchResults, () => {
  // TODO: I don't like that we need a timeout here.
  setTimeout(maybeHighlightSearchResults, 200)
})

watch(snippets, (newValue) => {
  currentEditor?.setCompletionDatabase('snippets', newValue)
})

watch(tags, (newValue) => {
  currentEditor?.setCompletionDatabase('tags', newValue)
})

// METHODS
/**
 * Returns a MarkdownEditor for the provided path.
 *
 * @param   {string}          doc  The document to load
 *
 * @return  {MarkdownEditor}       The requested editor
 */
async function getEditorFor (doc: string): Promise<MarkdownEditor> {
  const persistentState = props.persistentStateMap.get(doc)
  const editor = new MarkdownEditor(props.leafId, props.windowId, doc, documentAuthorityIPCAPI, undefined, persistentState)

  // Update the document info on corresponding events
  editor.on('change', () => {
    if (currentEditor === editor) {
      windowStateStore.tableOfContents = currentEditor.tableOfContents
    }
  })

  editor.on('cursorActivity', () => {
    if (currentEditor === editor) {
      windowStateStore.activeDocumentInfo = currentEditor.documentInfo
    }
  })

  editor.on('focus', () => {
    ipcRenderer.invoke('documents-provider', {
      command: 'focus-leaf',
      payload: {
        leafId: props.leafId,
        windowId: props.windowId
      }
    } as DocumentManagerIPCAPI).catch(err => console.error(err))

    // NOTE: The lastLeafId will be changed in the documentTreeStore in response
    // to an event from main (DP_EVENTS.ACTIVE_FILE) which will be emitted as a
    // result of our focus-leaf event above.
    if (currentEditor === editor) {
      windowStateStore.tableOfContents = currentEditor.tableOfContents
    }
  })

  editor.on('zettelkasten-link', (linkContents: string) => {
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

    if (configStore.config.zkn.autoSearch) {
      emit('globalSearch', linkContents)
    }
  })

  editor.on('zettelkasten-tag', (tag: string) => {
    emit('globalSearch', tag)
  })

  // Supply the configuration object once initially
  editor.setOptions(editorConfiguration.value)
  return editor
}

/**
 * Loads the document for this editor instance.
 */
async function loadDocument (): Promise<void> {
  const newEditor = await getEditorFor(props.file.path)

  mainEditorWrapper.value?.appendChild(newEditor.dom)
  currentEditor = newEditor

  windowStateStore.tableOfContents = currentEditor.tableOfContents
  windowStateStore.activeDocumentInfo = currentEditor.documentInfo

  currentEditor.setCompletionDatabase('tags', tags.value)
  currentEditor.setCompletionDatabase('snippets', snippets.value)

  maybeHighlightSearchResults()

  const descriptor: MDFileDescriptor|CodeFileDescriptor|undefined = await ipcRenderer.invoke('application', { command: 'get-descriptor', payload: props.file.path })
  if (descriptor === undefined) {
    throw new Error(`Could not swap document: Could not retrieve descriptor for path ${props.file.path}!`)
  }

  activeFileDescriptor.value = descriptor

  const library = descriptor.type === 'file' ? getBibliographyForDescriptor(descriptor) : undefined
  if (library !== undefined) {
    updateCitationKeys(library).catch(e => console.error('Could not update citation keys', e))
  }

  // Provide the editor instance with metadata for the new file
  currentEditor.setOptions({
    metadata: {
      path: props.file.path,
      id: descriptor.type === 'file' ? descriptor.id : '',
      library: library ?? CITEPROC_MAIN_DB
    }
  })
  currentEditor.projectInfo = updateProjectInfo()
}

function jtl (lineNumber: number): void {
  currentEditor?.jtl(lineNumber)
}

async function updateCitationKeys (library: string): Promise<void> {
  const items: Array<{ citekey: string, displayText: string }> = (await ipcRenderer.invoke('citeproc-provider', {
    command: 'get-items',
    payload: { database: library }
  } as CiteprocProviderIPCAPI))
    .map((item: any) => {
      // Get a rudimentary author list. Precedence are authors, then editors.
      // Fallback: Container title.
      let authors = ''
      const authorSrc = item.author !== undefined
        ? item.author
        : item.editor !== undefined ? item.editor : []

      if (authorSrc.length > 0) {
        authors = authorSrc.map((author: any) => {
          if (author.family !== undefined) {
            return author.family
          } else if (author.literal !== undefined) {
            return author.literal
          } else {
            return undefined
          }
        }).filter((elem: any) => elem !== undefined).join(', ')
      } else if (item['container-title'] !== undefined) {
        authors = item['container-title']
      }

      let title = ''
      if (item.title !== undefined) {
        title = item.title
      } else if (item['container-title'] !== undefined) {
        title = item['container-title']
      }

      let date = ''
      if (item.issued !== undefined) {
        if ('date-parts' in item.issued) {
          const year = item.issued['date-parts'][0][0]
          date = ` (${year})`
        } else if ('literal' in item.issued) {
          date = ` (${item.issued.literal})`
        }
      }

      // This is just a very crude representation of the citations.
      return {
        citekey: item.id,
        displayText: `${authors}${date} - ${title}`
      }
    })

  currentEditor?.setCompletionDatabase('citations', items)
}

async function updateFileDatabase (): Promise<void> {
  // Get all our files ...
  const fileDatabase: Array<{ filename: string, displayName: string, id: string }> = []

  // ... and the unique links that are part of the link database
  const rawLinks: Record<string, string[]> = await ipcRenderer.invoke('link-provider', { command: 'get-link-database' })
  const linkDatabase = [...new Set(Object.values(rawLinks).flat())]

  // First, add all existing files to the database ...
  for (const file of fsalFiles.value) {
    let displayName = pathBasename(file.name, file.ext)
    if (useTitle.value && file.yamlTitle !== undefined) {
      displayName = file.yamlTitle
    } else if (useH1.value && file.firstHeading !== null) {
      displayName = file.firstHeading
    }
    fileDatabase.push({
      filename: pathBasename(file.name, file.ext),
      displayName,
      id: file.id
    })
  }

  // ... before going through the link database to add those links that link to
  // not yet existing files
  for (const link of linkDatabase) {
    const existingFile = fileDatabase.find(file => file.filename === link || file.id === link)
    if (existingFile === undefined) {
      fileDatabase.push({ filename: link, displayName: link, id: '' })
    }
  }

  currentEditor?.setCompletionDatabase('files', fileDatabase)
}

function maybeHighlightSearchResults (): void {
  if (currentEditor === null) {
    return
  }

  const result = globalSearchResults.value.find(r => r.file.path === props.file.path)
  if (result === undefined) {
    currentEditor.highlightRanges([])
    return
  }

  // Construct CodeMirror.Ranges from the results
  const rangesToHighlight = []
  // NOTE: We have to filter out "whole-file" results
  for (const res of result.result.filter(res => res.line > -1)) {
    const startIdx = currentEditor.instance.state.doc.line(res.line + 1).from
    for (const range of res.ranges) {
      const { from, to } = range
      rangesToHighlight.push(EditorSelection.range(startIdx + from, startIdx + to))
    }
  }
  currentEditor.highlightRanges(rangesToHighlight)
}

</script>

<style lang="less">
// Editor Geometry

// Editor margins left and right for all breakpoints in both fullscreen and
// normal mode.
@editor-margin-fullscreen-sm:  50px;
@editor-margin-fullscreen-md:   5vw;
@editor-margin-fullscreen-lg:  10vw;
@editor-margin-fullscreen-xl:  20vw;
@editor-margin-fullscreen-xxl: 30vw;

.main-editor-wrapper {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: #ffffff;
  transition: 0.2s background-color ease;
  position: relative;

  .cm-editor {
    .cm-scroller { padding: 50px 50px; }

    .code { // BEGIN: CODE BLOCK/FILE THEME
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
      font-family: Inconsolata, monospace;

      .cm-string         { color: @green; }
      .cm-keyword        { color: @green; }
      .cm-atom           { color: @violet; }
      .cm-tag-name,
      .cm-modifier       { color: @cyan; }
      .cm-qualifier      { color: @blue; }
      .cm-builtin        { color: @blue; }
      .cm-variable-name  { color: @cyan; }
      .cm-variable       { color: @cyan; }
      .cm-comment        { color: @base1; }
      .cm-attribute-name { color: @orange; }
      .cm-property       { color: @magenta; }
      .cm-keyword,
      .cm-name,
      .cm-type-name      { color: @yellow; }
      .cm-number         { color: @violet; }
      .cm-property-name  { color: @blue; }
      .cm-deleted        { color: @orange; }
      .cm-changed        { color: @yellow; }
      .cm-inserted       { color: @green; }
      .cm-positive       { color: @green; }
      .cm-negative       { color: @red; }
      .cm-meta           { color: @violet; }
    } // END: Solarized code theme
  }

  // If a code file is loaded, we need to display the editor contents in monospace.
  &.code-file .cm-editor {
    font-family: Inconsolata, monospace;

    // Reset the margins for code files
    .cm-scroller { padding: 0px; }
  }

  .cm-content {
    overflow-x: hidden !important; // Necessary to hide the horizontal scrollbar
  }
}

body.dark .main-editor-wrapper {
  background-color: rgba(20, 20, 30, 1);
  .CodeMirror .CodeMirror-gutters { background-color: rgba(20, 20, 30, 1); }

  //Ellipsis (...) When a header is folded
  .cm-foldPlaceholder{
      background-color: rgb(20, 20, 30);
      border-style: none;
    }
}

// CodeMirror fullscreen
.main-editor-wrapper.fullscreen {
  // This makes the editor pane show "fullscreen" on top over the rest of the UI
  // except the toolbar (due to a position: relative on the window content div).
  position: absolute;
  top: 0;

  .cm-scroller {
    @media(min-width: 1301px) { padding: 0 @editor-margin-fullscreen-xxl; }
    @media(max-width: 1300px) { padding: 0 @editor-margin-fullscreen-xl; }
    @media(max-width: 1100px) { padding: 0 @editor-margin-fullscreen-lg; }
    @media(max-width: 1000px) { padding: 0 @editor-margin-fullscreen-md; }
    @media(max-width:  800px) { padding: 0 @editor-margin-fullscreen-sm; }

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

</style>
