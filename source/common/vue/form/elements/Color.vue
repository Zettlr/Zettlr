<template>
  <div v-bind:class="{ 'inline': inline, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div v-if="reset" class="input-button-group">
      <input
        v-bind:id="fieldID"
        ref="input"
        v-bind:value="value"
        v-bind:class="{ 'inline': inline }"
        v-bind:placeholder="placeholder"
        type="color"
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
      v-bind:class="{ 'inline': inline }"
      v-bind:placeholder="placeholder"
      type="color"
      v-on:input="$emit('input', $event.target.value)"
    >
  </div>
</template>

<script>
export default {
  name: 'FieldColor',
  props: {
    value: {
      type: String,
      default: ''
    },
    placeholder: {
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
</style>
