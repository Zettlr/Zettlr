<template>
  <div class="toolbar-group">
    <button
      v-bind:id="`toolbar-${control.id}`"
      role="button"
      v-bind:class="{
        [control.buttonClass]: control.buttonClass !== undefined
      }"
      v-bind:title="titleWithFallback"
    >
      <cds-icon
        v-if="control.icon"
        v-bind:shape="control.icon"
        v-bind:class="{
          'has-badge': control.badge
        }"
        v-bind:direction="control.direction"
      ></cds-icon>
    </button>
    <span v-if="showLabel" class="toolbar-label" v-html="labelWithFallback"></span>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Button
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This implements a generic button; mainly used on the toolbar
 *                  but can also be displayed elsewhere.
 *
 * END HEADER
 */

export default {
  name: 'ButtonControl',
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
  }
}
</script>

<style lang="less">
//
</style>
