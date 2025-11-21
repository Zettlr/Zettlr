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

/* Adds or removes an extension from a list of extensions based on the value of enabled */
function updateExtension (renderer: Extension, enabled: boolean|undefined, ext: Extension[]) {
  const idx = ext.indexOf(renderer)

  // Renderer is enabled and not in the list
  if (enabled === true && idx === -1) { ext.push(renderer) }
  // Renderer is disabled and in the list
  if (enabled === false && idx > -1) { ext.splice(idx, 1) }

  return ext
}

/* Configures the enabled renderer extensions, optionally updating an existing set of extensions */
function configureRenderers (config: Partial<EditorConfiguration>, ext?: Extension[]) {
  if (ext === undefined) {
    ext = []
  }

  if (!ext.includes(renderMermaid)) {
    ext.push(renderMermaid)
  }

  if (config.renderingMode === 'raw') {
    ext = [renderMermaid]
  }

  if (config.renderingMode === 'preview') {
    updateExtension(renderImages, config.renderImages, ext)
    updateExtension(renderLinks, config.renderLinks, ext)
    updateExtension(renderMath, config.renderMath, ext)
    updateExtension(renderTasks, config.renderTasks, ext)
    updateExtension(renderHeadings, config.renderHeadings, ext)
    updateExtension(renderCitations, config.renderCitations, ext)
    updateExtension(renderTables, config.renderTables, ext)
    updateExtension(renderIframes, config.renderIframes, ext)
    updateExtension(renderEmphasis, config.renderEmphasis, ext)
  }

  return ext
}

/**
 * A TransactionExtender that reconfigures the renderer extension compartment in response
 * to a configUpdateEffect
 */
const modeSwitcher = EditorState.transactionExtender.from(configField, config => transaction => {
  for (const effect of transaction.effects) {
    if (effect.is(configUpdateEffect)) {
      const overrides = {
        renderingMode: effect.value.renderingMode ?? config.renderingMode,
        renderImages: effect.value.renderImages ?? config.renderImages,
        renderLinks: effect.value.renderLinks ?? config.renderLinks,
        renderMath: effect.value.renderMath ?? config.renderMath,
        renderTasks: effect.value.renderTasks ?? config.renderTasks,
        renderHeadings: effect.value.renderHeadings ?? config.renderHeadings,
        renderCitations: effect.value.renderCitations ?? config.renderCitations,
        renderTables: effect.value.renderTables ?? config.renderTables,
        renderIframes: effect.value.renderIframes ?? config.renderIframes,
        renderEmphasis: effect.value.renderEmphasis ?? config.renderEmphasis,
      }

      const ext = renderCompartment.get(transaction.state) as Extension[]|undefined
      return { effects: renderCompartment.reconfigure(configureRenderers(overrides, ext)) }

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
  return [ modeSwitcher, renderCompartment.of(configureRenderers(config)) ]
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
