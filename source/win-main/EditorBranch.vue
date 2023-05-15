<template>
  <div
    ref="root-elem"
    class="split-pane-container"
    v-bind:style="elementStyles"
  >
    <template
      v-for="(subNode, index) in node.nodes"
      v-bind:key="JSON.stringify(subNode)"
    >
      <EditorBranch
        v-if="subNode.type === 'branch'"
        v-bind:key="`branch-${index}`"
        v-bind:node="subNode"
        v-bind:window-id="windowId"
        v-bind:editor-commands="editorCommands"
        v-bind:available-width="(node.direction === 'horizontal') ? sizes[index] : 100"
        v-bind:available-height="(node.direction === 'vertical') ? sizes[index] : 100"
        v-bind:is-last="index === node.nodes.length - 1"
        v-on:global-search="$emit('globalSearch', $event)"
      ></EditorBranch>
      <EditorPane
        v-else
        v-bind:key="subNode.id"
        v-bind:leaf-id="subNode.id"
        v-bind:window-id="windowId"
        v-bind:editor-commands="editorCommands"
        v-bind:class="{
          'border-right': (index < node.nodes.length - 1 && node.direction === 'horizontal') || !isLast,
          'border-bottom': index < node.nodes.length - 1 && node.direction === 'vertical'
        }"
        v-bind:available-width="(node.direction === 'horizontal') ? sizes[index] : 100"
        v-bind:available-height="(node.direction === 'vertical') ? sizes[index] : 100"
        v-on:global-search="$emit('globalSearch', $event)"
      ></EditorPane>
      <!-- Here comes the resizing (for every but the last child) -->
      <div
        v-if="index < node.nodes.length - 1"
        v-bind:class="`resizer ${node.direction}`"
        v-on:mousedown="beginResizing($event, index)"
      ></div>
    </template>
  </div>
</template>

<script lang="ts">
import EditorPane from './EditorPane.vue'
import { BranchNodeJSON } from '@dts/common/documents'
import { defineComponent } from 'vue'
import { EditorCommands } from '@dts/renderer/editor'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'EditorBranch',
  components: {
    EditorPane
  },
  props: {
    node: {
      type: Object as () => BranchNodeJSON,
      required: true
    },
    windowId: {
      type: String,
      required: true
    },
    availableWidth: {
      type: Number,
      default: 100
    },
    availableHeight: {
      type: Number,
      default: 100
    },
    isLast: {
      type: Boolean,
      default: false
    },
    editorCommands: {
      type: Object as () => EditorCommands,
      required: true
    }
  },
  emits: ['globalSearch'],
  data () {
    return {
      sizes: this.node.sizes.map(s => s), // Holds the sizes of the child nodes
      currentResizerIndex: -1, // Holds the index of the resizer during resizing
      lastOffset: 0
    }
  },
  computed: {
    rootElem (): HTMLDivElement {
      return this.$refs['root-elem'] as HTMLDivElement
    },
    isHorizontalBranch () {
      return this.node.direction === 'horizontal'
    },
    elementStyles () {
      const rules = [
        `width: ${this.availableWidth}%; height: ${this.availableHeight}%`
      ]
      if (this.node.type === 'branch') {
        if (this.node.direction === 'horizontal') {
          rules.push('flex-direction: row')
        } else {
          rules.push('flex-direction: column')
        }
      }
      return rules.join('; ')
    },
    nodeSizes () {
      return this.node.sizes
    }
  },
  watch: {
    nodeSizes () {
      this.sizes = this.node.sizes.map(s => s)
    }
  },
  methods: {
    beginResizing (event: MouseEvent, index: number) {
      this.currentResizerIndex = index
      this.lastOffset = this.isHorizontalBranch ? event.clientX : event.clientY
      this.rootElem.addEventListener('mousemove', this.onResizing)
      this.rootElem.addEventListener('mouseup', this.endResizing)
    },
    onResizing (event: MouseEvent) {
      if (this.currentResizerIndex < 0) {
        return
      }

      const node1 = this.currentResizerIndex
      const node2 = node1 + 1
      const offset = this.isHorizontalBranch ? event.clientX : event.clientY

      // Convert from pixels to percent
      const offsetPixels = Math.abs(this.lastOffset - offset)
      const rect = this.rootElem.getBoundingClientRect()
      const totalPixels = this.isHorizontalBranch ? rect.width : rect.height
      const offsetPercent = offsetPixels / totalPixels * 100

      if (offset > this.lastOffset) {
        // Direction --> or v
        this.sizes[node1] += offsetPercent
        this.sizes[node2] -= offsetPercent
      } else if (offset < this.lastOffset) {
        // Direction <-- or ^
        this.sizes[node1] -= offsetPercent
        this.sizes[node2] += offsetPercent
      }

      this.lastOffset = offset
    },
    endResizing (event: MouseEvent) {
      this.currentResizerIndex = -1
      this.lastOffset = 0
      this.rootElem.removeEventListener('mousemove', this.onResizing)
      this.rootElem.removeEventListener('mouseup', this.endResizing)
      // Inform main about the new sizes
      ipcRenderer.invoke('documents-provider', {
        command: 'set-branch-sizes',
        payload: {
          windowId: this.windowId,
          branchId: this.node.id,
          sizes: this.sizes.map(s => s) // Again, deproxy
        }
      })
        .catch(err => console.error(err))
    }
  }
})
</script>

<style lang="less">
body .split-pane-container {
  display: flex;
  width: 100%;
  height: 100%;

  .resizer {
    z-index: 1;
    transition: background-color 0.5s ease;

    &:hover { background-color: rgba(128, 128, 128, .5); }
  }

  .resizer.horizontal {
    width: 5px;
    margin: 0 -2.5px;
    height: 100%;
    cursor: ew-resize;
  }

  .resizer.vertical {
    width: 100%;
    margin: -2.5px 0;
    height: 5px;
    cursor: ns-resize;
  }

  .editor-pane {
    &.border-right { border-right: 1px solid #d5d5d5; }
    &.border-bottom { border-bottom: 1px solid #d5d5d5; }
  }
}

body.dark .split-pane-container .editor-pane {
  &.border-right { border-color: #505050; }
    &.border-bottom { border-color: #505050; }
}
</style>
