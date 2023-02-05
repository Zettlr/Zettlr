/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Renderer Entry Point
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module defines an extension that provides configurable
 *                  renderers for Markdown files.
 *
 * END HEADER
 */

import { Compartment, EditorState, Extension } from '@codemirror/state'
import { renderHeadings } from './render-headings'
import { renderImages } from './render-images'
import { renderLinks } from './render-links'
import { renderMath } from './render-math'
import { renderTasks } from './render-tasks'
import { renderCitations } from './render-citations'
import { renderMermaid } from './render-mermaid'
import { renderTables } from './render-tables'
import { renderIframes } from './render-iframes'
import { renderEmphasis } from './render-emphasis'
import { configField, EditorConfiguration } from '../util/configuration'

const renderCompartment = new Compartment()

const transactionExtender = EditorState.transactionExtender.from(configField, config => transaction => {
  const ext: Extension[] = [renderMermaid]
  if (config.renderImages) ext.push(renderImages)
  if (config.renderLinks) ext.push(renderLinks)
  if (config.renderMath) ext.push(renderMath)
  if (config.renderTasks) ext.push(renderTasks)
  if (config.renderHeadings) ext.push(renderHeadings)
  if (config.renderCitations) ext.push(renderCitations)
  if (config.renderTables) ext.push(renderTables)
  if (config.renderIframes) ext.push(renderIframes)
  if (config.renderEmphasis) ext.push(renderEmphasis)

  const currentState = renderCompartment.get(transaction.state) as Extension[]|undefined
  if (currentState === undefined) {
    return { effects: renderCompartment.reconfigure(ext) }
  } else {
    // Compare the two states. Reconfigure if they differ
    for (const extension of ext.concat(currentState)) {
      if (currentState.includes(extension) !== ext.includes(extension)) {
        return { effects: renderCompartment.reconfigure(ext) }
      }
    }
  }

  return null
})

/**
 * Configures the renderers that are active in the given Markdown state.
 *
 * @param   {Partial<EditorConfiguration>}  config  An optional initial config
 *
 * @return  {Extension}                             The extension set
 */
export function renderers (config?: Partial<EditorConfiguration>): Extension {
  const ext: Extension[] = [renderMermaid]
  if (config?.renderImages === true) ext.push(renderImages)
  if (config?.renderLinks === true) ext.push(renderLinks)
  if (config?.renderMath === true) ext.push(renderMath)
  if (config?.renderTasks === true) ext.push(renderTasks)
  if (config?.renderHeadings === true) ext.push(renderHeadings)
  if (config?.renderCitations === true) ext.push(renderCitations)
  if (config?.renderTables === true) ext.push(renderTables)
  if (config?.renderIframes === true) ext.push(renderIframes)
  if (config?.renderEmphasis === true) ext.push(renderEmphasis)
  return [ transactionExtender, renderCompartment.of(ext) ]
}
