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
