<template>
  <div class="form-control">
    <label v-if="label" v-bind:for="fieldID">{{ label }}</label>
    <div v-if="reset" class="input-button-group">
      <input
        v-bind:id="fieldID"
        ref="input"
        v-bind:value="value"
        v-bind:class="{ 'inline': inline }"
        type="text"
        v-on:input="$emit('input', $event.target.value)"
      >
      <button
        type="button"
        data-tippy-content="dialog.preferences.zkn.reset_default_id"
        v-on:click="resetValue"
      >
        <clr-icon shape="refresh"></clr-icon>
      </button>
    </div>
    <!-- Else: Normal input w/o reset button -->
    <input
      v-else
      v-bind:id="fieldID"
      ref="input"
      v-bind:value="value"
      type="text"
      v-on:input="$emit('input', $event.target.value)"
    >
  </div>
</template>

<script>
export default {
  name: 'FieldText',
  props: {
    value: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    reset: {
      type: String,
      default: ''
    },
    inline: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    fieldID: function () {
      return 'field-input-' + this.name
    }
  },
  methods: {
    resetValue: function () {
      this.$refs.input.value = this.reset
      this.$emit('input', this.reset)
    }
  }
}
</script>

<style lang="less">
body.darwin {
  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
}
</style>
