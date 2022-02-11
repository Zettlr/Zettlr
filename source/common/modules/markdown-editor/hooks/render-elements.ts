/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror rendering hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Calls all available rendering plugins from the plugins-
 *                  directory.
 *
 * END HEADER
 */

import CodeMirror from 'codemirror'

/**
 * Fires the renderers based on the zettlr.render option values
 *
 * @param   {CodeMirror.Editor}  cm  The calling instance
 */
export default function renderElementsHook (cm: CodeMirror.Editor): void {
  // While taskHandle is undefined, there's no task scheduled. Else, there is.
  let taskHandle: number|undefined

  const callback = function (cm: CodeMirror.Editor): void {
    if (taskHandle !== undefined) {
      return // Already a task registered
    }

    taskHandle = requestIdleCallback(function () {
      renderElements(cm)
      taskHandle = undefined // Next task can be scheduled now
    }, { timeout: 1000 }) // Don't wait more than 1 sec before executing this
  }

  cm.on('cursorActivity', callback)
  cm.on('viewportChange', callback) // renderElements)
  cm.on('optionChange', callback)
}

function renderElements (cm: CodeMirror.Editor): void {
  const render = (cm as any).getOption('zettlr').render
  cm.execCommand('markdownRenderMermaid')
  cm.execCommand('clickableYAMLTags')
  if (render.tables === true) cm.execCommand('markdownRenderTables')
  if (render.iframes === true) cm.execCommand('markdownRenderIframes')
  if (render.links === true) cm.execCommand('markdownRenderLinks')
  if (render.images === true) cm.execCommand('markdownRenderImages')
  if (render.math === true) cm.execCommand('markdownRenderMath')
  if (render.citations === true) cm.execCommand('markdownRenderCitations')
  if (render.tasks === true) cm.execCommand('markdownRenderTasks')
  if (render.headingTags === true) cm.execCommand('markdownRenderHTags')
  if (render.emphasis === true) cm.execCommand('markdownRenderEmphasis')
}
