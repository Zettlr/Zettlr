<template>
  <div class="form-control">
    <label v-if="label" v-bind:for="fieldID">{{ label }}</label>
    <select
      v-bind:id="fieldID"
      ref="input"
      v-bind:name="name"
      v-on:input="$emit('input', $event.target.value)"
    >
      <option
        v-for="(optionLabel, key) in options"
        v-bind:key="key"
        v-bind:value="key"
        v-bind:selected="key === value"
      >
        {{ optionLabel }}
      </option>
    </select>
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
    options: {
      type: Object,
      default: function () { return {} }
    }
  },
  computed: {
    fieldID: function () {
      return 'form-select-' + this.name
    }
  }
}
</script>

<style lang="less">
</style>
