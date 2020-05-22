/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        pdfModule
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Prepares the output struct to be passed to Pandoc
 *
 * END HEADER
 */

const fs = require('fs').promises
const path = require('path')
const isFile = require('../../../common/util/is-file')
const sanitiseTexValue = require('../../../common/util/sanitise-tex-value')

const TITLEPAGE_REPLACEMENT = `\\maketitle
$if(abstract)$
\\begin{abstract}
$abstract$
\\end{abstract}
$endif$
\\pagebreak
`

module.exports = async function (options) {
  // Set the template on the options so the pandoc runner knows to use it
  options.template = path.join(options.dest, 'template.latex')
  // Indicate to the Pandoc-runner that this template can be safely discared
  options.discardTemplate = true

  let file = path.join(__dirname, '../../assets/export.tex')
  let pdf = options.pdf // Easier access to the PDF options

  // Replace the pagenumbering if applicable
  if (pdf.pagenumbering === 'alph_upper') pdf.pagenumbering = 'Alph'
  if (pdf.pagenumbering === 'roman_upper') pdf.pagenumbering = 'Roman'

  // If a textpl is given, read this instead of the builtin template
  if (pdf.hasOwnProperty('textpl') && isFile(pdf.textpl)) {
    file = pdf.textpl
  }

  let cnt = await fs.readFile(file, 'utf8')
  // Do updates to the template
  // General options
  let variables = {
    // Page setup
    'PAGE_NUMBERING': pdf.pagenumbering,
    'PAPER_TYPE': pdf.papertype,
    'TOP_MARGIN': pdf.tmargin + pdf.margin_unit,
    'RIGHT_MARGIN': pdf.rmargin + pdf.margin_unit,
    'BOTTOM_MARGIN': pdf.bmargin + pdf.margin_unit,
    'LEFT_MARGIN': pdf.lmargin + pdf.margin_unit,
    // Font setup
    'MAIN_FONT': pdf.mainfont,
    'SANS_FONT': pdf.sansfont,
    'LINE_SPACING': pdf.lineheight,
    'FONT_SIZE': pdf.fontsize + 'pt',
    // Metadata
    'PDF_TITLE': sanitiseTexValue(options.title),
    'PDF_SUBJECT': sanitiseTexValue(options.title),
    'PDF_AUTHOR': sanitiseTexValue(options.author),
    'PDF_KEYWORDS': sanitiseTexValue(options.keywords),
    // Project settings
    'TITLEPAGE': (pdf.titlepage) ? TITLEPAGE_REPLACEMENT : '',
    'GENERATE_TOC': (pdf.toc) ? `\\setcounter{tocdepth}{${pdf.tocDepth}}\n\\tableofcontents\n\\pagebreak\n` : ''
  }

  console.log(variables)

  for (let key in variables) {
    cnt = cnt.replace(new RegExp('\\$' + key + '\\$', 'g'), variables[key])
  }

  await fs.writeFile(options.template, cnt, 'utf8')
}
