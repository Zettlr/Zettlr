<template>
  <button
    role="button"
    v-on:click="$emit('click')"
  >
    <clr-icon v-if="control.icon" v-bind:shape="control.icon"></clr-icon>
    {{ control.label }}
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
  }
}
</script>

<style lang="less">
//
</style>
