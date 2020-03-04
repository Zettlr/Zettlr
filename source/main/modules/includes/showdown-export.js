/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        showdownModule
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Builds an HTML without Pandoc support
 *
 * END HEADER
 */

const fs = require('fs').promises
const path = require('path')
const showdown = require('showdown')
const formatDate = require('../../../common/util/format-date')
const { trans } = require('../../../common/lang/i18n')

module.exports = async function (options) {
  // Create a new showdown converter w/ footnotes support
  let sd = new showdown.Converter({
    'tables': true,
    'requireSpaceBeforeHeadingText': true // Needed to not render tags at line beginning
  })
  sd.setFlavor('github')
  sd.setOption('strikethrough', true)
  sd.setOption('omitExtraWLInCodeBlocks', true)
  sd.setOption('tasklists', true)

  // Simply write the target file ourselves. Therefore first convert
  // to HTML and insert into the template, then replace the variables.
  let file = await fs.readFile(options.sourceFile, 'utf8')
  file = sd.makeHtml(file)
  let tpl = await fs.readFile(path.join(__dirname, '../../assets/export.tpl.htm'), 'utf8')
  tpl = tpl.replace('$body$', file)
  tpl = tpl.replace('$title$', options.file.name)
  tpl = tpl.replace('$date$', formatDate(new Date()))
  // Replace TOC variable with empty string b/c with showdown we don't do
  // a Table of Contents. Note the s-modifier telling the engine that the
  // dot should also match newlines.
  tpl = tpl.replace(/\$if(toc)\$(.+)\$endif\$/ms, '')
  // Replace footnotes. As HTML is only meant for preview & quick prints,
  // it doesn't matter how exact it is. Doesn't need to get to pandoc's
  // abilities.
  tpl = tpl.replace(/\[\^([\d\w]+)\]: (.+)\n/g, function (match, p1, p2, offset, string) {
    return `<p><small><sup><a name="fn-${p1}" ></a><a href="#fnref-${p1}">${p1}</a></sup> ${p2}</small></p>`
  })
  tpl = tpl.replace(/\[\^([\d\w]+)\]/g, function (match, p1, offset, string) {
    return `<sup><a name="fnref-${p1}"></a><a href="#fn-${p1}">${p1}</a></sup>`
  })

  await fs.writeFile(options.targetFile, tpl)
  // Remove both the temporary source file and the template (if applicable)
  try {
    await fs.unlink(options.sourceFile)
  } catch (err) {
    throw new Error(trans('system.error.export_temp_file', options.sourceFile))
  }
}
