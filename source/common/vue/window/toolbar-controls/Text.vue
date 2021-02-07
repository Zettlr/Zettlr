<template>
  <div
    role="presentation"
    v-bind:style="{
      textAlign: control.align
    }"
  >
    <strong v-if="control.style === 'strong'">
      {{ control.content }}
    </strong>
    <em v-else-if="control.style === 'emphasis'">
      {{ control.content }}
    </em>
    <template v-else>
      {{ control.content }}
    </template>
  </div>
</template>

<script>
export default {
  name: 'TextControl',
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
