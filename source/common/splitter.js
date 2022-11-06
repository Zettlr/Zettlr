/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Splitter
 * CVM-Role:        View
 * Maintainer:      Basile Clément
 * License:         GNU GPL v3
 *
 * Description:     Allow manual resizing of elements in a flexbox layout.
 *
 * END HEADER
 */
/* eslint-env es6 */

/* The <zettlr-splitter> implements a vertical or horizontal layout containing
 * multiple panes that can be resized by the user.
 *
 * A <zettlr-splitter> element should only contain <zettlr-pane> and
 * <zettlr-separator> elements.  <zettlr-pane>s are the different panes, while
 * <zettlr-separator>s are empty separator elements that the user can grab to
 * resize the panes.
 *
 * The <zettlr-splitter> is a flex container, and tries to adhere to flexbox
 * expectations as much as possible. In particular, the <zettlr-splitter>
 * supports RTL horizontal layouts out of the box.
 *
 * When a <zettlr-separator> is being moved, it increases (or decreases) the
 * size of the enclosing (previous and next) panes correspondingly, where the
 * enclosing panes are computed according to the visual order (i.e. it follows
 * the CSS `order` property).
 *
 * The <zettlr-separator> elements have default flex-grow and flex-shrink
 * values of 0 to ensure they maintain a fixed size.  The <zettlr-pane>
 * elements have a default flex-grow (but not flex-shrink) value of 0.
 *
 * To get the behavior of a main element with sidebars where the main element
 * should grow and shrink with the window but the sidebars remain at a constant
 * size, set `flex-grow: 0` on the sidebars and give them a non-relative size.
 */
class Splitter extends HTMLElement {
  constructor () {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = `
:host { display: flex; }
:host([hidden]) { display: none; }
:host([aria-orientation="vertical"]) { flex-direction: column; }
`

    const slot = document.createElement('slot')
    shadowRoot.appendChild(style)
    shadowRoot.appendChild(slot)
  }

  static get observedAttributes () { return ['aria-orientation'] }

  get orientation () {
    return this.getAttribute('aria-orientation') === 'vertical' ? 'vertical' : 'horizontal'
  }

  set orientation (value) {
    this.setAttribute('aria-orientation', value)
  }

  // Returns the name of the property corresponding to the main flex axis.
  //
  // This is "width" for horizontal splitters, and "height" for vertical
  // splitters.
  get propertyName () {
    return this.orientation === 'vertical' ? 'height' : 'width'
  }

  // Returns the inner size of the container in the main flex axis, in pixels.
  //
  // This corresponds to the size that is available to children across that
  // axis, and properly accounts for the `box-sizing` CSS property.  It is used
  // to convert absolute pixel values to percentages.
  get containerSize () {
    const style = getComputedStyle(this)

    if (style.boxSizing === 'border-box') {
      let containerSize = this.getBoundingClientRect()[this.propertyName]

      if (this.orientation === 'vertical') {
        containerSize -= parseFloat(style.paddinTop)
        containerSize -= parseFloat(style.paddingBottom)
        containerSize -= parseFloat(style.borderTopWidth)
        containerSize -= parseFloat(style.borderBottomWidth)
      } else {
        containerSize -= parseFloat(style.paddingLeft)
        containerSize -= parseFloat(style.paddingRight)
        containerSize -= parseFloat(style.borderLeftWidth)
        containerSize -= parseFloat(style.borderRightWidth)
      }

      return containerSize
    } else {
      return parseFloat(style.getPropertyValue(this.propertyName))
    }
  }

