/* eslint-env es6 */

class Splitter extends HTMLElement {
  constructor () {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })

    // Use flexbox by default for the splitter.  Note that non-flex display
    // values will render the splitter useless, since we use flex-basis to set
    // the size. 
    const style = document.createElement('style')
    style.textContent = ':host { display: flex; } :host([hidden]) { display: none; }'

    const slot = document.createElement('slot')
    shadowRoot.appendChild(style)
    shadowRoot.appendChild(slot)
  }

  static get observedAttributes () { return ['data-direction'] }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'data-direction') {
      this.style.setProperty('flex-direction', newValue)
    }
  }

  get direction () {
    return getComputedStyle(this).getPropertyValue('flex-direction')
  }

  set direction (value) {
    this.setAttribute('data-direction', value)
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

    // Capture the event if it is a mousedown on a child Separator
    if (!target || !(target instanceof Separator) || target.parentNode !== this) return
    event.stopPropagation()
    event.preventDefault()

    const [previousSibling, nextSibling] = target.getEnclosingVisualElements()
    const previousPane = previousSibling instanceof Pane ? previousSibling : null
    const nextPane = nextSibling instanceof Pane ? nextSibling : null

    // The style object returned by getComputedStyle is live, so we don't need
    // to call that function each time
    const style = getComputedStyle(this)

    // Compute the initial sizes of the panes
    const isHorizontal = style.getPropertyValue('flex-direction').startsWith('row')
    const propertyName = isHorizontal ? 'width' : 'height'

    const computeContainerBasis = () => {
      if (style.getPropertyValue('box-sizing') === 'content-box') {
        return parseFloat(style.getPropertyValue(isHorizontal ? 'width' : 'height'))
      }

      const clientRect = this.getBoundingClientRect()
      let containerBasis = isHorizontal ? clientRect.width : clientRect.height

      if (isHorizontal) {
        containerBasis -= parseFloat(style.getPropertyValue('padding-left'))
        containerBasis -= parseFloat(style.getPropertyValue('padding-right'))
        containerBasis -= parseFloat(style.getPropertyValue('border-left-width'))
        containerBasis -= parseFloat(style.getPropertyValue('border-right-width'))
      } else {
        containerBasis -= parseFloat(style.getPropertyValue('padding-top'))
        containerBasis -= parseFloat(style.getPropertyValue('padding-bottom'))
        containerBasis -= parseFloat(style.getPropertyValue('border-top-width'))
        containerBasis -= parseFloat(style.getPropertyValue('border-bottom-width'))
      }

      return containerBasis
    }

    // Clamp to avoid separator teleportation
    const clampBases = () => {
      const delayed = []
      let containerBasis
      for (const child of this.children) {
        const childStyle = getComputedStyle(child)
        const oldBasis = childStyle.flexBasis
        if (oldBasis !== 'auto') {
          const childSize = childStyle.getPropertyValue(propertyName)

          let newBasis
          if (oldBasis.includes('%')) {
            if (containerBasis === undefined) containerBasis = computeContainerBasis()

            newBasis = `${100 * (parseFloat(childSize) / containerBasis)}%`
          } else {
            newBasis = childSize
          }

          if (newBasis !== oldBasis) delayed.push(() => {
            child.dataset.basis = newBasis
          })
        }
      }
      for (const fn of delayed) fn()
    }
    clampBases()
    // Reset done

    const panes = []

    const addPane = (pane, factor = 1) => {
      const paneStyle = getComputedStyle(pane)
      const unit = paneStyle.getPropertyValue('flex-basis').includes('%') ? '%' : 'px'
      panes.push([ pane, paneStyle, parseFloat(paneStyle.getPropertyValue(propertyName)), factor, unit ])
    }

    if (previousPane) addPane(previousPane)
    if (nextPane) addPane(nextPane, -1)

    const onMouseMove = ({ pageX, pageY }) => {
      const direction = style.getPropertyValue('flex-direction')
      const isHorizontal = direction.startsWith('row')
      let isReverse = direction.endsWith('-reverse')
      // Flexbox row layout is direction-aware, so we must be as well
      if (isHorizontal && style.getPropertyValue('direction') === 'rtl') isReverse = !isReverse

      // For relative sizes using percentages, we need to compute the container
      // basis.  It is computed on first use below.
      let containerBasis = undefined;

      // Set the new value using flex-basis, because if flex-basis is not
      // `auto`, width and height will not be taken into account.
      // This also has a better behavior when the direction changes while
      // resizing.
      const offset = (isReverse ? -1 : 1) * (isHorizontal ? pageX - initialPageX : pageY - initialPageY)
      for (const [pane, paneStyle, initialBasis, factor, unit] of panes) {
        if (paneStyle.getPropertyValue('flex-grow') !== '0') continue

        let paneBasis = Math.max(0, initialBasis + factor * offset)
        if (unit === '%') {
          if (containerBasis === undefined) containerBasis = computeContainerBasis()

          paneBasis = 100 * (paneBasis / containerBasis)
        }

        // TODO: while resizing, bypass the data-basis attribute and assign to the style directly.
        pane.dataset.basis = `${paneBasis}${unit}`
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('wheel', onMouseMove, { passive: true })

    // Stop resizing when either the mouse is released or the children of the
    // element change.  We also need to set `overflow-anchor: none;` to avoid
    // jankiness when scrolling while resizing (this is not the best idea, but
    // let's not make users suffer if we can avoid it).
    const oldOverflowAnchor = this.style.overflowAnchor
    this.style.overflowAnchor = 'none'
    const stopResizing = (observer) => {
      this.style.overflowAnchor = oldOverflowAnchor
      window.removeEventListener('mousemove', onMouseMove, { passive: true })
      window.removeEventListener('wheel', onMouseMove, { passive: true })
      observer.disconnect()
      clampBases()
    }
    const observer = new MutationObserver((_mutationList, observer) => stopResizing(observer))
    observer.observe(this, {childList: true})

    window.addEventListener('mouseup', () => stopResizing(observer), { once: true })
  }
}

class Pane extends HTMLElement {
  constructor () {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })

    // By default, panes do not grow.  The user can set some panes to grow, in
    // which case manual resizing will not apply.
    const style = document.createElement('style')
    style.textContent = ':host { display: block; flex-grow: 0; flex-shrink: 1; } :host([hidden]) { display: none; }'

    const slot = document.createElement('slot')
    shadowRoot.appendChild(style)
    shadowRoot.appendChild(slot)
  }

  static get observedAttributes () { return ['data-basis', 'data-shrink', 'data-grow', 'data-order'] }

  attributeChangedCallback (name, oldValue, newValue) {
    const setStyle = (name, value) => {
      if (value === null) this.style.removeProperty(name)
      else this.style.setProperty(name, value)
    }

    if (name === 'data-basis') {
      setStyle('flex-basis', newValue);
    } else if (name === 'data-shrink') {
      setStyle('flex-shrink', newValue)
    } else if (name === 'data-grow') {
      setStyle('flex-grow', newValue)
    } else if (name === 'data-order') {
      setStyle('order', newValue)
    }
  }

  get basis () {
    return getComputedStyle(this).getPropertyValue('flex-basis')
  }

  set basis (value) {
    this.setAttribute('data-basis', value)
  }

  get order () {
    return parseInt(getComputedStyle(this).order, 10)
  }

  set order (value) {
    this.setAttribute('data-order', value)
  }
}

