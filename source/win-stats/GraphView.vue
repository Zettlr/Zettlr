<template>
  <div id="graph-container">
    <div id="controls" ref="controlsElement">
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
    <div id="graph" ref="containerElement"></div>

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

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import Checkbox from '@common/vue/form/elements/CheckboxControl.vue'
import ButtonElement from '@common/vue/form/elements/ButtonControl.vue'
import ProgressElement from '@common/vue/form/elements/ProgressControl.vue'
import SelectElement from '@common/vue/form/elements/SelectControl.vue'
import TextElement from '@common/vue/form/elements/TextControl.vue'
import tippy from 'tippy.js'
import { type SimulationNodeDatum } from 'd3'
import DirectedGraph, { type GraphArc, type GraphVertex, type LinkGraph } from './directed-graph'
import { type MDFileDescriptor } from '@dts/common/fsal'
import type { DocumentManagerIPCAPI } from 'source/app/service-providers/documents'

const ipcRenderer = window.ipc

// This is a lock variable to prevent multiple identical graphs from
// building at the same time.
const isBuildingGraph = ref(false)
const buildProgress = ref<{ currentFile: number, totalFiles: number }>({ currentFile: 0, totalFiles: 0 })
const fileGraph = ref<LinkGraph|undefined>(undefined)
// The following array contains all components that are not isolates
const components = ref<string[]>([])
const componentFilter = ref('') // Can hold the name of a specific component
const highlightFilter = ref('')
const includeIsolates = ref(true)
const showLabels = ref(false)
// These two variables are required to enable scrolling, they mark an
// offset to which the viewport will be relatively positioned
const offsetX = ref(0)
const offsetY = ref(0)
const graphWidth = ref(0)
const graphHeight = ref(0)
// This variable contains zoom information
const zoomFactor = ref(1)
// Store the D3 elements
const graphElement = ref<d3.Selection<SVGSVGElement, undefined, null, undefined>|null>(null)
const simulation = ref<d3.Simulation<d3.SimulationNodeDatum, undefined>|null>(null)
// Add an observer to resize the SVG element as necessary
const controlsObserver = new ResizeObserver(updateGraphSize)

const selectableComponents = computed(() => {
  const ret: Record<string, string> = {
    '': 'All components'
  }

  for (const component of components.value) {
    ret[component] = component
  }

  return ret
})

const containerElement = ref<HTMLDivElement|null>(null)
const controlsElement = ref<HTMLDivElement|null>(null)
const graphViewBox = computed<[number, number, number, number]>(() => {
  const width = graphWidth.value * zoomFactor.value
  const height = graphHeight.value * zoomFactor.value
  const left = -width / 2 + offsetX.value
  const top = -height / 2 + offsetY.value
  return [ left, top, width, height ]
})

watch(includeIsolates, startSimulation)
watch(showLabels, startSimulation)
watch(componentFilter, startSimulation)

// We only need to watch the graphViewBox, since that depends on all
// required properties and gets recomputed (width, height, and offset)
watch(graphViewBox, setSize)

/**
 * Whenever the user types anything into the highlight filter, this function
 * updates the matched elements, that is: it reduces the set of highlighted
 * vertices to the ones matching the query
 */
