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

//Initialize mermaid without a global theme
mermaid.initialize({ startOnLoad: false })

//Helper function to detect if a diagram has theme configuration
const hasThemeConfig = (graphData: string): boolean => {
  //Check for theme directive in various formats
  const themePatterns = [
    /%%{.*theme.*}%%/i,           // %%{theme: 'dark'}%%
    /%%{.*config.*theme.*}%%/i,   // %%{config: {theme: 'dark'}}%%
    /%% theme:/i,                 // %% theme: dark
    /theme\s*:/i                  // theme: dark (in config blocks)
  ]
  
  return themePatterns.some(pattern => pattern.test(graphData))
}

//Helper function to get the fallback theme based on Zettlr's mode
const getFallbackTheme = (): 'dark' | 'default' => {
  const isDarkMode = window.config.get('darkMode') as boolean
  return isDarkMode ? 'dark' : 'default'
}

//Helper function to render with appropriate theme
const renderWithTheme = async (id: string, graphData: string): Promise<{ svg: string }> => {
  if (hasThemeConfig(graphData)) {
    //Diagram has its own theme config, render as-is
    console.log('Diagram has theme config, using diagram-specified theme')
    return await mermaid.render(id, graphData)
  } else {
    //No theme config in diagram, apply Zettlr's theme
    const fallbackTheme = getFallbackTheme()
    console.log('No theme config in diagram, using fallback theme:', fallbackTheme)
    
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
    console.log('Dark mode config changed, updating Mermaid charts without theme overrides')
    
    //Force re-render of existing mermaid charts
    const existingCharts = document.querySelectorAll('.mermaid-chart')
    console.log(`Found ${existingCharts.length} existing charts to update`)
    
    existingCharts.forEach((chart, index) => {
      const chartElement = chart as HTMLElement
      const graphData = chartElement.dataset.graph
      
      if (graphData != null && graphData !== '') {
        console.log(`Re-rendering chart ${index + 1}`)
        const id = `graphDiv${Date.now()}_${index}`
        chartElement.textContent = trans('Rendering mermaid graph …')
        
        renderWithTheme(id, graphData)
          .then(result => { 
            chartElement.innerHTML = result.svg 
            console.log(`Chart ${index + 1} re-rendered successfully`)
          })
          .catch(err => {
            chartElement.classList.add('error')
            const msg = trans('Could not render Graph:')
            chartElement.textContent = `${msg}\n\n${err.str as string}`
            console.error(`Error re-rendering chart ${index + 1}:`, err)
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

    const id = `graphDiv${Date.now()}`
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

    const id = `graphDiv${Date.now()}`
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
