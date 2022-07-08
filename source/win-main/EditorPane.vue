<template>
  <div
    class="editor-pane"
    v-bind:style="elementStyles"
  >
    <!-- We have a leaf: Default DocumentTabs/Editor combo -->
    <DocumentTabs
      v-bind:leaf-id="leafId"
      v-bind:window-id="windowId"
    ></DocumentTabs>
    <MainEditor
      ref="editor"
      v-bind:readability-mode="false"
      v-bind:distraction-free="false"
      v-bind:leaf-id="leafId"
      v-bind:window-id="windowId"
      v-bind:editor-commands="editorCommands"
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
  computed: {
    elementStyles () {
      return `width: ${this.availableWidth}%; height: ${this.availableHeight}%`
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
