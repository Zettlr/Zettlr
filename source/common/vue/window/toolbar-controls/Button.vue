<template>
  <div class="toolbar-group">
    <button
      v-bind:id="`toolbar-${control.id}`"
      role="button"
      v-bind:class="{
        [control.buttonClass]: control.buttonClass !== undefined
      }"
      v-bind:title="titleWithFallback"
      v-on:click="$emit('click')"
    >
      <clr-icon v-if="control.icon" v-bind:shape="control.icon"></clr-icon>
    </button>
    <span class="toolbar-label" v-if="showLabel" v-html="labelWithFallback"></span>
  </div>
</template>

<script>
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
