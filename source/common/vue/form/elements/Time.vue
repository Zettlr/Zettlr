<template>
  <div class="form-control">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <input
      v-bind:id="fieldID"
      ref="input"
      v-bind:value="modelValue"
      v-bind:class="{ 'inline': inline }"
      type="time"
      v-on:input="validateInput($event.target.value)"
    >
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Time
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Enables users to input a time
 *
 * END HEADER
 */

export default {
  name: 'FieldText',
  props: {
    modelValue: {
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
    inline: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  computed: {
    fieldID: function () {
      return 'field-input-' + this.name
    }
  },
  methods: {
    validateInput: function (value) {
      // Make sure it's a time
      if (!/\d{2}:\d{2}/.test(value)) {
        this.$refs.input.classList.add('error')
      } else {
        // All good, emit!
        this.$emit('update:modelValue', value)
      }
    }
  }
}
</script>

<style lang="less">
input[type="time"] {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

body.darwin {
  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
}
</style>
