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
//
</style>
