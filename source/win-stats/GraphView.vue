<template>
  <div id="graph-container">
    <div id="controls">
      <Checkbox
        v-model="includeIsolates"
        v-bind:label="'Include Isolates'"
      ></Checkbox>
    </div>
    <div id="graph" ref="container"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { GraphArc, GraphVertex, LinkGraph } from '@dts/common/graph'
import * as d3 from 'd3'
import Checkbox from '@common/vue/form/elements/Checkbox.vue'
import tippy from 'tippy.js'
import { SimulationNodeDatum } from 'd3'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'GraphView',
  components: {
    Checkbox
  },
  data: function () {
    return {
      includeIsolates: true,
      contentWidth: 0,
      contentHeight: 0,
      graph: null as LinkGraph|null,
      // Store the D3 elements
      graphElement: null as d3.Selection<SVGSVGElement, undefined, null, undefined>|null,
      simulation: null as d3.Simulation<d3.SimulationNodeDatum, undefined>|null,
      // Add an observer to resize the SVG element as necessary
      observer: new ResizeObserver(this.setSize as ResizeObserverCallback)
    }
  },
  computed: {
    containerElement: function (): HTMLDivElement {
      return this.$refs.container as HTMLDivElement
    }
  },
  watch: {
    includeIsolates: function () {
      if (this.graph !== null) {
        this.startSimulation(this.graph)
      }
    }
  },
  mounted: function () {
    this.observer.observe(this.containerElement, { box: 'border-box' })

    const rect = this.containerElement.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    this.graphElement = d3.create('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [ -width / 2, -height / 2, width, height ])
      .attr('style', 'max-width: 100%; height: auto;')

    // Let's create a link-container as an SVG group to add some default
    // attributes to the individual links
    this.graphElement.append('g')
      .attr('id', 'arc-container')
      .attr('stroke', '#999') // Color
      .attr('stroke-opacity', 0.6) // Opacity
      .attr('stroke-linecap', 'round')
    // The same for nodes
    this.graphElement.append('g')
      .attr('id', 'vertex-container')
      .attr('fill', '#36f')
      .attr('stroke', '#fff')
      .attr('stroke-opacity', 1.0)
      .attr('stroke-width', 1.5)
      .attr('style', 'cursor: pointer; outline: none')

    // TODO: Enable below's zoom/scroll functionality once it works properly
    // const svg = this.graphElement
    // const zoomContainer = svg.call(d3.zoom<SVGSVGElement, any>().on('zoom', function (event, d) {
    //   zoomContainer.attr('transform', event.transform)
    // }))
    // .on('wheel.zoom', function (event: WheelEvent) {
    //   svg.selectAll('#arc-container line')
    //     .attr('x1', (d: any) => {
    //       d.source.x += event.deltaX
    //       return d.source.x
    //     })
    //     .attr('y1', (d: any) => {
    //       d.source.y += event.deltaY
    //       return d.source.y
    //     })
    //     .attr('x2', (d: any) => {
    //       d.target.x += event.deltaX
    //       return d.target.x
    //     })
    //     .attr('y2', (d: any) => {
    //       d.target.y += event.deltaY
    //       return d.target.y
    //     })

    //   svg.selectAll('#vertex-container circle')
    //     .attr('cx', (d: any) => {
    //       d.x += event.deltaX
    //       return d.x
    //     })
    //     .attr('cy', (d: any) => {
    //       d.y += event.deltaY
    //       return d.y
    //     })
    // })

    const graphElement = this.graphElement.node()
    if (graphElement !== null) {
      this.containerElement.appendChild(graphElement)
    }

    // Finally, retrieve the graph
    ipcRenderer.invoke('link-provider', { command: 'get-graph' })
      .then(graph => { this.startSimulation(graph) })
      .catch(e => console.error(e))

    // Listen to any changes
    ipcRenderer.on('links', () => {
      ipcRenderer.invoke('link-provider', { command: 'get-graph' })
        .then(graph => { this.startSimulation(graph) })
        .catch(e => console.error(e))
    })
  },
  unmounted: function () {
    this.observer.unobserve(this.containerElement)
  },
  methods: {
    setSize: function (entries: ResizeObserverEntry[], observer: ResizeObserver) {
      const { width, height } = this.containerElement.getBoundingClientRect()

      if (this.graphElement !== null) {
        this.graphElement
          .attr('width', width)
          .attr('height', height)
          .attr('viewBox', [ -width / 2, -height / 2, width, height ])
      }
    },
    startSimulation (graph: LinkGraph) {
      if (this.graphElement === null) {
        throw new Error('startSimulation called before the SVG was instantiated!')
      }

      this.graph = graph

      const ISOLATES_CLASS = 'Isolates'

      // Isolates have their own component, so we need to filter these out to
      // have all isolates in a single color
      const reduced = this.graph.nodes.map(node => (node.isolate) ? ISOLATES_CLASS : node.component)
      const color = d3.scaleOrdinal([...new Set(reduced)], d3.schemeTableau10)
      const includedNodes = this.graph.nodes.filter(node => (this.includeIsolates) ? true : !node.isolate)

      // Construct the forces.
      // const forceNode = d3.forceManyBody().strength((vertex, i, data) => -30)
      const svg = this.graphElement

      if (this.simulation === null) {
        const forceLink = d3.forceLink<GraphVertex & SimulationNodeDatum, GraphArc>(this.graph.links).id((nodes, i, nodesData) => includedNodes[i].id)
        this.simulation = d3.forceSimulation(includedNodes as any)
          .force('link', forceLink)
          .force('charge', d3.forceManyBody())
          .force('x', d3.forceX())
          .force('y', d3.forceY())
          .on('tick', function () {
            svg.selectAll('#arc-container line')
              .attr('x1', (d: any) => d.source.x)
              .attr('y1', (d: any) => d.source.y)
              .attr('x2', (d: any) => d.target.x)
              .attr('y2', (d: any) => d.target.y)

            svg.selectAll('#vertex-container circle')
              .attr('cx', (d: any) => d.x)
              .attr('cy', (d: any) => d.y)
          })
      } else {
        // If the simulation already exists, we can simply update it
        this.simulation.nodes(includedNodes as any).alpha(1).alphaTarget(0).restart()
        const l = this.simulation.force('link') as d3.ForceLink<GraphVertex & d3.SimulationNodeDatum, GraphArc>
        const c = this.simulation.force('charge') as d3.ForceManyBody<d3.SimulationNodeDatum>
        l.links(this.graph.links)
        l.initialize(includedNodes, () => Math.random() * 5)
        c.initialize(includedNodes as any[], () => 1)
      }

      const linkSelection = svg.select('#arc-container').selectAll('line').data(graph.links)
      linkSelection.exit().remove()
      linkSelection.enter().append('line')
        .attr('stroke-width', (name, index) => this.graph?.links[index].weight ?? 1)
        .attr('stroke', '#999') // Color

      const vertexSelection = svg.select('#vertex-container').selectAll('circle').data(includedNodes)
      vertexSelection.exit().remove()
      vertexSelection.enter().append('circle')
        .attr('r', 5)
        .attr('fill', (vertex, value) => (vertex.isolate) ? color(ISOLATES_CLASS) : color(vertex.component))
        .on('click', (event, vertex) => {
          ipcRenderer.invoke('application', {
            command: 'open-file',
            payload: { path: vertex.id }
          }).catch(err => console.error(err))
        })
        .attr('data-tippy-content', (vertex) => vertex.label)

      tippy(svg.select('#vertex-container').selectAll('circle').nodes() as any[])
    }
  }
})
</script>

<style lang="less">
div#graph-container {
  padding: 10px;
  // We need a fixed width so that the SVG is displayed full size

  * {
    // Reset the default removed margin on simple p-elements etc., which is
    // currently applied in the geometry CSS.
    margin: revert;
  }

  @controlHeight: 75px;

  div#controls {
    height: @controlHeight;
  }

  div#graph {
    position: absolute;
    top: @controlHeight;
    bottom: 0;
    width: 100%;
  }
}
</style>
