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
import { configField } from '../util/configuration'
import type { FindFileAndReturnMetadataResult } from 'source/app/service-providers/commands/file-find-and-return-meta-data'
import { pathDirname } from 'source/common/util/renderer-path-polyfill'
import makeValidUri from 'source/common/util/make-valid-uri'
import type { ForceOpenAPI } from 'source/app/service-providers/commands/force-open'

const ipcRenderer = window.ipc

// Previews files with tooltips
async function filePreviewTooltip (view: EditorView, pos: number, side: 1 | -1): Promise<Tooltip|null> {
  const nodeAt = syntaxTree(view.state).resolve(pos, side)

  if (![ 'ZknLinkContent', 'ZknLinkPipe', 'ZknLink', 'ZknLinkTitle' ].includes(nodeAt.type.name)) {
    return null
  }

  const wrapperNode = nodeAt.type.name === 'ZknLink' ? nodeAt : nodeAt.parent
  const contentNode = wrapperNode?.getChild('ZknLinkContent')

  if (contentNode == null) {
    return null
  }

  const fileToDisplay = view.state.sliceDoc(contentNode.from, contentNode.to)

  const res: FindFileAndReturnMetadataResult|undefined = await ipcRenderer.invoke(
    'application',
    { command: 'file-find-and-return-meta-data', payload: fileToDisplay }
  )

  const { zknLinkFormat } = view.state.field(configField)

  // By annotating a range (providing `end`) the hover tooltip will stay as long
  // as the user is somewhere over the links
  return {
    pos: nodeAt.from,
    end: nodeAt.to,
    above: true,
    create (_view) {
      if (res !== undefined) {
        return { dom: getPreviewElement(res, fileToDisplay, zknLinkFormat) }
      } else {
        const dom = document.createElement('div')
        const filename = fileToDisplay.includes('#') ? fileToDisplay.slice(0, fileToDisplay.indexOf('#')) : fileToDisplay
        dom.textContent = trans('File %s does not exist.', filename)
        return { dom }
      }
    }
  }
}

/**
 * Generates the full wrapper element for displaying file information in a
 * tippy tooltip.
 *
 * @param   {FindFileAndReturnMetadataResult}  metadata      The note metadata
 * @param   {string}                           linkContents  The link contents
 *                                                        (used for navigation)
 *
 * @return  {Element}                                        The wrapper element
 */
function getPreviewElement (metadata: FindFileAndReturnMetadataResult, linkContents: string, zknLinkFormat: 'link|title'|'title|link'): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.classList.add('editor-note-preview')

  const title = document.createElement('p')
  title.classList.add('filename')
  title.textContent = metadata.title

  const content = document.createElement('div')
  content.classList.add('note-content')

  // basePath is needed to convert any relative URLs into absolute ones
  const basePath = pathDirname(metadata.filePath)
  const html = md2html(
    metadata.previewMarkdown,
    window.getCitationCallback(CITEPROC_MAIN_DB),
    zknLinkFormat,
    {
      // Convert the image links to absolute (if necessary)
      onImageSrc (src) {
        const isDataUrl = /^data:[a-zA-Z0-9/;=]+(?:;base64){0,1},.+/.test(src)
        if (isDataUrl) {
          return src
        } else {
          return makeValidUri(src, basePath)
        }
      }
    }
  )

  content.innerHTML = sanitizeHtml(html, {
    // These options basically translate into: Allow nothing but bare metal tags
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    disallowedTagsMode: 'escape',
    allowedIframeDomains: [],
    allowedIframeHostnames: [],
    allowedScriptDomains: [],
    allowedSchemes: sanitizeHtml.defaults.allowedSchemes.concat(['safe-file']),
    allowedScriptHostnames: [],
    allowVulnerableTags: false
  })

  const meta = document.createElement('div')
  meta.classList.add('metadata')
  meta.innerHTML = `${trans('Word count')}: ${metadata.wordCount}`
  meta.innerHTML += '<br>'
  meta.innerHTML += `${trans('Modified')}: ${formatDate(metadata.modtime, window.config.get('appLang') as string)}`

  const actions = document.createElement('div')
  actions.classList.add('actions')

  const openFunc = function (): void {
    ipcRenderer.invoke('application', {
      command: 'force-open',
      payload: {
        linkContents,
        newTab: undefined // let open-file command decide based on preferences
      } as ForceOpenAPI
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
