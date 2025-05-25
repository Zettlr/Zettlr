<template>
  <div
    v-bind:class="{
      admonition: true,
      [props.type ?? 'warning']: true
    }"
  >
    <cds-icon v-bind:shape="icon"></cds-icon>
    <span>
      <slot></slot>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ type?: 'warning'|'error'|'info' }>()

const icon = computed(() => {
  switch (props.type) {
    case 'error':
      return 'error-standard'
    case 'info':
      return 'info-standard'
    case 'warning':
      // falls through
    default:
      return 'warning-standard'
  }
})
</script>

<style lang="less">
.admonition {
  display: flex;
  align-items: center;
  border: 1px solid #dfdfdf;
  border-radius: 5px;
  padding: 5px 10px;
  font-size: 80%;

  // More spacing between the icon and the text
  cds-icon { margin-right: 10px; }

  &.warning {
    color: #333333;
    background-color: #ffffa7;
  }

  &.error {
    color: #333333;
    background-color: #ffa7a7;
    border-color: #333333;
  }

  &.info {
    color: #3333aa;
    background-color: #bad1ff;
    border-color: #3333aa;
  }
}

body.dark .admonition {
  &.warning {
    background-color: #515100;
    color: #ffffaa;
    border-color: #8c9200;
  }

  &.error {
    background-color: #510000;
    color: #ffaaaa;
    border-color: #333333;
  }

  &.info {
    background-color: #333352;
    color: #aaaaff;
    border-color: #333333;
  }
}
</style>
