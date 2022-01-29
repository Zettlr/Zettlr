/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        AutoCorrect CodeMirror Plugin
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz, Tobias Diez
  * License:         GNU GPL v3
  *
  * Description:     This plugin renders Math equations using KaTeX.
  *
  * END HEADER
  */

import { getBlockMathRE, getInlineMathRenderRE } from '@common/regular-expressions'
import CodeMirror from 'codemirror'
import katex from 'katex'

import 'katex/contrib/mhchem' // modify katex module

const multilineMathRE = getBlockMathRE()
const commands = (CodeMirror.commands as any)
commands.markdownRenderMath = function (cm: CodeMirror.Editor) {
  // First, find all math elements
  // We'll only render the viewport
  const viewport = cm.getViewport()
  let lines: LineInfo[] = []
  for (let i = viewport.from; i < viewport.to; i++) {
    let modeName = cm.getModeAt({ 'line': i, 'ch': 0 }).name ?? ''
    let tokenType = cm.getTokenTypeAt({ 'line': i, 'ch': 0 })
    lines.push(new LineInfo(i, cm.getLine(i), modeName, tokenType))
  }
  let equations = findEquations(lines)

  // Now cycle through all new markers and insert them, if they weren't already
  for (let myMarker of equations) {
    let cur = cm.getCursor('from')
    let isMulti = myMarker.curFrom.line !== myMarker.curTo.line
    if (isMulti && cur.line >= myMarker.curFrom.line && cur.line <= myMarker.curTo.line) {
      // We're directly in the multiline equation, so don't render.
      continue
    } else if (!isMulti && cur.line === myMarker.curFrom.line && cur.ch >= myMarker.curFrom.ch && cur.ch <= myMarker.curTo.ch) {
      // Again, we're right in the middle of an inline-equation, so don't render.
      continue
    }

    // We can only have one marker at any given position at any given time
    if (cm.getDoc().findMarks(myMarker.curFrom, myMarker.curTo).length > 0) {
      continue
    }

    // Do not render if it's inside a comment (in this case the mode will be
    // markdown, but comments shouldn't be included in rendering)
    // Final check to avoid it for as long as possible, as getTokenAt takes
    // considerable time.
    let tokenTypeBegin = cm.getTokenTypeAt(myMarker.curFrom)
    let tokenTypeEnd = cm.getTokenTypeAt(myMarker.curTo)
    if ((tokenTypeBegin?.includes('comment')) || (tokenTypeEnd?.includes('comment'))) {
      continue
    }

    let mathSpan = document.createElement('span')
    mathSpan.classList.add('preview-math')
    mathSpan.dataset.equation = myMarker.eq // Save the equation so it can be copied

    let textMarker = cm.getDoc().markText(
      myMarker.curFrom, myMarker.curTo,
      {
        'className': 'test',
        'clearOnEnter': true,
        'replacedWith': mathSpan,
        'inclusiveLeft': false,
        'inclusiveRight': false
      }
    )

    // Enable on-click closing of rendered Math elements.
    mathSpan.onclick = (e) => { textMarker.clear() }

    // TODO: Read from file
    // const fs = require('fs')
    // var customMacrosFile = 'D:\\Research\\A_Central\\Latex\\tex\\generic\\myMathHeader.json'
    // let customMacros = new Map(JSON.parse(fs.readFileSync(customMacrosFile, { encoding: 'utf8' })))
    katex.render(myMarker.eq, mathSpan, {
      throwOnError: false,
      displayMode: myMarker.displayMode,
      macros: {
        // # Math commands
        /*
        \begin{thm}
        \end{thm}
        \begin{prop}
        \end{prop}
        \begin{lemma}
        \end{lemma}
        \begin{coro}
        \end{coro}
        \begin{defn}
        \end{defn}
        \begin{fact}
        \end{fact}
        \begin{remark}
        \end{remark}
        \begin{remarks}
        \end{remarks}
        \begin{example}
        \end{example}
        \begin{counterexample}
        \end{counterexample}
        \begin{proof}
        \end{proof}
        \begin{thmenumerate}
        \end{thmenumerate}
        */

        '\\abs': '',
        '\\norm': '',
        '\\nnorm': '',
        '\\normDot': '',
        '\\equivClass': '',
        '\\bracket': '',
        '\\scalarProd': '',
        '\\scalarProdDot': '',
        '\\scalarProdR': '',
        '\\poisson{left}{right}': '',
        '\\poissonDot': '',
        '\\commutator': '',
        '\\commutatorDot': '',
        '\\antiCommutator': '',
        '\\LieBracket': '',
        '\\LieBracketDot': '',
        '\\dualPair{left}{right}': '',
        '\\dualPairDot': '',
        '\\dualPairR{left}{right}': '',
        '\\dualPairRDot': '',
        '\\LTwoDualPair{left}{right}': '',
        '\\LTwoDualPairDot': '',
        '\\LTwoNorm{}': '',
        '\\wedgeLie': '',
        '\\wedgeLieDot': '',
        '\\wedgeDual': '',
        '\\wedgeDualDot': '',
        '\\wedgeldot': '',

        '\\sslash': '',

        '\\field': '',
        '\\R': '',
        '\\C': '',
        '\\N': '',
        '\\Z': '',
        '\\Q': '',
        '\\K': '',

        '\\Hom': '',
        '\\Aut': '',
        '\\End': '',
        '\\Tor': '',
        '\\TorAb': '',
        '\\Ext': '',
        '\\ExtAb': '',

        '\\sgn': '',
        '\\pr': '',
        '\\inc': '',
        '\\tr': '',
        '\\Sym': '',
        '\\jet': '',
        '\\divergence': '',
        '\\ind': '',
        '\\const': '',
        '\\principalSymbol': '',

        '\\ker': '',
        '\\coker ': '',
        '\\img ': '',
        '\\coimg ': '',
        '\\supp   ': '',
        '\\vspan   ': '',
        '\\id': '',
        '\\one': '',
        '\\ev': '',
        '\\Ev': '',
        '\\pb': '',
        '\\pf': '',
        '\\vol': '',

        '\\inv': '',
        '\\mult': '',
        '\\comp': '',

        '\\flux': '',

        '\\fixPointSet': '',

        '\\secondFundForm': '',

        '\\fourierTransform': '',

        '\\LieA': '',
        '\\LieAEx': '',
        '\\aCentralizer': '',
        '\\aCenter': '',

        '\\LeftTrans': '',
        '\\RightTrans': '',
        '\\centralizer': '',
        '\\AdAction': '',
        '\\CoAdAction': '',
        '\\CoAdMAction': '',
        '\\CoAdOrbit': '',
        '\\adAction': '',
        '\\CoadAction': '',
        '\\CoadMAction': '',
        '\\conjAction': '',

        '\\contr': '',
        '\\hatProduct': '',
        '\\flow': '',
        '\\tensorProd': '',
        '\\externalTensor': '',

        '\\SequenceSpace': '',

        '\\TBundle': '',
        '\\CotBundle': '',
        '\\CotBundleProj': '',
        '\\ExtBundle': '',
        '\\SymBundle': '',
        '\\DensityBundle': '',
        '\\halfDensityBundle': '',
        '\\VBundle': '',
        '\\VDensityBundle': '',
        '\\HBundle': '',
        '\\NBundle': '',
        '\\AdBundle': '',
        '\\FrameBundle': '',
        '\\SpinBundle': '',
        '\\SpinorBundle': '',
        '\\CoSpinorBundle': '',
        '\\SpBundle': '',
        '\\CoAdBundle': '',
        '\\ConjBundle': '',
        '\\AtBundle': '',
        '\\JetBundle': '',
        '\\JetSpace': '',
        '\\pJetBundle': '',
        '\\HomBundle': '',
        '\\ConnBundle': '',
        '\\UniEBundle': '',
        '\\UniBBundle': '',
        '\\KBundle': '',
        '\\OrientationBundle': '',
        '\\LinMapBundle': '',

        '\\toInject': '',
        '\\toSurject': '',

        '\\LinMapSpace': '',
        '\\GLinMapSpace': '',
        '\\FlagSpace': '',
        '\\LagSpace': '',
        '\\FunctionSpace': '',
        '\\sFunctionSpace': '',
        '\\cFunctionSpace': '',
        '\\ccFunctionSpace': '',
        '\\scFunctionSpace': '',
        '\\LFunctionSpace': '',
        '\\LTwoFunctionSpace': '',
        '\\HFunctionSpace': '',
        '\\SectionSpace': '',
        '\\sSectionSpace': '',
        '\\scSectionSpace': '',
        '\\cSectionSpace': '',
        '\\psSectionSpace': '',
        '\\FibreBundleModel': '',
        '\\SectionSpaceAbb': '',
        '\\SectionMapAbb': '',
        '\\DiffOpSpace': '',
        '\\PseudoDiffOpSpace': '',
        '\\TestFunctionSpace': '',
        '\\DistributionSpace': '',
        '\\cDistributionSpace': '',
        '\\CoNormalDistributionSpace': '',
        '\\SchwartzSectionSpace': '',
        '\\halfSchwartzSectionSpace': '',
        '\\temperedDistributionSpace': '',
        '\\locIntSectionSpace': '',
        '\\BesovSectionSpace': '',
        '\\locBesovSectionSpace': '',
        '\\SymbolSpace': '',
        '\\DiffFormSpace': '',
        '\\clDiffFormSpace': '',
        '\\clZDiffFormSpace': '',
        '\\VectorFieldSpace': '',
        '\\TensorFieldSpace': '',
        '\\SymTensorFieldSpace': '',
        '\\DensitySpace': '',
        '\\cDensitySpace': '',
        '\\MetricSpace': '',
        '\\VolSpace': '',
        '\\EmbeddingSpace': '',
        '\\ImmersionSpace': '',
        '\\DiffGroup': '',
        '\\AutGroup': '',
        '\\AutAlgebra': '',
        '\\GauGroup': '',
        '\\GauAlgebra': '',
        '\\CoGauAlgebra': '',
        '\\HamDiffGroup': '',
        '\\HamVectorFields': '',
        '\\ConnSpace': '',
        '\\cenConnSpace': '',
        '\\cenYMConnSpace': '',
        '\\PathSpace': '',
        '\\sPathSpace': '',
        '\\psPathSpace': '',
        '\\cPathSpace': '',
        '\\LoopSpace': '',
        '\\sLoopSpace': '',
        '\\psLoopSpace': '',
        '\\cLoopSpace': '',
        '\\RepSpace': '',
        '\\posSSymSpace': '',
        '\\MatrixSpace': '',
        '\\SiegelSpace': '',
        '\\H': '',

        '\\hor': '',
        '\\Hol': '',

        '\\UGroup': '',
        '\\UAlgebra': '',
        '\\SUGroup': '',
        '\\SUAlgebra': '',
        '\\PUGroup': '',
        '\\OGroup': '',
        '\\OAlgebra': '',
        '\\SOGroup': '',
        '\\SpinGroup': '',
        '\\SpinRep': '',
        '\\SLGroup': '',
        '\\GLGroup': '',
        '\\GLAlgebra': '',
        '\\SLAlgebra': '',
        '\\SpGroup': '',
        '\\SpAlgebra': '',
        '\\USpGroup': '',
        '\\UTGroup': '',

        '\\HolGroup': '',
        '\\HolAlgebra': '',
        '\\pJetGroup': '',
        '\\pJetAlgebra': '',

        '\\chernClass': '',
        '\\stiefelWhitneyClass': '',
        '\\pontryaginClass': '',
        '\\JacTorus': '',

        '\\fundamentalGroup': '',
        '\\sChain': '',
        '\\sCycles': '',
        '\\sBoundaries': '',
        '\\sHomology': '',
        '\\sCochain': '',
        '\\sCocycles': '',
        '\\sCoboundaries': '',
        '\\sCohomology': '',
        '\\csCohomology': '',
        '\\deRCohomology': '',
        '\\cechCohomology': '',
        '\\simplex': '',
        '\\boundary': '',
        '\\coboundary': '',

        '\\per': '',

        '\\intFibre': '',

        '\\slashed': '',

        '\\laplace': '',
        '\\dAlambert': '',
        '\\dif': '',
        '\\Dif': '',
        '\\difp': '',
        '\\difpBar': '',
        '\\diF': '',
        '\\difDirac': '',
        '\\difLog': '',
        '\\difLie': '',

        '\\difFrac': '',
        '\\DifFrac': '',
        '\\difpFrac': '',
        '\\diFFrac': '',
        '\\difFracAt': '',
        '\\difpFracAt': '',

        '\\defeq': '',

        '\\set': '',
        '\\setc': '',

        '\\restr{function}{subset}': '',

        '\\transversal': '',

        '\\closureSet': '',
        '\\interior': '',
        '\\stratification': '',

        '\\isomorph': '',
        '\\T': '',

        '\\tangent': '',
        '\\cotangent': '',
        '\\vtangent': '',
        '\\tangentLeft': '',
        '\\pJetProlongation': '',
        '\\Hessian': '',

        '\\hodgeStar': '',

        '\\symplMatrix': '',

        '\\lSemiProduct': '',
        '\\rSemiProduct': '',

        '\\intersect': '',
        '\\bigIntersection': '',
        '\\union': '',
        '\\disjUnion': '',
        '\\bigUnion': '',
        '\\bigDisjUnion': '',
        '\\normalSubgroupEq': '',

        '\\normalizer': '',
        '\\type': '',

        '\\RP': '',
        '\\CP': '',

        '\\OpenBall': '',
        '\\ClosedBall': '',

        '\\I': '',
        '\\imaginary': '',
        '\\E': '',
        '\\LeviCivita': '',
        '\\Kronecker': '',

        '\\curv': '',
        '\\Ric': '',
        '\\RicScalar': '',

        '\\Matrix': '',
        '\\smallMatrix': '',
        '\\Vector': '',

        '\\grad': '',

        '\\singularPart': '',
        '\\ext': '',

        '\\ldot': ''
      }
    })

    // Now the marker has obviously changed
    if (textMarker.find() !== undefined) {
      textMarker.changed()
    } else {
      console.warn('Warning: Attempted to update a text marker after KaTeX finished rendering, but it wasn\' in the document anymore.')
    }
  }
}

