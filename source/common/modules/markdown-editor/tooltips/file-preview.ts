/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File Preview tooltip
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This extension displays a file preview on Zettelkasten-link
 *                  hover.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import { hoverTooltip, EditorView, type Tooltip } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import { md2html } from '@common/modules/markdown-utils/markdown-to-html'
import formatDate from '@common/util/format-date'
import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import sanitizeHtml from 'sanitize-html'

const ipcRenderer = window.ipc

// [ file.name, preview, file.wordCount, file.modtime ]
type IpcResult = undefined|[string, string, number, number]

// Previews files with tooltips
async function filePreviewTooltip (view: EditorView, pos: number, side: 1 | -1): Promise<Tooltip|null> {
  const nodeAt = syntaxTree(view.state).resolve(pos, side)

  if (nodeAt.type.name !== 'ZknLinkContent') {
    return null
  }

  const fileToDisplay = view.state.sliceDoc(nodeAt.from, nodeAt.to)

  const res: IpcResult = await ipcRenderer.invoke(
    'application',
    { command: 'file-find-and-return-meta-data', payload: fileToDisplay }
  )

  // By annotating a range (providing `end`) the hover tooltip will stay as long
  // as the user is somewhere over the links
  return {
    pos: nodeAt.from,
    end: nodeAt.to,
    above: true,
    create (view) {
      if (res !== undefined) {
        return { dom: getPreviewElement(res, fileToDisplay) }
      } else {
        const dom = document.createElement('div')
        dom.textContent = trans('File %s does not exist.', fileToDisplay)
        return { dom }
      }
    }
  }
}

/**
 * Generates the full wrapper element for displaying file information in a
 * tippy tooltip.
 *
 * @param   {string[]}  metadata      The note metadata
 * @param   {string}    linkContents  The link contents (used for navigation)
 *
 * @return  {Element}                 The wrapper element
 */
function getPreviewElement (metadata: [string, string, number, number], linkContents: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.classList.add('editor-note-preview')

  const title = document.createElement('p')
  title.classList.add('filename')
  title.textContent = metadata[0]

  const content = document.createElement('div')
  content.classList.add('note-content')
  const html = md2html(metadata[1], window.getCitationCallback(CITEPROC_MAIN_DB))
  content.innerHTML = sanitizeHtml(html, {
    // These options basically translate into: Allow nothing but bare metal tags
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    disallowedTagsMode: 'escape',
    allowedIframeDomains: [],
    allowedIframeHostnames: [],
    allowedScriptDomains: [],
    allowedSchemes: [],
    allowedScriptHostnames: [],
    allowVulnerableTags: false
  })

  const meta = document.createElement('div')
  meta.classList.add('metadata')
  meta.innerHTML = `${trans('Word count')}: ${metadata[2]}`
  meta.innerHTML += '<br>'
  meta.innerHTML += `${trans('Modified')}: ${formatDate(metadata[3], window.config.get('appLang'))}`

  const actions = document.createElement('div')
  actions.classList.add('actions')

  const openFunc = function (): void {
    ipcRenderer.invoke('application', {
      command: 'force-open',
      payload: {
        linkContents,
        newTab: undefined // let open-file command decide based on preferences
      }
    })
      .catch(err => console.error(err))
  }

  const openButton = document.createElement('button')
  openButton.setAttribute('id', 'open-note')
  openButton.textContent = trans('Open…').replace('\u2026', '') // remove "...", if any
  openButton.addEventListener('click', openFunc)
  actions.appendChild(openButton)

  // Only if preference "Avoid New Tabs" is set,
  // offer an additional button on preview tooltip
  // to open the file in a new tab
  if (window.config.get('system.avoidNewTabs') === true) {
    const openFuncNewTab = function (): void {
      ipcRenderer.invoke('application', {
        command: 'force-open',
        payload: {
          linkContents,
          newTab: true
        }
      })
        .catch(err => console.error(err))
    }

    const openButtonNT = document.createElement('button')
    openButtonNT.setAttribute('id', 'open-note-new-tab')
    openButtonNT.textContent = trans('Open in a new tab')
    openButtonNT.addEventListener('click', openFuncNewTab)
    openButtonNT.style.marginLeft = '10px'
    actions.appendChild(openButtonNT)
  }

  wrapper.appendChild(title)
  wrapper.appendChild(document.createElement('hr'))
  wrapper.appendChild(content)
  wrapper.appendChild(document.createElement('hr'))
  wrapper.appendChild(meta)
  wrapper.appendChild(actions)

  return wrapper
}

export const filePreview = [
  hoverTooltip(filePreviewTooltip, { hoverTime: 100 }),
  // Provide basic styles for these tooltips
  EditorView.baseTheme({
    '.editor-note-preview': {
      maxWidth: '300px',
      padding: '5px',
      fontSize: '80%'
    },
    '.editor-note-preview h1': { fontSize: '100%' },
    '.editor-note-preview h2': { fontSize: '95%' },
    '.editor-note-preview h3': { fontSize: '90%' },
    '.editor-note-preview h4': { fontSize: '80%' },
    '.editor-note-preview h5': { fontSize: '70%' },
    '.editor-note-preview h6': { fontSize: '70%' },
    '.editor-note-preview .note-content': { margin: '10px 0' },
    '.editor-note-preview .metadata': {
      color: 'rgb(200, 200, 200)',
      fontSize: '80%'
    },
    '.editor-note-preview .actions': {
      margin: '5px 0'
    }
  })
]
