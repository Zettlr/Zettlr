<template>
  <button
    v-bind:id="`toolbar-${control.id}`"
    role="button"
    v-bind:class="getClass"
    v-on:click="$emit('click')"
  >
    <clr-icon v-if="control.icon" v-bind:shape="control.icon"></clr-icon>
    <span v-html="control.label"></span>
  </button>
</template>

<script>
export default {
  name: 'ButtonControl',
  props: {
    control: {
      type: Object,
      default: function () { return {} }
    }
  },
  computed: {
    getClass: function () {
      if (this.control.buttonClass !== undefined) {
        return this.control.buttonClass
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