export class LineInfo {
  constructor (
    readonly lineNumber: number,
    readonly text: string,
    readonly modeName: string,
    readonly tokenType?: string
  ) {}
}

export class EquationMarker {
  constructor (
    readonly curFrom: CodeMirror.Position,
    readonly curTo: CodeMirror.Position,
    readonly eq: string,
    readonly displayMode: boolean
  ) {}
}

/**
   * Finds all equations contained in a given string according to the Pandoc documentation
   * on its tex_math_dollars-extension.
   * More information: https://pandoc.org/MANUAL.html#math
   * @param text the input string
   * @param line the line number of the input
   * @returns list of equations in the input
   */
export function findInlineEquations (text: string, line: number): EquationMarker[] {
  let inlineMathRE = getInlineMathRenderRE(true) // Get the RE with the global flag set.
  let newMarkers = []

  let match
  while ((match = inlineMathRE.exec(text)) !== null) {
    if (match.groups === undefined) {
      continue
    }

    newMarkers.push(new EquationMarker(
      { 'ch': match.index, 'line': line },
      { 'ch': match.index + match[0].length, 'line': line },
      match.groups.eq ?? '',
      // Equations surrounded by two dollars should be displayed as centred equation
      (match.groups.dollar ?? '').length === 2
    ))
  }
  return newMarkers
}

