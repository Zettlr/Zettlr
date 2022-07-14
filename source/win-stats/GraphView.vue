<template>
  <div id="graph-container">
    <div id="controls" ref="controls">
      <Checkbox
        v-model="includeIsolates"
        v-bind:label="'Include isolates'"
        v-bind:name="'isolates'"
        v-bind:inline="true"
      ></Checkbox>
      <Checkbox
        v-model="showLabels"
        v-bind:label="'Show labels'"
        v-bind:name="'labels'"
        v-bind:inline="true"
      ></Checkbox>
      <ButtonElement
        v-bind:icon="'target'"
        v-bind:disabled="offsetX === 0 && offsetY === 0"
        v-bind:inline="true"
        v-on:click="offsetX = 0; offsetY = 0"
      ></ButtonElement>
      <SelectElement
        v-model="componentFilter"
        v-bind:options="selectableComponents"
        v-bind:inline="true"
      ></SelectElement>
      <TextElement
        v-model="highlightFilter"
        v-bind:placeholder="'Highlight vertices'"
        v-bind:inline="true"
      ></TextElement>
    </div>
    <div id="graph" ref="container"></div>

    <!-- Show a loading indicator while the graph is building -->
    <transition name="fade">
      <div v-if="isBuildingGraph" id="loading-indicator">
        <p>Building graph &hellip; ({{ buildProgress.currentFile }}/{{ buildProgress.totalFiles }} files processed)</p>
        <ProgressElement
          v-bind:value="buildProgress.currentFile"
          v-bind:max="buildProgress.totalFiles"
        ></ProgressElement>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { GraphArc, GraphVertex, LinkGraph } from '@dts/common/graph'
