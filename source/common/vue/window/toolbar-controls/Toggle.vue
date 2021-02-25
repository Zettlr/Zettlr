<template>
  <button
    role="button"
    v-bind:aria-pressed="isActive"
    v-bind:class="{
      'toggle': true,
      'active': isActive,
      [control.activeClass]: control.activeClass !== undefined && isActive
    }"
    v-on:click="toggle"
  >
    <clr-icon v-if="control.icon" v-bind:shape="control.icon"></clr-icon>
    <span v-html="control.label"></span>
  </button>
</template>

<script>
export default {
  name: 'ToggleControl',
  props: {
    control: {
      type: Object,
      default: function () { return {} }
    }
  },
  data: function () {
    return {
      isActive: this.control.initialState === 'active'
    }
  },
  computed: {
  },
  methods: {
    toggle: function () {
      this.isActive = !this.isActive
      this.$emit('toggle')
    }
  }
}
</script>

<style lang="less">
body.darwin {

  button.toggle {
    &.active {
      background-color: rgb(200, 200, 200) !important; // TODO
    }
  }
}
</style>