class Separator extends HTMLElement {
  constructor () {
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })

    // Separators have flex-shrink and flex-grow set to 0 by default, and it is
    // a good idea to *not* change that default.
    const style = document.createElement('style')
    style.textContent = ':host { display: block; flex: 0 0 1px; background: black; } :host([hidden]) { display: none; }'
    shadowRoot.appendChild(style)
  }

  static get observedAttributes () { return ['data-order'] }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'data-order') {
      if (newValue === null) this.style.removeProperty('order')
      else this.style.setProperty('order', newValue)
    }
  }

  get order () {
    return parseInt(getComputedStyle(this).order, 10)
  }

  set order (value) {
    this.setAttribute('data-order', value)
  }

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
    let currentPredecessor = [null, null]
    let currentSuccessor = [null, null]

    // Look for the previous visual sibling in the initial segment.
    while ((rangeStart = rangeStart.previousElementSibling) !== null) {
      if (isHidden(rangeStart)) continue

      const cursorOrder = getOrder(rangeStart)

      // currentPredecessorOrder < cursorOrder <= targetOrder
      if (isLt(currentPredecessor[0], cursorOrder) && isLe(cursorOrder, targetOrder)) {
        currentPredecessor = [cursorOrder, rangeStart]

        if (cursorOrder === targetOrder) break
      }

      // targetOrder < cursorOrder <= currentSuccessorOrder
      if (isLt(targetOrder, cursorOrder) && isLe(cursorOrder, currentSuccessor[0])) {
        currentSuccessor = [cursorOrder, rangeStart]
      }
    }

    // Look for the next visual sibling in the final segment.
    while ((rangeEnd = rangeEnd.nextElementSibling) !== null) {
      if (isHidden(rangeEnd)) continue

      const cursorOrder = getOrder(rangeEnd)

      // targetOrder <= cursorOrder < currentSuccessorOrder
      if (isLe(targetOrder, cursorOrder) && isLt(cursorOrder, currentSuccessor[0])) {
        currentSuccessor = [cursorOrder, rangeEnd]

        if (cursorOrder === targetOrder) break
      }

      // currentPredecessorOrder <= cursorOrder < targetOrder
      if (isLe(currentPredecessor[0], cursorOrder) && isLt(cursorOrder, targetOrder)) {
        currentPredecessor = [cursorOrder, rangeEnd]
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
            currentSuccessor = [cursorOrder, cursor]

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
            currentPredecessor = [cursorOrder, cursor]

            if (cursorOrder === targetOrder - 1) break
          }
        }
      }
    }

    return [currentPredecessor[1], currentSuccessor[1]]
  }
}

customElements.define('zettlr-splitter', Splitter)
customElements.define('zettlr-pane', Pane)
customElements.define('zettlr-separator', Separator)
