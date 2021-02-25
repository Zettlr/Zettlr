<template>
  <div v-bind:class="spacerClass"></div>
</template>

<script>
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
      c.push(this.control.size)
      return c.join(' ')
    }
  }
}
</script>

<style lang="less">
body #toolbar .spacer {
  flex-grow: 5;
  &.spacer-5x { flex-grow: 5; }
  &.spacer-3x { flex-grow: 3; }
  &.spacer-1x { flex-grow: 1; }
}
</style>