watch(highlightFilter, () => {
  if (graphElement.value === null) {
    return
  }

  const query = highlightFilter.value.toLowerCase()

  // Reset if the filter is empty
  if (query.trim() === '') {
    graphElement.value
      .selectAll('#vertex-container g')
      .select('circle')
      .attr('class', null)
      .attr('opacity', null)

    offsetX.value = 0
    offsetY.value = 0
    return
  }

  // Create two selections, one containing the matching elements, one the
  // not matched elements
  const matches = graphElement.value.selectAll('#vertex-container g')
    .filter((datum: any) => {
      return (datum.id as string).toLowerCase().includes(query)
    }).select('circle')

  const nonmatches = graphElement.value.selectAll('#vertex-container g')
    .filter((datum: any) => {
      return !(datum.id as string).toLowerCase().includes(query)
    }).select('circle')

  // Style both groups accordingly
  matches.attr('class', 'highlight').attr('opacity', null)
  nonmatches.attr('class', null).attr('opacity', '0.2')

  if (matches.size() === 0) {
    offsetX.value = 0
    offsetY.value = 0
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
  offsetX.value = meanX
  offsetY.value = meanY
})

onMounted(() => {
  if (containerElement.value === null || controlsElement.value === null) {
    throw new Error('Could not set up graph: Container or controls were not injected onto page!')
  }

  controlsObserver.observe(controlsElement.value, { box: 'border-box' })

  graphElement.value = d3.create('svg')
    .attr('width', graphWidth.value)
    .attr('height', graphHeight.value)
    .attr('viewBox', graphViewBox.value)
    .attr('style', 'max-width: 100%; height: auto;')

  // Let's create a link-container as an SVG group to add some default
  // attributes to the individual links
  graphElement.value.append('g')
    .attr('id', 'arc-container')
    .attr('stroke', '#999') // Color
    .attr('stroke-opacity', 0.6) // Opacity
    .attr('stroke-linecap', 'round')
  // The same for nodes
  graphElement.value.append('g')
    .attr('id', 'vertex-container')
    .attr('fill', '#36f')
    .attr('stroke', '#fff')
    .attr('stroke-opacity', 1.0)
    .attr('stroke-width', 1.5)
    .attr('style', 'cursor: pointer; outline: none')

  // Hook into the zoom behavior, and misuse the wheel-event emitted by it in
  // order to reposition the center of the viewport
  graphElement.value.call(d3.zoom<SVGSVGElement, any>())
    .on('wheel.zoom', (event: WheelEvent) => {
      if (containerElement.value === null) {
        return
      }

      // What we do here is take the cursor offset from the container center
      // as well as the SVG offset and also move the SVG based on where the
      // cursor is. This mimics somewhat the Google Maps approach to always
      // also move the map ever so slightly towards wherever the cursor is
      // pointing. But the behavior can certainly be improved I guess.
      const containerRect = containerElement.value.getBoundingClientRect()
      const cursorY = event.clientY - containerRect.y
      const cursorX = event.clientX - containerRect.x
      const centerContainerX = containerRect.width / 2
      const centerContainerY = containerRect.height / 2
      const centerSVGX = offsetX.value
      const centerSVGY = offsetY.value
      const cursorOffsetX = cursorX - centerContainerX
      const cursorOffsetY = cursorY - centerContainerY
      const scalingFactor = 0.1 / zoomFactor.value

      if (event.deltaY < 0) {
        offsetX.value += (cursorOffsetX - centerSVGX) * scalingFactor
        offsetY.value += (cursorOffsetY - centerSVGY) * scalingFactor
      }

      zoomFactor.value += (event.deltaY > 0) ? 0.1 : -0.1
      if (zoomFactor.value < 0.1) {
        zoomFactor.value = 0.1
      }
    })

  const graphElementNode = graphElement.value.node()
  if (graphElementNode !== null) {
    containerElement.value.appendChild(graphElementNode)
  }

  // // Finally, retrieve the graph
  buildGraph().catch(err => console.error(err))

  // Listen to any changes
  ipcRenderer.on('links', () => {
    buildGraph().catch(err => console.error(err))
  })
})

onBeforeUnmount(() => {
  if (controlsElement.value !== null) {
    controlsObserver.unobserve(controlsElement.value)
  }
})

/**
 * This callback is called whenever the size of the controls element changes
 */
function updateGraphSize (): void {
  if (controlsElement.value === null || containerElement.value === null) {
    return
  }

  const controlsHeight = controlsElement.value.getBoundingClientRect().height
  const padValue = 20 // Twice the padding applied to the graph container
  containerElement.value.style.top = `${controlsHeight + padValue}px`

  const { width, height } = containerElement.value.getBoundingClientRect()
  graphWidth.value = width
  graphHeight.value = height
}

/**
 * This callback is called whenever the cached graph size needs to update
 */
function setSize (): void {
  if (graphElement.value === null) {
    return
  }
  graphElement.value
    .attr('width', graphWidth.value)
    .attr('height', graphHeight.value)
    .attr('viewBox', graphViewBox.value)
}

/**
 * This starts or re-starts the force simulation of the graph. Always called
 * when there is new graph data
 *
 * @param   {LinkGraph}  graph  The graph to simulate
 */
function startSimulation (): void {
  if (graphElement.value === null) {
    throw new Error('startSimulation called before the SVG was instantiated!')
  }

  if (fileGraph.value === undefined) {
    throw new Error('Cannot start simulation: fileGraph not yet computed!')
  }

  const graph = fileGraph.value

  const ISOLATES_CLASS = 'Isolates'

  // Isolates have their own component, so we need to filter these out to
  // have all isolates in a single color
  const reduced = graph.nodes.map(node => (node.isolate) ? ISOLATES_CLASS : node.component)
  const color = d3.scaleOrdinal([...new Set(reduced)], d3.schemeTableau10)

  // NOTE: We must under all circumstances map the values here to create a
  // deep copy, since d3 messes with the objects and modifies them! Otherwise
  // the logic here will break down. The same holds true for the links below.
  const includedNodes = graph.nodes
    .map(node => {
      return {
        component: node.component,
        id: node.id,
        isolate: node.isolate,
        label: node.label
      }
    })
    .filter(node => (includeIsolates.value) ? true : !node.isolate)
    .filter(node => {
      if (componentFilter.value !== '') {
        return node.component === componentFilter.value
      }

      return true
    })

  // Since we kick a lot of nodes out above, we also must also remove links
  // that point into the desert
  const includedLinks = graph.links
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

  const svg = graphElement.value

  if (simulation.value === null) {
    const forceLink = d3.forceLink<GraphVertex & SimulationNodeDatum, GraphArc>(includedLinks).id((node, _i, _nodesData) => node.id).strength((link, _i) => link.weight * 2)
    // Below we have to typecast since d3 will take our arbitrary data (which
    // don't really have any required properties, and ADD any
    // SimulationNodeDatum properties it needs into the object).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    simulation.value = d3.forceSimulation(includedNodes as any)
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
    // Same as above: includedNodes will be enriched by the required properties
    // of SimulationNodeDatum, but the types don't express this.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    simulation.value.nodes(includedNodes as any).alpha(1).alphaTarget(0).restart()
    const link: d3.ForceLink<GraphVertex & d3.SimulationNodeDatum, GraphArc> = simulation.value.force('link')!
    const charge: d3.ForceManyBody<d3.SimulationNodeDatum> = simulation.value.force('charge')!
    const coll: d3.ForceCollide<d3.SimulationNodeDatum> = simulation.value.force('collide')!
    link.links(includedLinks)
    link.initialize(includedNodes, () => Math.random() * 5)
    // Same here...
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    charge.initialize(includedNodes as any, () => 1)
    // ... and here.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    coll.initialize(includedNodes as any, () => Math.random() * 5)
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
          .attr('fill', (vertex, _value) => (vertex.isolate) ? color(ISOLATES_CLASS) : color(vertex.component))
          .on('click', (event, vertex) => {
            ipcRenderer.invoke('documents-provider', {
              command: 'open-file',
              payload: {
                path: vertex.id,
                newTab: (event.altKey === true) ? true : undefined
              }
            } as DocumentManagerIPCAPI).catch(err => console.error(err))
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

        if (showLabels.value) {
          groupSelection
            .append('text')
            .attr('font-size', '8px')
            .attr('font-weight', '100')
            .attr('fill', '#666')
            .attr('stroke-width', '0')
            .text((d: any) => { return d.label ?? d.id })
        }

        return groupSelection
      },
      (update) => {
        // Remove the text and then conditionally re-apply it
        update.select('text').remove()
        if (showLabels.value) {
          update
            .append('text')
            .attr('font-size', '8px')
            .attr('font-weight', '100')
            .attr('fill', '#666')
            .attr('stroke-width', '0')
            .text((d: any) => { return d.label ?? d.id })
        }

        return update
      },
      (exit) => {
        return exit.remove()
      }
    )

  tippy(svg.select('#vertex-container').selectAll('circle').nodes() as any[])
}

/**
 * This function builds a graph from scratch. It is asynchronous since it
 * has to resolve all file links to existing files if possible (to prevent
 * spurious links). With about 2,000 files it takes approximately 10 seconds
 * to finish (on a high-end MacBook Pro M1 2020, 13inch)
 */
async function buildGraph (): Promise<void> {
  if (isBuildingGraph.value) {
    return console.warn('Cannot build graph: Another process is currently building a graph!')
  }

  isBuildingGraph.value = true

  const dbObject: Record<string, string[]> = await ipcRenderer.invoke('link-provider', { command: 'get-link-database' })
  const database = new Map<string, string[]>(Object.entries(dbObject))

  const fileNameDisplay: string = window.config.get('fileNameDisplay')
  const useH1 = fileNameDisplay.includes('heading')
  const useTitle = fileNameDisplay.includes('title')
  const displayMdExtensions = window.config.get('display.markdownFileExtensions') as boolean

  buildProgress.value.currentFile = 0
  buildProgress.value.totalFiles = Object.entries(dbObject).length
  componentFilter.value = ''

  const DG = new DirectedGraph()
  const resolvedLinks = new Map<string, string>()

  const startTime = performance.now()
  DG.startOperation()
  // Fortunately, the fileLinkDatabase is basically just one large edgelist
  for (const [ sourcePath, targets ] of database) {
    buildProgress.value.currentFile += 1
    // We have to specifically add the source, since isolates will have 0
    // targets, and hence we cannot rely on the Graph adding these vertices
    const sourceDescriptor: MDFileDescriptor|undefined = await ipcRenderer.invoke('application', { command: 'get-descriptor', payload: sourcePath })
    if (sourceDescriptor === undefined) {
      console.warn(`Could not find descriptor for ${sourcePath}. Not adding to graph.`)
      continue
    }

    if (useTitle && sourceDescriptor.yamlTitle !== undefined) {
      DG.addVertex(sourcePath, sourceDescriptor.yamlTitle)
    } else if (useH1 && sourceDescriptor.firstHeading != null) {
      DG.addVertex(sourcePath, sourceDescriptor.firstHeading)
    } else if (displayMdExtensions) {
      DG.addVertex(sourcePath, sourceDescriptor.name)
    } else {
      DG.addVertex(sourcePath, sourceDescriptor.name.replace(sourceDescriptor.ext, ''))
    }

    for (const target of targets) {
      // Before adding a target, we MUST resolve the link to an actual file
      // path if possible. This is necessary because there are at least two
      // ways to link to notes: by filename or by ID. By resolving what we
      // can, we prevent spurious duplicates. The resolve() helper will either
      // return the full absolute path to the file identified by `target` or
      // the unaltered `target`.
      if (!resolvedLinks.has(target)) {
        const found: MDFileDescriptor|undefined = await ipcRenderer.invoke('application', { command: 'find-exact', payload: target })
        if (found === undefined) {
          // This will create a vertex representing a latent (i.e. not yet
          // existing) file.
          resolvedLinks.set(target, target)
          DG.addVertex(target, target)
        } else {
          resolvedLinks.set(target, found.path)
          if (useTitle && found.yamlTitle !== undefined) {
            DG.addVertex(found.path, found.yamlTitle)
          } else if (useH1 && found.firstHeading != null) {
            DG.addVertex(found.path, found.firstHeading)
          } else if (displayMdExtensions) {
            DG.addVertex(found.path, found.name)
          } else {
            DG.addVertex(found.path, found.name.replace(found.ext, ''))
          }
        }
      }
      DG.addArc(sourcePath, resolvedLinks.get(target)!)
    }
  }
  DG.endOperation()

  // Now we have to do some magic. What we need to know is the size of each
  // component. This is similar to a Python counter, but utilizing a JS map
  const compMap = new Map<string, number>()

  for (const node of DG.graph.nodes) {
    const counter = compMap.get(node.component)
    if (counter === undefined) {
      compMap.set(node.component, 0)
    } else {
      compMap.set(node.component, counter + 1)
    }
  }

  const unsorted: Array<[string, number]> = []

  components.value = []

  for (const [ component, size ] of compMap) {
    if (size > 1) {
      unsorted.push([ component, size ])
    }
  }

  unsorted.sort((a, b) => b[1] - a[1])
  for (const [component] of unsorted) {
    components.value.push(component)
  }
  // END: Component determining

  const duration = performance.now() - startTime
  console.log(`[Link Provider] Graph constructed in ${Math.round(duration)}ms. Graph contains ${DG.countVertices} nodes, ${DG.countArcs} arcs and ${DG.countComponents} components.`)
  isBuildingGraph.value = false
  fileGraph.value = DG.graph
  startSimulation()
}
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
  height: 100%;

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
    height: 100%;

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
