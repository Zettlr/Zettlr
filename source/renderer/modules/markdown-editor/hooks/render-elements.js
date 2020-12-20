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
  if (render.tables) cm.execCommand('markdownRenderTables')
  if (render.links) cm.execCommand('markdownRenderLinks')
  if (render.images) cm.execCommand('markdownRenderImages')
  if (render.math) cm.execCommand('markdownRenderMath')
  if (render.citations) cm.execCommand('markdownRenderCitations')
  if (render.tasks) cm.execCommand('markdownRenderTasks')
  if (render.headingTags) cm.execCommand('markdownRenderHTags')
  if (render.iframes) cm.execCommand('markdownRenderIframes')
  if (render.wysiwyg) cm.execCommand('markdownWYSIWYG')
}
