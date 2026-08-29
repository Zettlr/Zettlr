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
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 5px 10px;
  font-size: 80%;

  // More spacing between the icon and the text
  cds-icon { margin-right: 10px; }

  &.warning {
    color: var(--zettlr-warning-color);
    background-color: var(--zettlr-warning-bg);
    border-color: var(--zettlr-warning-color);
  }

  &.error {
    color: var(--zettlr-caution-color);
    background-color: var(--zettlr-caution-bg);
    border-color: var(--zettlr-caution-color);
  }

  &.info {
    color: var(--zettlr-important-color);
    background-color: var(--zettlr-important-bg);
    border-color: var(--zettlr-important-color);
  }
}
</style>
