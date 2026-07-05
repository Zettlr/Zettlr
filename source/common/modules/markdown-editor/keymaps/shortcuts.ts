/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror Custom Shortcuts
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains functionality to support custom shortcuts.
 *
 * END HEADER
 */

import { type DefaultShortcut, getDefaultKeybinding } from 'source/common/util/shortcuts'

/**
 * An enum of names that are available for custom shortcuts.
 */
export type EditorShortcutName = 'autocomplete-invoke'|'autocomplete-accept'|
  // Markdown
  'md-insert-link'|'md-insert-image'|'md-insert-footnote'|'md-highlight'|
  // Search
  'search-find-next'|'search-find-previous'|'search-select-matches'|
  'search-go-to-line'|'search-select-next'|
  // Folding
  'folding-fold-at-cursor'|'folding-unfold-at-cursor'|'folding-fold-all'|
  'folding-unfold-all'|
  // Tables
  'table-align'|
  'table-align-col-left'|'table-align-col-center'|'table-align-col-right'|
  // Selection
  'selection-undo'|'selection-redo'|'selection-line'|'selection-parent-syntax'|
  'selection-indent'|'selection-all'|
  // Editing commands
  'edit-toggle-comment'|'edit-toggle-block-comment'|
  // Transformations
  'tr-zap-gremlins'|'tr-strip-duplicate-spaces'|'tr-sentence-case'|
  'tr-italics-to-quotes'|'tr-quotes-to-italics'|'tr-remove-line-breaks'|
  'tr-straighten-quotes'|'tr-quotes-to-magic'|'tr-ensure-double-quotes'|
  'tr-double-quotes-to-single'|'tr-single-quotes-to-double'|'tr-title-case'|
  'tr-emdash-add-spaces'|'tr-emdash-remove-spaces'|
  // Miscellaneous
  'misc-toggle-tab-focus'

/**
 * Structure of a custom editor shortcut
 */
export interface CustomEditorShortcut {
  name: EditorShortcutName
  shortcut: string
}

/**
 * Default keybindings for all commands. May be empty (in which case there is no
 * default shortcut assigned.) This is used to collect all keybindings at a
 * central place and allow configuration of a subset of them.
 */
export const defaultKeybindings: Record<EditorShortcutName, DefaultShortcut> = {
  'autocomplete-invoke': { key: 'Ctrl-Space' },
  'autocomplete-accept': { key: 'Enter' },
  'md-insert-link': { key: 'Mod-k' },
  'md-insert-image': { key: 'Mod-Alt-i', mac: 'Mod-Shift-i' },
  'md-insert-footnote': { key: 'Mod-Alt-f', mac: 'Mod-Alt-r' },
  'md-highlight': { key: 'Ctrl-Shift-h' },
  'search-find-next': { key: 'Mod-g' },
  'search-find-previous': { key: 'Mod-Shift-g' },
  'search-select-matches': { key: 'Mod-Shift-l' },
  'search-go-to-line': { key: 'Mod-Alt-g' },
  'search-select-next': { key: 'Mod-d' },
  'folding-fold-at-cursor': { key: 'Ctrl-Shift-[', mac: 'Cmd-Alt-[' },
  'folding-unfold-at-cursor': { key: 'Ctrl-Shift-]', mac: 'Cmd-Alt-]' },
  'folding-fold-all': { key: 'Ctrl-Alt-[' },
  'folding-unfold-all': { key: 'Ctrl-Alt-]' },
  'table-align': { key: 'Mod-Shift-a' },
  'table-align-col-left': {},
  'table-align-col-center': {},
  'table-align-col-right': {},
  'selection-undo': { key: 'Mod-u' },
  'selection-redo': { key: 'Alt-u', mac: 'Mod-Shift-u' },
  'selection-line': { key: 'Alt-l', mac: 'Ctrl-l' },
  'selection-parent-syntax': { key: 'Mod-i' },
  'selection-indent': { key: 'Mod-Alt-\\' },
  'selection-all': {},
  'edit-toggle-comment': { key: 'Mod-/' },
  'edit-toggle-block-comment': { key: 'Mod-C' },
  'tr-double-quotes-to-single': {},
  'tr-single-quotes-to-double': {},
  'tr-emdash-add-spaces': {},
  'tr-emdash-remove-spaces': {},
  'tr-ensure-double-quotes': {},
  'tr-italics-to-quotes': {},
  'tr-quotes-to-italics': {},
  'tr-quotes-to-magic': {},
  'tr-remove-line-breaks': {},
  'tr-sentence-case': {},
  'tr-straighten-quotes': {},
  'tr-strip-duplicate-spaces': {},
  'tr-title-case': {},
  'tr-zap-gremlins': {},
  'misc-toggle-tab-focus': { key: 'Ctrl-m', mac: 'Shift-Alt-m' }
}

/**
 * Retrieves a custom shortcut based on the shortcut name, the available map of
 * existing custom shortcuts, and an optional default key. This function returns
 * undefined as a fallback, which means you can use it to retrieve the `key`
 * property for CodeMirror's keyboard commands API.
 *
 * @param   {ShortcutName}            name  The shortcut in question
 * @param   {CustomEditorShortcut[]}  map   The map of available custom shortcuts
 *
 * @return  {string}                        Either a shortcut, or undefined.
 */
export function getCustomShortcut (name: EditorShortcutName, map: CustomEditorShortcut[]): string|undefined {
  const candidate = map.find(s => s.name === name)
  if (candidate === undefined || candidate.shortcut.trim() === '') {
    return getDefaultKeybinding(name, defaultKeybindings)
  } else {
    return candidate.shortcut
  }
}