  // Reset the basis attribute of the <zettlr-pane> children according to their
  // actual size in the main flex dimension.
  //
  // When the user clicks on a separator, we will set the value of the basis
  // according to its current size (as computed by e.g. getBoundingClientRect).
  // If the corresponding panes were shrunk or grown according the their
  // flex-shrink and flex-grow values, this will cause a sudden change in their
  // corresponding size, as it will change the amount of positive or negative
  // space they get allocated.
  //
  // By recomputing the bases of *all* panes according to their current size,
  // we ensure that there is neither positive nor negative space, and prevent
  // this behavior.
  //
  // Note: we must take care to *first* compute the size of all children,
  // *then* reset all the bases at once, otherwise there would be a cascading
  // effect of the changes.
  recomputeSizes () {
    const delayed = []
    let containerSize // We only need the container size if there are % bases

    for (const child of this.children) {
      if (!(child instanceof Pane)) continue

      const oldBasis = child.basis
      const childSize = getComputedStyle(child).getPropertyValue(this.propertyName)

      let newBasis
      if (oldBasis.includes('%')) {
        if (containerSize === undefined) containerSize = this.containerSize

        newBasis = `${100 * (parseFloat(childSize) / containerSize)}%`
      } else {
        newBasis = childSize
      }

      if (newBasis !== oldBasis) {
        delayed.push(() => {
          child.basis = newBasis
        })
      }
    }

    for (const fn of delayed) fn()
  }

  connectedCallback () {
    if (!this.isConnected) return

    this.addEventListener('mousedown', this)
  }

  disconnectedCallback () {
    this.removeEventListener('mousedown', this)
  }

  handleEvent (event) {
    // We use pageX instead of the more common clientX because, if you think
    // about it, page coordinate is the right coordinate system for a dynamic
    // resize, especially if the user scrolls while resizing.
    const { target, pageX: initialPageX, pageY: initialPageY } = event

    // Capture the event iff it is a mousedown on a child <zettlr-separator>.
    //
    // Note: <zettlr-separator> do not display their children (they have a
    // shadow root and no slots), so we don't have to deal with the target
    // possibly being a deeper descendant of the separator.
    if (!(target instanceof Separator) || target.parentNode !== this) return
    event.stopPropagation()
    event.preventDefault()

    // Compute a list of all relevant panes.
    //
    // Note: if either pane has a flex-grow value of `0`, we do not resize the
    // other pane if it has a non-zero flex-grow value.   If we do not do this,
    // we always end up setting
    //
    // Note: If the enclosing visual elements are not <zettlr-pane>s, we simply
    // discard them to avoid messing up with arbitrary elements.
    const [ previousSibling, nextSibling ] = target.getEnclosingVisualElements()
    const previousPane = previousSibling instanceof Pane ? previousSibling : null
    const nextPane = nextSibling instanceof Pane ? nextSibling : null

    // Only resize when there are both a previous and next pane
    if (previousPane === null || nextPane === null) return

    // Mark the separator as currently being active
    target.setAttribute('active', '')

    const panes = [
      [ previousPane,
        parseFloat(getComputedStyle(previousPane).getPropertyValue(this.propertyName)),
        1 ],
      [ nextPane,
        parseFloat(getComputedStyle(nextPane).getPropertyValue(this.propertyName)),
        -1 ]
    ]

    const onMouseMove = ({ pageX, pageY }) => {
      const isHorizontal = this.orientation !== 'vertical'

      // Flexbox row layout is direction-aware, so we must be as well
      const isReverse = isHorizontal && getComputedStyle(this).direction === 'rtl'

      // Set the new value using flex-basis, because if flex-basis is not
      // `auto`, width and height will not be taken into account.
      // This also has a better behavior when the direction changes while
      // resizing.
      const offset = (isReverse ? -1 : 1) * (isHorizontal ? pageX - initialPageX : pageY - initialPageY)
      for (const [ pane, initialBasis, factor ] of panes) {
        const paneBasis = Math.max(0, initialBasis + factor * offset)
        pane.style.flexBasis = `${paneBasis}px`
        // TODO: pane._offset = factor * offset
      }
    }

    // Recompute all `basis` values to avoid teleportation, see comment in
    // `recomputeSizes`
    this.recomputeSizes()
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('wheel', onMouseMove, { passive: true })

    // Stop resizing when either the mouse is released or the children of the
    // element change.  We also need to set `overflow-anchor: none;` to avoid
    // jankiness when scrolling while resizing (this is not the best idea, but
    // let's not make users suffer if we can avoid it).
    const oldOverflowAnchor = this.style.overflowAnchor
    this.style.overflowAnchor = 'none'
    const stopResizing = () => {
      this.style.overflowAnchor = oldOverflowAnchor
      window.removeEventListener('mouseup', stopResizing, { once: true })
      window.removeEventListener('mousemove', onMouseMove, { passive: true })
      window.removeEventListener('wheel', onMouseMove, { passive: true })
      observer.disconnect()
      target.removeAttribute('active')

      // Emit the splitter-resize event *after* recomputing all the
      // <zettlr-pane> `basis` attributes.  In particular, this transfers the
      // new flex-basis value from the `style` property of the resized panes to
      // their `basis` attribute, and trigger `pane-resize` events as
      // appropriate.
      this.recomputeSizes()
      this.dispatchEvent(new CustomEvent('splitter-resize'))
    }

    const observer = new MutationObserver(() => stopResizing())
    observer.observe(this, { childList: true })

    window.addEventListener('mouseup', stopResizing, { once: true })
  }
}
customElements.define('zettlr-splitter', Splitter)

