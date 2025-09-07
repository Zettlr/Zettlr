/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirectedGraph
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class implements a directed graph
 *
 * END HEADER
 */

export interface GraphVertex {
  id: string
  label?: string
  component: string // Can be used to differentiate groups of vertices (by color, etc)
  isolate: boolean
}

// NOTE: This is a single Arc. To create a two-way link, apply two mutual arcs
export interface GraphArc {
  source: string
  target: string
  weight: number // For weighted graphs
}

export interface LinkGraph {
  nodes: GraphVertex[]
  links: GraphArc[]
  components: string[]
}

const NONE_COMPONENT = 'Files'

export default class DirectedGraph {
  private readonly _arcs: GraphArc[]
  private readonly _vertices: GraphVertex[]
  private _components: string[]
  private _inOperation: boolean

  constructor () {
    this._arcs = []
    this._vertices = []
    this._components = []
    this._inOperation = false
  }

  get graph (): LinkGraph {
    if (this._inOperation) {
      throw new Error('Graph is currently in an operation. Did you forget to call endOperation?')
    }
    return {
      nodes: this._vertices,
      links: this._arcs,
      components: this._components
    }
  }

  startOperation (): void {
    this._inOperation = true
  }

  endOperation (): void {
    this._inOperation = false
    // Now we can recalculate all the metrics and run the algorithms
    this.identifyComponents()
  }

  get countVertices (): number {
    return this._vertices.length
  }

  get countArcs (): number {
    return this._arcs.length
  }

  get countIsolates (): number {
    return this._vertices.filter(V => V.isolate).length
  }

  get countComponents (): number {
    return this._components.length
  }

  get vertices (): GraphVertex[] {
    return this._vertices
  }

  addVertex (id: string, label?: string): GraphVertex {
    const foundV = this._vertices.find(V => V.id === id)
    if (foundV !== undefined) {
      return foundV
    }

    const newV = {
      id,
      label,
      component: NONE_COMPONENT,
      isolate: true
    }

    this._vertices.push(newV)
    if (!this._inOperation) {
      this.identifyComponents()
    }
    return newV
  }

  addArc (source: string, target: string, weight: number = 1): void {
    let sV = this._vertices.find(V => V.id === source)
    let tV = this._vertices.find(V => V.id === target)

    if (sV === undefined) {
      sV = this.addVertex(source)
    }
    if (tV === undefined) {
      tV = this.addVertex(target)
    }

    sV.isolate = false
    tV.isolate = false
    this._arcs.push({ source, target, weight })

    if (!this._inOperation) {
      this.identifyComponents()
    }
  }

  setLabel (vertex: string, label: string): void {
    const V = this._vertices.find(ver => ver.id === vertex)

    if (V === undefined) {
      throw new Error(`Could not set label for V(${vertex})!`)
    }

    V.label = label
  }

  private identifyComponents (): void {
    // First, reset all components
    for (const V of this._vertices) {
      V.component = NONE_COMPONENT
    }

    // We need to also reset the components
    this._components = []

    const visit = (source: GraphVertex, component?: string): void => {
      // This node already is part of a component
      if (source.component !== NONE_COMPONENT) {
        return
      }

      // Now we know that this vertex does not yet have a component, i.e. it's
      // not part of an already existing component. So create a new one
      if (component === undefined) {
        component = `Component ${this._components.length + 1}`
        this._components.push(component)
      }

      source.component = component

      // NOTE: Here we must treat the network as undirected in order to create
      // components. For this, we retrieve every arc that has the current vertex
      // either as its head or tail, then map to the opposite end of the arc and
      // resolve to the nodes.
      const allTargets = this._arcs
        .filter(link => link.source === source.id || link.target === source.id)
        .map(link => {
          if (link.target === source.id) {
            return link.source
          } else {
            return link.target
          }
        })

      for (const target of allTargets) {
        const V = this._vertices.find(V => V.id === target)
        if (V === undefined) {
          throw new Error(`${target} for ${source.id} was not defined!`)
        }
        visit(V, component)
      }
    }

    for (const V of this._vertices) {
      visit(V)
    }
  }
}
