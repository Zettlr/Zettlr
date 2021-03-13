<template>
  <div
    v-bind:class="{
      'form-control': true,
      'inline': inline
    }"
  >
    <button
      v-bind:id="fieldID"
      v-bind:name="name"
      v-bind:disabled="disabled"
      v-on:click="$emit('click')"
    >
      <clr-icon v-if="icon !== ''" v-bind:shape="icon"></clr-icon>
      {{ label }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'ButtonControl',
  props: {
    label: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    inline: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    fieldID: function () {
      return 'form-button-' + this.name
    }
  }
}
</script>

<style lang="less">

</style>