// The <zettlr-pane> element is a piece of content that can be resized by
// dragging adjacent <zettlr-separator>.
//
// <zettlr-pane> elements have a `basis` attribute that is used to set the
// pane's width or height, depending on the containing <zettlr-splitter>'s
// orientation.
class Pane extends HTMLElement {
  constructor () {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = ':host { display: block; } :host([hidden]) { display: none; }'

    const basisStyle = document.createElement('style')
    basisStyle.setAttribute('id', 'basis')
    basisStyle.textContent = ':host { flex-basis: auto; }'

    const slot = document.createElement('slot')
    shadowRoot.appendChild(style)
    shadowRoot.appendChild(slot)
  }

  static get observedAttributes () { return ['basis'] }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'basis') {
      const basisStyle = this.shadowRoot.getElementById('basis')
      basisStyle.textContent = `:host { flex-basis: ${newValue === null ? '0' : newValue}; }`
      this.dispatchEvent(new CustomEvent('pane-resize'))
    }
  }

  get basis () {
    return this.getAttribute('basis')
  }

  set basis (value) {
    this.style.removeProperty('flex-basis')
    this.setAttribute('basis', value.trim())
  }
}
customElements.define('zettlr-pane', Pane)

/* The <zettlr-separator> element is a separator that can be dragged to resize
 * adjacent panes.
 *
 * The default style for separators is very basic: it is simply a 1 pixel wide
 * black line.  Separators should be styled appropriately depending on context.
 *
 * Separators have their `flex-shrink` and `flex-grow` properties set to `0` so
 * that they do not change size with their container, irrespective of available
 * positive or negative space.
 */
class Separator extends HTMLElement {
  constructor () {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = `
:host { display: block; flex: 0 0 1px; background: black; }
:host([hidden]) { display: none; }
`
    shadowRoot.appendChild(style)
  }

