<template>
  <div
    v-bind:class="{
      'editor-pane': true,
      'distraction-free': distractionFree
    }"
    v-bind:style="elementStyles"
  >
    <!-- We have a leaf: Default DocumentTabs/Editor combo -->
    <DocumentTabs
      v-bind:leaf-id="leafId"
      v-bind:window-id="windowId"
    ></DocumentTabs>
    <MainEditor
      ref="editor"
      v-bind:distraction-free="distractionFree"
      v-bind:leaf-id="leafId"
      v-bind:window-id="windowId"
      v-bind:editor-commands="editorCommands"
      v-on:global-search="$emit('globalSearch', $event)"
    ></MainEditor>
  </div>
  <!-- A single editor pane can either be a pane itself OR a MultiSplitView -->
</template>

<script lang="ts">
import { EditorCommands } from '@dts/renderer/editor'
import { defineComponent } from 'vue'
import DocumentTabs from './DocumentTabs.vue'
import MainEditor from './MainEditor.vue'

export default defineComponent({
  name: 'EditorPane',
  components: {
    DocumentTabs,
    MainEditor
  },
  props: {
    leafId: {
      type: String,
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
    editorCommands: {
      type: Object as () => EditorCommands,
      required: true
    }
  },
  emits: ['globalSearch'],
  computed: {
    elementStyles () {
      if (this.distractionFree) {
        return ''
      } else {
        return `width: ${this.availableWidth}%; height: ${this.availableHeight}%`
      }
    },
    lastLeafId () {
      return this.$store.state.lastLeafId
    },
    distractionFree () {
      return this.$store.state.distractionFreeMode === this.leafId
    }
  }
})
</script>

<style lang="less">
body .split-pane-container {
  .editor-pane {
    // Styles for the editor pane
    flex-grow: 1;
  }
}
</style>
