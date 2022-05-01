<template>
  <button
    v-if="control.visible !== false"
    v-bind:id="`toolbar-${control.id}`"
    role="button"
    v-bind:aria-pressed="isActive"
    v-bind:class="{
      'toggle': true,
      'active': isActive,
      [control.activeClass]: control.activeClass !== undefined && isActive
    }"
    v-bind:title="titleWithFallback"
    v-on:click="toggle"
  >
    <clr-icon v-if="control.icon" v-bind:shape="control.icon"></clr-icon>
    <span v-if="showLabel" class="toolbar-label" v-html="labelWithFallback"></span>
  </button>
</template>

<script>
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

export default {
  name: 'ToggleControl',
  props: {
    control: {
      type: Object,
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
      isActive: this.control.initialState === 'active'
    }
  },
  computed: {
    controlActiveChanged: function () {
      return this.control.initialState
    },
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
    controlActiveChanged: function () {
      this.isActive = this.control.initialState
    }
  },
  methods: {
    toggle: function () {
      this.isActive = this.isActive === false
      this.$emit('toggle', this.isActive)
    }
  }
}
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