import * as d3 from 'd3'
import Checkbox from '@common/vue/form/elements/Checkbox.vue'
import ButtonElement from '@common/vue/form/elements/Button.vue'
import ProgressElement from '@common/vue/form/elements/Progress.vue'
import SelectElement from '@common/vue/form/elements/Select.vue'
import TextElement from '@common/vue/form/elements/Text.vue'
import tippy from 'tippy.js'
import { SimulationNodeDatum } from 'd3'
import DirectedGraph from '@providers/links/directed-graph'
import { MDFileMeta } from '@dts/common/fsal'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'GraphView',
  components: {
    Checkbox,
    ButtonElement,
    ProgressElement,
    SelectElement,
    TextElement
  },
  data: function () {
    return {
      // This is a lock variable to prevent multiple identical graphs from
      // building at the same time.
      isBuildingGraph: false,
      buildProgress: {
        currentFile: 0,
        totalFiles: 0
      },
      // The following array contains all components that are not isolates
      components: [] as string[],
      componentFilter: '', // Can hold the name of a specific component
      highlightFilter: '',
      includeIsolates: true,
      showLabels: false,
      // These two variables are required to enable scrolling, they mark an
      // offset to which the viewport will be relatively positioned
      offsetX: 0,
      offsetY: 0,
      graphWidth: 0,
      graphHeight: 0,
      // This variable contains zoom information
      zoomFactor: 1,
      graph: null as LinkGraph|null,
      // Store the D3 elements
      graphElement: null as d3.Selection<SVGSVGElement, undefined, null, undefined>|null,
      simulation: null as d3.Simulation<d3.SimulationNodeDatum, undefined>|null,
      // Add an observer to resize the SVG element as necessary
      controlsObserver: new ResizeObserver(this.updateGraphSize as ResizeObserverCallback)
    }
  },
  computed: {
    selectableComponents: function (): any {
      const ret: any = {
        '': 'All components'
      }

      for (const component of this.components) {
        ret[component] = component
      }

      return ret
    },
    containerElement: function (): HTMLDivElement {
      return this.$refs.container as HTMLDivElement
    },
    controlsElement: function (): HTMLDivElement {
      return this.$refs.controls as HTMLDivElement
    },
    graphViewBox: function (): [number, number, number, number] {
      const width = this.graphWidth * this.zoomFactor
      const height = this.graphHeight * this.zoomFactor
      const left = -width / 2 + this.offsetX
      const top = -height / 2 + this.offsetY
      return [ left, top, width, height ]
    }
  },
  watch: {
    includeIsolates: function () {
      if (this.graph !== null) {
        this.startSimulation(this.graph)
      }
    },
    showLabels: function () {
      if (this.graph !== null) {
        this.startSimulation(this.graph)
      }
    },
    // We only need to watch the graphViewBox, since that depends on all
    // required properties and gets recomputed (width, height, and offset)
    graphViewBox: function () {
      this.setSize()
    },
    componentFilter: function () {
      if (this.graph !== null) {
        this.startSimulation(this.graph)
      }
    },
    /**
     * Whenever the user types anything into the highlight filter, this function
     * updates the matched elements, that is: it reduces the set of highlighted
     * vertices to the ones matching the query
     */
    highlightFilter: function () {
      if (this.graphElement === null) {
        return
      }

      const query = this.highlightFilter.toLowerCase()

      // Reset if the filter is empty
      if (query.trim() === '') {
        this.graphElement
          .selectAll('#vertex-container g')
          .select('circle')
          .attr('class', null)
          .attr('opacity', null)

        this.offsetX = 0
        this.offsetY = 0
        return
      }

      // Create two selections, one containing the matching elements, one the
      // not matched elements
      const matches = this.graphElement.selectAll('#vertex-container g')
        .filter((datum: any) => {
          return (datum.id as string).toLowerCase().includes(query)
        }).select('circle')

      const nonmatches = this.graphElement.selectAll('#vertex-container g')
        .filter((datum: any) => {
          return !(datum.id as string).toLowerCase().includes(query)
        }).select('circle')

      // Style both groups accordingly
      matches.attr('class', 'highlight').attr('opacity', null)
      nonmatches.attr('class', null).attr('opacity', '0.2')

      if (matches.size() === 0) {
        this.offsetX = 0
        this.offsetY = 0
        return // Nothing more to do
      }

      // Finally, center the view evenly spaced in the middle between all
      // selected elements
      const X: number[] = []
      const Y: number[] = []
      matches.each((datum: any) => {
        X.push(datum.x as number)
        Y.push(datum.y as number)
      })

      const meanX = X.reduce((prev, curr) => prev + curr, 0) / X.length
      const meanY = Y.reduce((prev, curr) => prev + curr, 0) / Y.length
      this.offsetX = meanX
      this.offsetY = meanY
    }
  },
  mounted: function () {
    this.controlsObserver.observe(this.controlsElement, { box: 'border-box' })

    this.graphElement = d3.create('svg')
      .attr('width', this.graphWidth)
      .attr('height', this.graphHeight)
      .attr('viewBox', this.graphViewBox)
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

    // Hook into the zoom behavior, and misuse the wheel-event emitted by it in
    // order to reposition the center of the viewport
    const graphComponent = this
    this.graphElement.call(d3.zoom<SVGSVGElement, any>())
      .on('wheel.zoom', function (event: WheelEvent) {
        // What we do here is take the cursor offset from the container center
        // as well as the SVG offset and also move the SVG based on where the
        // cursor is. This mimicks somewhat the Google Maps approach to always
        // also move the map ever so slightly towards wherever the cursor is
        // pointing. But the behavior can certainly be imporved I guess.
        const containerRect = graphComponent.containerElement.getBoundingClientRect()
        const cursorY = event.clientY - containerRect.y
        const cursorX = event.clientX - containerRect.x
        const centerContainerX = containerRect.width / 2
        const centerContainerY = containerRect.height / 2
        const centerSVGX = graphComponent.offsetX
        const centerSVGY = graphComponent.offsetY
        const cursorOffsetX = cursorX - centerContainerX
        const cursorOffsetY = cursorY - centerContainerY
        const scalingFactor = 0.1 / graphComponent.zoomFactor

        if (event.deltaY < 0) {
          graphComponent.offsetX += (cursorOffsetX - centerSVGX) * scalingFactor
          graphComponent.offsetY += (cursorOffsetY - centerSVGY) * scalingFactor
        }

        graphComponent.zoomFactor += (event.deltaY > 0) ? 0.1 : -0.1
        if (graphComponent.zoomFactor < 0.1) {
          graphComponent.zoomFactor = 0.1
        }
      })

    const graphElement = this.graphElement.node()
    if (graphElement !== null) {
      this.containerElement.appendChild(graphElement)
    }

    // // Finally, retrieve the graph
    this.buildGraph().catch(err => console.error(err))

    // Listen to any changes
    ipcRenderer.on('links', () => {
      this.buildGraph().catch(err => console.error(err))
    })
  },
  unmounted: function () {
    this.controlsObserver.unobserve(this.controlsElement)
  },
  methods: {
    /**
     * This callback is called whenever the size of the controls element changes
     */
    updateGraphSize: function () {
      const controlsHeight = this.controlsElement.getBoundingClientRect().height
      const padValue = 20 // Twice the padding applied to the graph container
      this.containerElement.style.top = `${controlsHeight + padValue}px`

      const { width, height } = this.containerElement.getBoundingClientRect()
      this.graphWidth = width
      this.graphHeight = height
    },
    /**
     * This callback is called whenever the cached graph size needs to update
     */
    setSize: function () {
      if (this.graphElement !== null) {
        this.graphElement
          .attr('width', this.graphWidth)
          .attr('height', this.graphHeight)
          .attr('viewBox', this.graphViewBox)
      }
    },
    /**
     * This starts or re-starts the force simulation of the graph. Always called
     * when there is new graph data
     *
     * @param   {LinkGraph}  graph  The graph to simulate
     */
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

      // Now we have to do some magic. What we need to know is the size of each
      // component. This is similar to a Python counter, but utilizing a JS map
      const compMap = new Map<string, number>()

      for (const node of this.graph.nodes) {
        if (!compMap.has(node.component)) {
          compMap.set(node.component, 0)
        }

        const counter = compMap.get(node.component) as number
        compMap.set(node.component, counter + 1)
      }

      const unsorted: Array<[string, number]> = []

      this.components = []

      for (const [ component, size ] of compMap) {
        if (size > 1) {
          unsorted.push([ component, size ])
        }
      }

      unsorted.sort((a, b) => b[1] - a[1])
      for (const [component] of unsorted) {
        this.components.push(component)
      }

      // NOTE: We must under all circumstances map the values here to create a
      // deep copy, since d3 messes with the objects and modifies them! Otherwise
      // the logic here will break down. The same holds true for the links below.
      const includedNodes = this.graph.nodes
        .map(node => {
          return {
            component: node.component,
            id: node.id,
            isolate: node.isolate,
            label: node.label
          }
        })
        .filter(node => (this.includeIsolates) ? true : !node.isolate)
        .filter(node => {
          if (this.componentFilter !== '') {
            return node.component === this.componentFilter
          }

          return true
        })

      // Since we kick a lot of nodes out above, we also must also remove links
      // that point into the desert
      const includedLinks = this.graph.links
        .map(link => {
          return {
            source: link.source,
            target: link.target,
            weight: link.weight
          }
        })
        .filter(link => {
          const source = includedNodes.find(node => node.id === link.source)
          const target = includedNodes.find(node => node.id === link.target)
          return source !== undefined && target !== undefined
        })

      const svg = this.graphElement

      if (this.simulation === null) {
        const forceLink = d3.forceLink<GraphVertex & SimulationNodeDatum, GraphArc>(includedLinks).id((node, i, nodesData) => node.id).strength((link, i) => link.weight * 2)
        this.simulation = d3.forceSimulation(includedNodes as any)
          .force('link', forceLink)
          .force('charge', d3.forceManyBody())
          .force('collide', d3.forceCollide(5))
          .force('x', d3.forceX())
          .force('y', d3.forceY())
          .on('tick', function () {
            svg.selectAll('#arc-container line')
              .attr('x1', (d: any) => d.source.x)
              .attr('y1', (d: any) => d.source.y)
              .attr('x2', (d: any) => d.target.x)
              .attr('y2', (d: any) => d.target.y)

            svg.selectAll('#vertex-container g')
              .select('circle')
              .attr('cx', (d: any) => d.x)
              .attr('cy', (d: any) => d.y)

            svg.selectAll('#vertex-container g')
              .select('text')
              .attr('x', (d: any) => d.x + 5) // NOTE: 5 is here the radius!
              .attr('y', (d: any) => d.y - 5)
          })
      } else {
        // If the simulation already exists, we can simply update it
        this.simulation.nodes(includedNodes as any).alpha(1).alphaTarget(0).restart()
        const link = this.simulation.force('link') as d3.ForceLink<GraphVertex & d3.SimulationNodeDatum, GraphArc>
        const charge = this.simulation.force('charge') as d3.ForceManyBody<d3.SimulationNodeDatum>
        const coll = this.simulation.force('collide') as d3.ForceCollide<d3.SimulationNodeDatum>
        link.links(includedLinks)
        link.initialize(includedNodes, () => Math.random() * 5)
        charge.initialize(includedNodes as any[], () => 1)
        coll.initialize(includedNodes as any[], () => Math.random() * 5)
      }

      const linkSelection = svg.select('#arc-container')
        .selectAll('line')
        .data(includedLinks)
      linkSelection.exit().remove()
      linkSelection.enter().append('line')
        .attr('stroke-width', (name, index) => includedLinks[index].weight)
        .attr('stroke', '#999') // Color

      svg.select('#vertex-container')
        .selectAll('g')
        .data(includedNodes, (vertex: any) => vertex.id)
        .join(
          (enter) => {
            const groupSelection = enter.append('g')

            groupSelection
              .append('circle')
              .attr('r', 5)
              .attr('fill', (vertex, value) => (vertex.isolate) ? color(ISOLATES_CLASS) : color(vertex.component))
              .on('click', (event, vertex) => {
                ipcRenderer.invoke('application', {
                  command: 'open-file',
                  payload: { path: vertex.id }
                }).catch(err => console.error(err))
              })
              .attr('data-tippy-content', (vertex) => {
                let cnt = ''
                if (vertex.label === undefined) {
                  cnt += vertex.id
                } else {
                  cnt += vertex.label
                }

                cnt += ` (${vertex.component})`

                return cnt
              })

            if (this.showLabels) {
              groupSelection
                .append('text')
                .attr('font-size', '8px')
                .attr('font-weight', '100')
                .attr('stroke', '#666')
                .text((d: any) => { return d.label ?? d.id })
            }

            return groupSelection
          },
          (update) => {
            // Remove the text and then conditionally re-apply it
            update.select('text').remove()
            if (this.showLabels) {
              update
                .append('text')
                .attr('font-size', '8px')
                .attr('font-weight', '100')
                .attr('stroke', '#666')
                .text((d: any) => { return d.label ?? d.id })
            }

            return update
          },
          (exit) => {
            return exit.remove()
          }
        )

      tippy(svg.select('#vertex-container').selectAll('circle').nodes() as any[])
    },
    /**
     * This function builds a graph from scratch. It is asynchronous since it
     * has to resolve all file links to existing files if possible (to prevent
     * spurious links). With about 2,000 files it takes approximately 10 seconds
     * to finish (on a high-end MacBook Pro M1 2020, 13inch)
     */
    buildGraph: async function () {
      if (this.isBuildingGraph) {
        return console.warn('Cannot build graph: Another process is currently building a graph!')
      }

      this.isBuildingGraph = true
      // We have to build the graph in the renderer because in main OH BOY IT'S
      // A DISASTER. Even with my limited amount of files the whole app locks
      // for 10-15 seconds (!)
      // Here we do that shit asynchronously, therefore not blocking the main
      // process.
      const dbObject = await ipcRenderer.invoke('link-provider', { command: 'get-link-database' })
      const database = new Map<string, string[]>(Object.entries(dbObject))

      this.buildProgress.currentFile = 0
      this.buildProgress.totalFiles = Object.entries(dbObject).length
      this.componentFilter = ''

      const DG = new DirectedGraph()
      const resolvedLinks = new Map<string, string>()

      const startTime = performance.now()
      DG.startOperation()
      // Fortunately, the fileLinkDatabase is basically just one large edgelist
      for (const [ sourcePath, targets ] of database) {
        this.buildProgress.currentFile += 1
        // We have to specifically add the source, since isolates will have 0
        // targets, and hence we cannot rely on the Graph adding these vertices
        DG.addVertex(sourcePath)
        for (const target of targets) {
          // Before adding a target, we MUST resolve the link to an actual file
          // path if possible. This is necessary because there are at least two
          // ways to link to notes: by filename or by ID. By resolving what we
          // can, we prevent spurious duplicates. The resolve() helper will either
          // return the full absolute path to the file identified by `target` or
          // the unaltered `target`.
          if (!resolvedLinks.has(target)) {
            const found: MDFileMeta|undefined = await ipcRenderer.invoke('application', { command: 'find-exact', payload: target })
            if (found === undefined) {
              // This will create a vertex representing a latent (i.e. not yet
              // existing) file.
              resolvedLinks.set(target, target)
            } else {
              resolvedLinks.set(target, found.path)
            }
          }
          DG.addArc(sourcePath, resolvedLinks.get(target) as string)
        }
      }
      DG.endOperation()

      // Now set the labels (i.e. the filenames)
      for (const V of DG.vertices) {
        DG.setLabel(V.id, window.path.basename(V.id))
      }

      const duration = performance.now() - startTime
      console.log(`[Link Provider] Graph constructed in ${Math.round(duration)}ms. Graph contains ${DG.countVertices} nodes, ${DG.countArcs} arcs and ${DG.countComponents} components.`)
      this.isBuildingGraph = false
      this.startSimulation(DG.graph)
    }
  }
})
</script>

