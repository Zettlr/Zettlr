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

import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { renderHeadings } from './render-headings'
import { renderImages } from './render-images'
import { renderLinks } from './render-links'
import { renderMath } from './render-math'
import { renderTasks } from './render-tasks'
import { renderCitations } from './render-citations'
import { renderMermaid } from './render-mermaid'
import { renderTables } from '../table-editor'
import { renderIframes } from './render-iframes'
import { renderEmphasis } from './render-emphasis'
import { configField, type EditorConfiguration } from '../util/configuration'
import type { EditorView } from '@codemirror/view'
import { hasMarkdownExt } from 'source/common/util/file-extention-checks'
import { trans } from 'source/common/i18n-renderer'
import type { StatusbarItem } from '../statusbar'

const renderCompartment = new Compartment()

const transactionExtender = EditorState.transactionExtender.from(configField, config => transaction => {
  const ext: Extension[] = [renderMermaid]
  if (config.renderingMode === 'preview' && config.renderImages) {
    ext.push(renderImages)
  }
  if (config.renderingMode === 'preview' && config.renderLinks) {
    ext.push(renderLinks)
  }
  if (config.renderingMode === 'preview' && config.renderMath) {
    ext.push(renderMath)
  }
  if (config.renderingMode === 'preview' && config.renderTasks) {
    ext.push(renderTasks)
  }
  if (config.renderingMode === 'preview' && config.renderHeadings) {
    ext.push(renderHeadings)
  }
  if (config.renderingMode === 'preview' && config.renderCitations) {
    ext.push(renderCitations)
  }
  if (config.renderingMode === 'preview' && config.renderTables) {
    ext.push(renderTables)
  }
  if (config.renderingMode === 'preview' && config.renderIframes) {
    ext.push(renderIframes)
  }
  if (config.renderingMode === 'preview' && config.renderEmphasis) {
    ext.push(renderEmphasis)
  }

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
  if (config?.renderingMode === 'preview' && config?.renderImages === true) {
    ext.push(renderImages)
  }
  if (config?.renderingMode === 'preview' && config?.renderLinks === true) {
    ext.push(renderLinks)
  }
  if (config?.renderingMode === 'preview' && config?.renderMath === true) {
    ext.push(renderMath)
  }
  if (config?.renderingMode === 'preview' && config?.renderTasks === true) {
    ext.push(renderTasks)
  }
  if (config?.renderingMode === 'preview' && config?.renderHeadings === true) {
    ext.push(renderHeadings)
  }
  if (config?.renderingMode === 'preview' && config?.renderCitations === true) {
    ext.push(renderCitations)
  }
  if (config?.renderingMode === 'preview' && config?.renderTables === true) {
    ext.push(renderTables)
  }
  if (config?.renderingMode === 'preview' && config?.renderIframes === true) {
    ext.push(renderIframes)
  }
  if (config?.renderingMode === 'preview' && config?.renderEmphasis === true) {
    ext.push(renderEmphasis)
  }
  return [ transactionExtender, renderCompartment.of(ext) ]
}

/**
 * Provides a statusbar field that allows the user to control the rendering mode
 * right from the statusbar.
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element
 */
export function renderingModeToggle (state: EditorState, _view: EditorView): StatusbarItem|null {
  const config = state.field(configField, false)
  if (config === undefined || !hasMarkdownExt(config.metadata.path)) {
    return null
  }

  return {
    content: trans(
      'Rendering: %s',
      config.renderingMode === 'preview' ? trans('Preview') : trans('Raw')
    ),
    title: trans('Enable or disable the preview mode for Markdown files by clicking'),
    onClick () {
      window.config.set('display.renderingMode', config.renderingMode === 'preview' ? 'raw' : 'preview')
    }
  }
}
