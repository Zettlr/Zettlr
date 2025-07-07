/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        MermaidRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer displays mermaid graphs.
 *
 * END HEADER
 */

import { renderBlockWidgets } from './base-renderer'
import { type SyntaxNode, type SyntaxNodeRef } from '@lezer/common'
import { WidgetType, type EditorView } from '@codemirror/view'

import mermaid from 'mermaid'
import { type EditorState } from '@codemirror/state'
import clickAndSelect from './click-and-select'
import { trans } from '@common/i18n-renderer'
import hash from '../../../util/hash'


//Helper function to generate unique IDs using hash
function generateUniqueId (content: string): string {
  return `graphDiv_${Math.abs(hash(content)).toString(36)}`
}

//Initialize mermaid without a global theme
mermaid.initialize({ startOnLoad: false })

//Helper function to detect if a diagram has theme configuration
/**
 * Detects if a graph has theme configuration embedded in its content
 * @param graphData The mermaid diagram content to check
 * @returns True if the diagram contains theme configuration
 */
function hasThemeConfig (graphData: string): boolean {
  //Check for theme directive in various formats
  const themePatterns = [
    /%%\{[^}]*(['"]?\btheme\b['"]?)\s*:/i,  // 'theme': or "theme": or theme: inside %%{ ... }%%
    /%%\s*theme\s*:/i,                      // %% theme: dark
    /^[ \t]*theme\s*:/im                    // theme: dark (anywhere at line start, multiline)
  ]
  return themePatterns.some(pattern => pattern.test(graphData))
}

//Helper function to get the fallback theme based on Zettlr's mode
/**
 * Gets the fallback theme based on Zettlr's current dark mode setting
 * @returns The appropriate theme name for mermaid
 */
function getFallbackTheme (): 'dark' | 'default' {
  const isDarkMode = window.config.get('darkMode') as boolean
  return isDarkMode ? 'dark' : 'default'
}

//Helper function to render with appropriate theme
/**
 * Renders a mermaid diagram with appropriate theme handling
 * @param id Unique identifier for the diagram
 * @param graphData The mermaid diagram content
 * @returns Promise resolving to the rendered SVG
 */
async function renderWithTheme (id: string, graphData: string): Promise<{ svg: string }> {
  if (hasThemeConfig(graphData)) {
    //Diagram has its own theme config, render as-is
    return await mermaid.render(id, graphData)
  } else {
    //No theme config in diagram, apply Zettlr's theme
    const fallbackTheme = getFallbackTheme()
    //Temporarily reinitialize with the fallback theme
    mermaid.initialize({ startOnLoad: false, theme: fallbackTheme })
    
    try {
      const result = await mermaid.render(id, graphData)
      //Reset to no theme after rendering
      mermaid.initialize({ startOnLoad: false })
      return result
    } catch (error) {
      //Reset to no theme even on error
      mermaid.initialize({ startOnLoad: false })
      throw error
    }
  }
}

//Listen for theme changes via IPC
const ipcRenderer = window.ipc
ipcRenderer.on('config-provider', (event, { command, payload }) => {
  if (command === 'update' && payload === 'darkMode') {
    //Force re-render of existing mermaid charts
    const existingCharts = document.querySelectorAll('.mermaid-chart')
    
    existingCharts.forEach((chart) => {
      const chartElement = chart as HTMLElement
      const graphData = chartElement.dataset.graph
      
      if (graphData  != null && graphData !== '') {
        const id = generateUniqueId(graphData)
        chartElement.textContent = trans('Rendering mermaid graph …')
              
        renderWithTheme(id, graphData)
          .then(result => { 
            chartElement.innerHTML = result.svg 
          })
          .catch(err => {
            chartElement.classList.add('error')
            const msg = trans('Could not render Graph:')
            chartElement.textContent = `${msg}\n\n${err.str as string}`
          })
      }
    })
  }
})

class MermaidWidget extends WidgetType {
  constructor (readonly graph: string, readonly node: SyntaxNode, readonly darkMode: boolean) {
    super()
  }

  eq (other: MermaidWidget): boolean {
    return other.graph === this.graph &&
      other.node.from === this.node.from &&
      other.node.to === this.node.to &&
      this.darkMode === other.darkMode
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('span')
    elem.classList.add('mermaid-chart')
    elem.dataset.graph = this.graph
    elem.dataset.darkTheme = String(this.darkMode)

    const id = generateUniqueId(this.graph)
    elem.innerText = trans('Rendering mermaid graph …')
    renderWithTheme(id, this.graph)
      .then(result => { elem.innerHTML = result.svg })
      .catch(err => {
        elem.classList.add('error')
        const msg = trans('Could not render Graph:')
        elem.innerText = `${msg}\n\n${err.str as string}`
      })

    elem.addEventListener('click', clickAndSelect(view))
    return elem
  }

  updateDOM (dom: HTMLElement, _view: EditorView): boolean {
    if (dom.dataset.graph === this.graph && dom.dataset.darkTheme === String(this.darkMode)) {
      return true // No update necessary
    }

    const id = generateUniqueId(this.graph)
    dom.innerText = trans('Rendering mermaid graph …')
    renderWithTheme(id, this.graph)
      .then(result => { dom.innerHTML = result.svg })
      .catch(err => {
        dom.classList.add('error')
        const msg = trans('Could not render Graph:')
        dom.innerText = `${msg}\n\n${err.str as string}`
      })

    return true
  }

  ignoreEvent (event: Event): boolean {
    return false // By default ignore all events
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  // This parser should look for FencedCode with a CodeInfo string of at least 7
  if (node.type.name !== 'FencedCode') {
    return false
  }

  // We've got some code. Ensure we have an info string
  const codeInfo = node.node.getChild('CodeInfo')
  if (codeInfo === null) {
    return false
  }

  // The span needs to be at least 7 characters (= `mermaid`) long, but may be
  // longer (to account for, e.g., Pandoc fenced attributes)
  if (codeInfo.to - codeInfo.from < 7) {
    return false
  }

  return true
}

function createWidget (state: EditorState, node: SyntaxNodeRef): MermaidWidget|undefined {
  // This function is called after the `shouldHandleNode` function, so we can
  // disregard its checks here.
  const codeInfo = node.node.getChild('CodeInfo')!
  const infoString = state.sliceDoc(codeInfo.from, codeInfo.to)

  // The infostring can either be plain "mermaid" or a Pandoc attribute string
  // that includes the class `.mermaid` (see the Pandoc manual:
  // https://pandoc.org/MANUAL.html#extension-fenced_code_attributes)
  if (infoString !== 'mermaid' && !/^{.*\.mermaid.*}$/i.test(infoString)) {
    return undefined
  }

  const codeText = node.node.getChild('CodeText')

  if (codeText === null) {
    return undefined
  }

  const graph = state.sliceDoc(codeText.from, codeText.to)

  // NOTE: We have to pass the current value of the darkMode config value to
  // see in what mode the mermaid graph has actually been rendered to re-render
  // the graph if necessary
  return new MermaidWidget(graph, node.node, window.config.get('darkMode') as boolean)
}

export const renderMermaid = renderBlockWidgets(shouldHandleNode, createWidget)