  // `separator.getEnclosingVisualElements()` returns a pair of HTMLElement
  // (i.e. it does not include text nodes) `[ previous, next ]` such that
  // `previous` immmediately precedes `separator` in visual order, and
  // `separator` immediately precedes `next` in visual order, where the visual
  // order is the one defined through the CSS `order` property.
  getEnclosingVisualElements () {
    // Consider a list of nodes:
    //
    //    N_1, ..., N_{i-1}, N_i, N_{i+1}, ..., N_n
    //
    // where we want to find the previous and next *visual* siblings for node
    // N_i.
    //
    // We will split the list into three segments: an initial segment, a
    // central segment, and a final segment.  Initially, the initial segment
    // contains the nodes N_1, ..., N_{i-1}; the central segment only contains
    // node N_i, and the final segment contains the nodes N_{i+1}, ..., N_n.
    //
    // We say that a node is a "visual predecessor" if it has a visual order
    // strictly less than the target node N_i, and a "visual successor" if it
    // has a visual order strictly larger than the target node N_i.
    //
    // We maintain two pointers to the current predecessor and the current
    // successor nodes, which are the node with greatest (resp. lowest) visual
    // order amongst the visual predecessors (resp. visual successors) in the
    // central segment.
    //
    // By definition, the previous (resp. next) visual sibling is the node with
    // greatest (resp. lowest) visual oder amongst the visual predecessors
    // (resp. visual successors) in the whole list, hence, if we make the
    // central segment grow to the whole list while maintaining the invariant,
    // the current predecessor (resp. current successor) will be the previous
    // (resp. next) visual sibling.
    //
    // We can extend the central segment either to the left or to the right,
    // updating the current predecessor and successor depending on the visual
    // order.  When extending to the left (resp. the right), new nodes are
    // always before (resp. after) the central segment in the DOM, hence it is
    // enough to compare the CSS order property to compare the visual orders.
    //
    // In many cases, we do not have to extend the central segment to the full
    // list.  This is because if we find a node in the initial (resp. final)
    // segment with same CSS order as N_i, the first such node (counting from
    // the center to the edges) is necessarily the previous (resp. next) visual
    // sibling.  In the most common case where no CSS order is set, this means
    // we only have to look at the previous and next siblings, to give a
    // definite answer.
    //
    // For performance's sake, we bail out early when we encounter such as
    // "definite" visual sibling; hence, instead of ending up with a central
    // segment that spans the whole list, we can end up in one of the alternate
    // sitations:
    //
    //  - Definite previous and next visual siblings were found.  In this case,
    //    the initial and final segments may not be empty, but that is OK
    //    because we have definitely found the enclosing visual elements.
    //  - A definite previous visual sibling was found, but no definite next
    //    visual sibling.  The final segment is empty (because we did not find
    //    a definite next visual sibling), but if the initial segment is
    //    nonempty it could contain the next visual sibling.
    //  - Similarly, if a definite next visual sibling was found, but no
    //    definite next previous sibling, we must still look for the previous
    //    sibling in the final segment.
    //
    // In the second (resp. third) cases, we must look through the initial
    // (resp. final) segment for the next (resp. previous) visual sibling.
    // This time, we will look from the start (resp. end) of the segment: we
    // know that we have already looked through the final (resp. initial)
    // segment without finding a node with the target CSS order, hence the
    // first (resp. last) node with the next (resp. previous) CSS order is
    // definitely the previous (resp. next) visual sibling.  For instance, if
    // we have a sequence of CSS order: 5, ..., 4, 3, 2, 1 and our target
    // node is the node with CSS order 4, its next visual sibling is definitely
    // the first node with CSS order 5.
    //
    // One final note is that we skip over hidden elements (i.e. elements with
    // "display: none" or "visibility: collapse") because they don't take space
    // in the layout and hence don't really have a "visual" order.  Nodes that
    // are otherwise invisible but do take layout space, e.g. nodes with
    // "visibility: hidden" or "opacity: 0", are *not* skipped over.
    // Zero-width (or zero-height, depending on the direction) nodes are *not*
    // skipped, even though they don't take space in the layout either, because
    // we still want to be able to resize them.

    const getOrder = (node) => node === null ? null : parseInt(getComputedStyle(node).order, 10)
    const targetOrder = getOrder(this)

    const isHidden = (element) => {
      const style = getComputedStyle(element)
      return style.visibility === 'collapse' || style.display === 'none'
    }

    const isLt = (a, b) => {
      return (a === null || b === null || a < b)
    }

    const isLe = (a, b) => {
      return (a === null || b === null || a <= b)
    }

    let rangeStart = this
    let rangeEnd = this

    // These are [order, element] pairs
    let currentPredecessor = [ null, null ]
    let currentSuccessor = [ null, null ]

    // Look for the previous visual sibling in the initial segment.
    while ((rangeStart = rangeStart.previousElementSibling) !== null) {
      if (isHidden(rangeStart)) continue

      const cursorOrder = getOrder(rangeStart)

      // currentPredecessorOrder < cursorOrder <= targetOrder
      if (isLt(currentPredecessor[0], cursorOrder) && isLe(cursorOrder, targetOrder)) {
        currentPredecessor = [ cursorOrder, rangeStart ]

        if (cursorOrder === targetOrder) break
      }

      // targetOrder < cursorOrder <= currentSuccessorOrder
      if (isLt(targetOrder, cursorOrder) && isLe(cursorOrder, currentSuccessor[0])) {
        currentSuccessor = [ cursorOrder, rangeStart ]
      }
    }

    // Look for the next visual sibling in the final segment.
    while ((rangeEnd = rangeEnd.nextElementSibling) !== null) {
      if (isHidden(rangeEnd)) continue

      const cursorOrder = getOrder(rangeEnd)

      // targetOrder <= cursorOrder < currentSuccessorOrder
      if (isLe(targetOrder, cursorOrder) && isLt(cursorOrder, currentSuccessor[0])) {
        currentSuccessor = [ cursorOrder, rangeEnd ]

        if (cursorOrder === targetOrder) break
      }

      // currentPredecessorOrder <= cursorOrder < targetOrder
      if (isLe(currentPredecessor[0], cursorOrder) && isLt(cursorOrder, targetOrder)) {
        currentPredecessor = [ cursorOrder, rangeEnd ]
      }
    }

    // If the current successor is not definite, and the initial segment is
    // nonempty, iterate *forward* through the initial segment, looking for a
    // better successor.
    if (currentSuccessor[0] !== targetOrder && rangeStart !== null) {
      // This loop goes forward from the first child, and the elements considered
      // are always *before* the target in the DOM.  Initially, they are before
      // the current successor, but if a better successor is found, they will be
      // *after* that new successor.  To alleviate that, decrease the order of
      // the current successor (if it exists) so that it gets overriden by
      // preceding siblings of the same order.
      if (currentSuccessor[0] !== null) currentSuccessor[0] -= 1

      let cursor = this.parentNode.firstElementChild
      while (cursor !== null && cursor !== rangeStart) {
        if (!isHidden(cursor)) {
          const cursorOrder = getOrder(cursor)

          // targetOrder < cursorOrder < currentSuccessorOrder
          if (isLt(targetOrder, cursorOrder) && isLt(cursorOrder, currentSuccessor[0])) {
            currentSuccessor = [ cursorOrder, cursor ]

            if (cursorOrder === targetOrder + 1) break
          }
        }

        cursor = cursor.nextElementSibling
      }
    }

    // Similarly, if the current predecessor is not definite, and the final
    // segment is not empty, look for a better predecessor in the final
    // segment.
    if (currentPredecessor[0] !== targetOrder && rangeEnd !== null) {
      if (currentPredecessor[0] !== null) currentPredecessor[0] += 1

      let cursor = this.parentNode.lastElementChild
      while (cursor !== null && cursor !== rangeEnd) {
        if (!isHidden(cursor)) {
          const cursorOrder = getOrder(cursor)

          // currentPredecessorOrder < cursorOrder < targetOrder
          if (isLt(currentPredecessor[0], cursorOrder) && isLt(cursorOrder, targetOrder)) {
            currentPredecessor = [ cursorOrder, cursor ]

            if (cursorOrder === targetOrder - 1) break
          }
        }

        cursor = cursor.previousElementSibling
      }
    }

    return [ currentPredecessor[1], currentSuccessor[1] ]
  }
}
customElements.define('zettlr-separator', Separator)
