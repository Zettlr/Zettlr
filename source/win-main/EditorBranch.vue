<template>
  <zettlr-splitter
    class="split-pane-container"
    v-bind:aria-orientation="node.direction"
    v-on:splitter-resize="onResize()"
  >
    <template
      v-for="(subNode, index) in node.nodes"
      v-bind:key="JSON.stringify(subNode)"
    >
      <zettlr-pane
        style="flex-grow: 1"
        v-bind:basis="sizes[index] + '%'"
        v-on:pane-resize="sizes[index] = parseFloat($event.target.basis, 10)"
      >
        <EditorBranch
          v-if="subNode.type === 'branch'"
          v-bind:key="`branch-${index}`"
          v-bind:node="subNode"
          v-bind:window-id="windowId"
          v-bind:editor-commands="editorCommands"
	  v-on:global-search="$emit('globalSearch', $event)"
        ></EditorBranch>
        <EditorPane
          v-else
          v-bind:key="subNode.id"
          v-bind:leaf-id="subNode.id"
          v-bind:window-id="windowId"
          v-bind:editor-commands="editorCommands"
	  v-on:global-search="$emit('globalSearch', $event)"
        ></EditorPane>
      </zettlr-pane>
      <!-- Here comes the resizing (for every but the last child) -->
      <zettlr-separator
        v-if="index < node.nodes.length - 1 && !distractionFree"
      ></zettlr-separator>
    </template>
  </zettlr-splitter>
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
    editorCommands: {
      type: Object as () => EditorCommands,
      required: true
    }
  },
  emits: ['globalSearch'],
  data () {
    return {
      sizes: this.node.sizes.map(s => s)
    }
  },
  computed: {
    distractionFree () {
      return this.$store.state.distractionFreeMode !== undefined
    }
  },
  methods: {
    onResize () {
      // Inform main about the new sizes
      ipcRenderer.invoke('documents-provider', {
        command: 'set-branch-sizes',
        payload: {
          windowId: this.windowId,
          branchId: this.node.id,
          sizes: this.sizes.map(s => s) // Again, deproxy
        }
      }).catch(err => console.error(err))
    }
  }
})
</script>

<style lang="less">
body {
  .split-pane-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: auto;
  }
}
</style>
