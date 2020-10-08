/**
 * Fires the renderers based on the zettlr.render option values
 *
 * @param   {CodeMirror}  cm  The calling instance
 */
module.exports = (cm) => {
  cm.on('cursorActivity', renderElements)
  cm.on('viewportChange', renderElements)
}

function renderElements (cm) {
  const render = cm.getOption('zettlr').render
  // this._cm.execCommand('markdownRenderMermaid') // Render mermaid codeblocks TODO
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