<style lang="less">
/* This animation pulsates a key if it has the class "pulse" */
@keyframes pulsate-highlight {
  0% {
    stroke-opcaity: 1;
    stroke-width: 1;
  }
  70% {
    stroke-opacity: 0;
    stroke-width: 20;
  }
  100% {
    stroke-opacity: 0;
    stroke-width: 0;
  }
}

body {
  div#graph-container div#graph .highlight { stroke: #ff0000; }
  &.dark div#graph-container div#graph .highlight { stroke: #ffff00; }
}

div#graph-container {
  padding: 10px;
  // We need a fixed width so that the SVG is displayed full size

  p {
    // Reset the default removed margin on simple p-elements etc., which is
    // currently applied in the geometry CSS.
    margin: revert;
  }

  .fade-enter-active,
  .fade-leave-active { transition: opacity 0.5s ease; }

  .fade-enter-from,
  .fade-leave-to { opacity: 0; }

  div#graph {
    position: absolute;
    bottom: 0;
    width: calc(100% - 20px);

    // This pulsates nodes if this class is applied
    .highlight { animation: pulsate-highlight 3s infinite; }
  }

  div#loading-indicator {
    background-color: rgba(0, 0, 0, .5);
    color: white;
    text-align: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 25% 20px;
  }
}
</style>
