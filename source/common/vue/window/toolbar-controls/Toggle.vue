<template>
  <button
    v-bind:id="`toolbar-${control.id}`"
    role="button"
    v-bind:aria-pressed="isActive"
    v-bind:class="{
      'toggle': true,
      'active': isActive,
      [control.activeClass as string]: control.activeClass !== undefined && isActive
    }"
    v-bind:title="titleWithFallback"
    v-on:click="toggle"
  >
    <cds-icon v-if="control.icon" v-bind:shape="control.icon"></cds-icon>
    <span v-if="showLabel" class="toolbar-label" v-html="labelWithFallback"></span>
  </button>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Toggle
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A button that supports an "on" state.
 *
 * END HEADER
 */

import { ToolbarControl } from '@dts/renderer/window'
import { defineComponent, PropType } from 'vue'

export default defineComponent({
  name: 'ToggleControl',
  props: {
    control: {
      type: Object as PropType<ToolbarControl>,
      default: function () { return {} }
    },
    showLabel: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle'],
  data: function () {
    return {
      isActive: this.control.initialState === true
    }
  },
  computed: {
    titleWithFallback: function () {
      if (typeof this.control.title === 'string' && this.control.title.length > 0) {
        return this.control.title
      } else if (typeof this.control.label === 'string' && this.control.label.length > 0) {
        return this.control.label
      } else {
        return ''
      }
    },
    labelWithFallback: function () {
      if (typeof this.control.label === 'string' && this.control.label.length > 0) {
        return this.control.label
      } else if (typeof this.control.title === 'string' && this.control.title.length > 0) {
        return this.control.title
      } else {
        return ''
      }
    }
  },
  watch: {
    control () {
      // Enable the caller to re-set the initialState property whenever needed
      // to programmatically enable/disable the toggle
      this.isActive = this.control.initialState === true
    }
  },
  methods: {
    toggle: function () {
      this.isActive = !this.isActive
      this.$emit('toggle', this.isActive)
    }
  }
})
</script>

<style lang="less">
body.darwin div#toolbar {
  button.toggle {
    &.active {
      background-color: rgb(200, 200, 200);
    }
  }
}

body.darwin.dark div#toolbar {
  button.toggle.active {
    background-color: rgb(40, 40, 40);
  }
}
</style>
