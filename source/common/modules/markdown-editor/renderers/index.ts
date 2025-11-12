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
import { configField, configUpdateEffect, type EditorConfiguration } from '../util/configuration'
import type { EditorView } from '@codemirror/view'
import { hasMarkdownExt } from 'source/common/util/file-extention-checks'
import { trans } from 'source/common/i18n-renderer'
import type { StatusbarItem } from '../statusbar'

const renderCompartment = new Compartment()

function configureRenderers (config: EditorConfiguration) {
  const ext: Extension[] = [renderMermaid]

  if (config.renderingMode === 'preview') {
    if (config.renderImages) { ext.push(renderImages) }
    if (config.renderLinks) { ext.push(renderLinks) }
    if (config.renderMath) { ext.push(renderMath) }
    if (config.renderTasks) { ext.push(renderTasks) }
    if (config.renderHeadings) { ext.push(renderHeadings) }
    if (config.renderCitations) { ext.push(renderCitations) }
    if (config.renderTables) { ext.push(renderTables) }
    if (config.renderIframes) { ext.push(renderIframes) }
    if (config.renderEmphasis) { ext.push(renderEmphasis) }
  }

  return ext
}

const transactionExtender = EditorState.transactionExtender.from(configField, config => transaction => {
  const ext: Extension[] = configureRenderers(config)
  const currentState = renderCompartment.get(transaction.state) as Extension[]|undefined

  if (currentState === undefined) {
    return { effects: renderCompartment.reconfigure(ext) }
  }

  // Compare the two states. Reconfigure if they differ
  for (const extension of ext.concat(currentState)) {
    if (currentState.includes(extension) !== ext.includes(extension)) {
      return { effects: renderCompartment.reconfigure(ext) }
    }
  }

  return null
})

/**
 * Configures the renderers that are active in the given Markdown state.
 *
 * @param   {EditorConfiguration}  config  An optional initial config
 *
 * @return  {Extension}                             The extension set
 */
export function renderers (config: EditorConfiguration): Extension {
  const ext: Extension[] = configureRenderers(config)

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
export function renderingModeToggle (state: EditorState, view: EditorView): StatusbarItem|null {
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
      const mode = config.renderingMode === 'preview' ? 'raw' : 'preview'
      view.dispatch({ effects: configUpdateEffect.of({ renderingMode: mode }) })
      // We dispatch an empty transaction here so that the renderer
      // update takes effect immediately when clicking. Otherwise, it would
      // take an additional transaction, i.e. user interaction,
      // for the renderer changes to take effect.
      view.dispatch({})
    }
  }
}
