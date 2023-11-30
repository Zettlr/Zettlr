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
      v-bind:class="{ 'primary': primary }"
    >
      <cds-icon v-if="icon !== ''" v-bind:shape="icon" v-bind:direction="direction"></cds-icon>
      {{ label }}
    </button>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Button
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Represents a generic button
 *
 * END HEADER
 */

import { defineComponent } from 'vue'

export default defineComponent({
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
    direction: {
      type: String,
      default: undefined
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
    },
    primary: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    fieldID: function (): string {
      return 'form-button-' + this.name
    }
  }
})
</script>

<style lang="less">

</style>
