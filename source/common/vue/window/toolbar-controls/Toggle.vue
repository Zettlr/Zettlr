<template>
  <button
    role="button"
    v-bind:aria-pressed="isActive"
    v-bind:class="getClass"
    v-on:click="toggle"
  >
    <clr-icon v-if="control.icon" v-bind:shape="control.icon"></clr-icon>
    {{ control.label }}
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
    getClass: function () {
      if (this.isActive === true) {
        return this.control.activeClass
      } else {
        return ''
      }
    }
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
//
</style>
