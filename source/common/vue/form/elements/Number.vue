<template>
  <div v-bind:class="{ 'inline': inline, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div v-if="reset" class="input-button-group">
      <input
        v-bind:id="fieldID"
        ref="input"
        v-bind:min="min"
        v-bind:max="max"
        v-bind:value="value"
        v-bind:class="{ 'inline': inline }"
        type="number"
        v-on:input="$emit('input', sanitize($event.target.value))"
        v-on:keyup.enter="$emit('confirm', sanitize($event.target.value))"
        v-on:keyup.esc="$emit('escape', sanitize($event.target.value))"
        v-on:blur="$emit('blur', sanitize($event.target.value))"
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
      type="number"
      v-on:input="$emit('input', sanitize($event.target.value))"
      v-on:keyup.enter="$emit('confirm', sanitize($event.target.value))"
      v-on:keyup.esc="$emit('escape', sanitize($event.target.value))"
      v-on:blur="$emit('blur', sanitize($event.target.value))"
    >
  </div>
</template>

<script>
export default {
  name: 'FieldNumber',
  props: {
    value: {
      type: Number,
      default: 0
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 10 ** 12
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
      type: Number,
      default: 0
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
    },
    sanitize: function (value) {
      // If the user completely empties the field, make sure a number is being returned
      if (value === '') {
        return 0
      } else {
        return parseInt(value, 10)
      }
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