export function findEquations (lines: LineInfo[]): EquationMarker[] {
  let insideMultiline = false // Are we inside a multiline math environment?
  let eq: string[] = []
  let fromLine = 0

  // This array holds all markers to be inserted (either one in case of the
  // final line of a multiline-equation or multiple in case of several
  // inline equations).
  let equations: EquationMarker[] = []

  for (let line of lines) {
    if (![ 'markdown-zkn', 'stex' ].includes(line.modeName)) {
      continue
    }
    if (line.modeName === 'stex') {
      // Make sure the token list includes "multiline-equation"
      // because otherwise we shouldn't render this as it's within
      // a default LaTeX code block, not an equation.
      let isMultilineBeginning = multilineMathRE.test(line.text)
      let isMultilineEquation = line.tokenType?.includes('multiline-equation') ?? false
      if (!isMultilineBeginning && !isMultilineEquation) {
        continue
      }
    }

    let multilineMathMatch = multilineMathRE.exec(line.text)
    let isMultilineStartOrEnd = multilineMathMatch !== null
    if (!insideMultiline && isMultilineStartOrEnd) {
      insideMultiline = true
      fromLine = line.lineNumber
      eq = []
    } else if (insideMultiline && !isMultilineStartOrEnd) {
      // Simply add the line to the equation and continue
      eq.push(line.text)
      continue
    } else if (insideMultiline && isMultilineStartOrEnd && multilineMathMatch !== null) {
      // We have left the multiline equation and can render it now.
      insideMultiline = false
      equations.push(new EquationMarker(
        { 'ch': 0, 'line': fromLine },
        { 'ch': multilineMathMatch[1].length, 'line': line.lineNumber },
        eq.join('\n'),
        true
      ))
      eq = [] // Reset the equation
    } else {
      // Else: No multiline. Search for inline equations.
      equations.push.apply(equations, findInlineEquations(line.text, line.lineNumber))
    }
  }

  return equations
}
