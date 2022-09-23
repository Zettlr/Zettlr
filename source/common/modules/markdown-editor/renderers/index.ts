import { Compartment, Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { renderHeadings } from './render-headings'
import { renderImages } from './render-images'
import { renderLinks } from './render-links'
import { renderMath } from './render-math'
import { renderTasks } from './render-tasks'
import { renderCitations } from './render-citations'
import { renderMermaid } from './render-mermaid'
import { renderTables } from './render-tables'

const renderCompartment = new Compartment()

interface RendererConfig {
  renderImages?: boolean
  renderLinks?: boolean
  renderMath?: boolean
  renderTasks?: boolean
  renderHeadings?: boolean
  renderCitations?: boolean
  renderMermaid?: boolean
  renderTables?: boolean
}

function getRenderersConf (config: RendererConfig): Extension {
  const ext = []
  if (config.renderImages === true) {
    ext.push(renderImages)
  }
  if (config.renderLinks === true) {
    ext.push(renderLinks)
  }
  if (config.renderMath === true) {
    ext.push(renderMath)
  }
  if (config.renderTasks === true) {
    ext.push(renderTasks)
  }
  if (config.renderHeadings === true) {
    ext.push(renderHeadings)
  }
  if (config.renderCitations === true) {
    ext.push(renderCitations)
  }
  if (config.renderMermaid === true) {
    ext.push(renderMermaid)
  }
  if (config.renderTables === true) {
    ext.push(renderTables)
  }

  return ext
}

export function initRenderers (config: RendererConfig): Extension {
  return renderCompartment.of(getRenderersConf(config))
}

export function reconfigureRenderers (view: EditorView, config: RendererConfig = {}): void {
  view.dispatch({
    effects: renderCompartment.reconfigure(getRenderersConf(config))
  })
}
