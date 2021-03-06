<template>
  <div v-bind:class="{ 'inline': inline, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
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
  name: 'SelectControl',
  props: {
    value: {
      type: String,
      default: ''
    },
    inline: {
      type: Boolean,
      default: false
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
