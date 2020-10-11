/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        NoteNetwork class
 * CVM-Role:        View
 * Maintainer:      Julien Mirval
 * License:         GNU GPL v3
 *
 * Description:     This dialog lets you visualize all notes as a network.
 *
 * END HEADER
 */

const d3 = require('d3')

const ZettlrDialog = require('./zettlr-dialog.js')

class NoteNetwork extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'note-network'
    this.graph = []
  }

  preInit (data) {
    var tmpLinks = []
    var tmpNodes = []

    // Building link list
    for (const a of Object.entries(data)) {
      if (a[1].outbound) {
        for (const i of a[1].outbound) {
          if (i) {
            tmpLinks.push({ 'source': a[0], 'target': i })
          }
        }
      }
    }

    // Building node list
    for (const a of Object.entries(data)) {
      tmpNodes.push({
        'id': a[0],
        'title': a[1].name ? a[1].name.replace(a[0], '') : 'Undefined',
        'inbound': a[1].inbound ? a[1].inbound.length : 0,
        'outbound': a[1].outbound ? a[1].outbound.length : 0
      })
    }

    this.graph = {
      'nodes': tmpNodes,
      'links': tmpLinks
    }

    return this.graph
  }

  postAct () {
    const dialogWidth = this._container.width() / 2
    this.setupNetwork('visualize', dialogWidth, 3 * dialogWidth / 4)
  }

  // Open the corresponding file when a node is clicked
  clickedNote (node) {
    window.renderer.autoSearch(node.id)
    this.close()
  }

  // Sets all graph properties
  setupNetwork (target, width, height) {
    if (!this.graph) {
      return
    }

    // Fetch notes and graph them
    var color = d3.scaleOrdinal(d3.schemeCategory10)
    // var color = d3.scaleLinear().domain([0, 5]).range(["black", "blue", "green", "red"])

    var graphLayout = d3.forceSimulation(this.graph.nodes)
      .force('charge', d3.forceManyBody().strength(-6000))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(1))
      .force('y', d3.forceY(height / 2).strength(1))
      .force('link', d3.forceLink(this.graph.links).id(function (d) { return d.id }).distance(150).strength(2))
      .on('tick', ticked)

    // Remove previous svg
    d3.select('#' + target + ' > div').remove()

    var svg = d3.select('#' + target)
      .style('max-height', '60vh')
      .style('overflow-y', 'hidden')
      .append('div')
      .style('display', 'inline-block')
      .style('position', 'relative')
      .style('width', '100%')
      .style('height', '60vh')
      .style('vertical-align', 'top')
      .style('overflow', 'hidden')
      .append('svg')
      // Responsive SVG needs these 2 attributes and no width and height attr.
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      // To make it responsive.
      .style('display', 'inline-block')
      .style('position', 'absolute')
      .style('top', '10px')
      .style('left', '0')
      .style('width', '100%')
      .style('height', '100%')

    var container = svg.append('g')

    svg.call(
      d3.zoom()
        .scaleExtent([ 0.1, 4 ])
        .on('zoom', function () { container.attr('transform', d3.event.transform) })
    )

    // Add links
    var link = container.append('g')
      .selectAll('line')
      .data(this.graph.links)
      .enter()
      .append('line')
      .attr('stroke', color(1))
      .attr('stroke-width', (d) => 1)

    // Add nodes
    var node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(this.graph.nodes)
      .enter()
      .append('circle')
      .attr('r', function (d) { return 1 + d.inbound + d.outbound })
      .attr('fill', function (d) { return color(1 + d.inbound + d.outbound) })

    // Add labels
    var labels = container.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(this.graph.nodes)
      .enter().append('text')
      .attr('text-anchor', 'right')
      .attr('dominant-baseline', 'central')
      .style('font-family', 'Segoe UI')
      .style('font-size', '20px')
      .text(function (d) { return d.title })

    // Enable dragging and clicking
    // Doing it on node or labels give the same result
    node.call(
      d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
    )

    labels.call(
      d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
    )

    // Pass Data to Markdown Editor
    node.on('click', (n) => this.clickedNote(n))
    labels.on('click', (n) => this.clickedNote(n))

    function ticked () {
      node.call(updateNode)
      link.call(updateLink)

      // update label positions
      labels
        .attr('dx', function (d) { return d.x })
        .attr('dy', function (d) { return d.y })
    }

    function fixna (x) {
      if (isFinite(x)) return x
      return 0
    }

    function updateLink (link) {
      link.attr('x1', function (d) { return fixna(d.source.x) })
        .attr('y1', function (d) { return fixna(d.source.y) })
        .attr('x2', function (d) { return fixna(d.target.x) })
        .attr('y2', function (d) { return fixna(d.target.y) })
    }

    function updateNode (node) {
      node.attr('transform', function (d) {
        return 'translate(' + fixna(d.x) + ',' + fixna(d.y) + ')'
      })
    }

    function dragstarted (d) {
      d3.event.sourceEvent.stopPropagation()
      if (!d3.event.active) graphLayout.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged (d) {
      d.fx = d3.event.x
      d.fy = d3.event.y
    }

    function dragended (d) {
      if (!d3.event.active) graphLayout.alphaTarget(0)
      d.fx = null
      d.fy = null
    }
  }
}

module.exports = NoteNetwork
