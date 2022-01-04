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

/**
 * Fires the renderers based on the zettlr.render option values
 *
 * @param   {CodeMirror}  cm  The calling instance
 */
module.exports = (cm) => {
  // DEBUG TESTING of requestIdleCallbacks

  // While taskHandle is undefined, there's no task scheduled. Else, there is.
  let taskHandle

  const callback = function (cm) {
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

function renderElements (cm) {
  const render = cm.getOption('zettlr').render
  cm.execCommand('markdownRenderMermaid')
  if (render.tables === true) cm.execCommand('markdownRenderTables')
  if (render.iframes === true) cm.execCommand('markdownRenderIframes')
  if (render.links === true) cm.execCommand('markdownRenderLinks')
  if (render.images === true) cm.execCommand('markdownRenderImages')
  if (render.math === true) cm.execCommand('markdownRenderMath')
  if (render.citations === true) cm.execCommand('markdownRenderCitations')
  if (render.tasks === true) cm.execCommand('markdownRenderTasks')
  if (render.headingTags === true) cm.execCommand('markdownRenderHTags')
  if (render.wysiwyg === true) cm.execCommand('markdownWYSIWYG')
}
