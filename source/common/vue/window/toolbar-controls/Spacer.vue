<template>
  <div
    v-bind:class="{
      'spacer': true,
      'spacer-5x': control.size === '5x',
      'spacer-3x': control.size === '3x',
      'spacer-1x': control.size === '1x'
    }"
  ></div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Spacer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Does what it says on the can: Adds space to the toolbar.
 *
 * END HEADER
 */

export default {
  name: 'SpacerControl',
  props: {
    control: {
      type: Object,
      default: function () { return {} }
    }
  },
  computed: {
    spacerClass: function () {
      let c = ['spacer']
      c.push('spacer-' + this.control.size)
      return c.join(' ')
    }
  }
}
</script>

<style lang="less">
body #toolbar .spacer {
  flex-grow: 1;
  &.spacer-5x { flex-grow: 0.5; }
  &.spacer-3x { flex-grow: 0.3; }
  &.spacer-1x { flex-grow: 0.1; }
}

body.linux #toolbar .spacer {
  min-width: 12px;

  &.spacer-5x { flex-grow: 5; }
  &.spacer-3x { flex-grow: 3; }
  &.spacer-1x { flex-grow: 1; }
}
</style>
