<template>
  <PopoverWrapper v-bind:target="props.target" v-on:close="$emit('close')">
    <div class="table-generator">
      <!-- Display a 12x12 grid -->
      <div
        v-for="row in 12"
        v-bind:key="row"
        class="row"
      >
        <div
          v-for="col in 12"
          v-bind:key="col"
          v-bind:class="{
            cell: true,
            active: rows >= row && cols >= col
          }"
          v-on:mouseover="setIntermediarySize(row, col)"
          v-on:click="handleClick()"
        ></div>
      </div>
      <p>{{ tableSizeLabel }}</p>
    </div>
  </PopoverWrapper>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table Popover
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A popover which allows you to select a number of rows and
 *                  columns to create a new table.
 *
 * END HEADER
 */
import { trans } from 'source/common/i18n-renderer'
import PopoverWrapper from './PopoverWrapper.vue'
import { ref, computed } from 'vue'

const props = defineProps<{ target: HTMLElement }>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'insert-table', value: { rows: number, cols: number }): void
}>()

const rows = ref(0)
const cols = ref(0)

const tableSizeLabel = computed(() => trans('Table size: %s &times; %s', rows.value, cols.value))

function handleClick (): void {
  emit('insert-table', { rows: rows.value, cols: cols.value })
  emit('close')
}

function setIntermediarySize (rowCount: number, colCount: number): void {
  rows.value = rowCount
  cols.value = colCount
}
</script>

<style lang="less">
body {
  .table-generator {
    padding: 5px;
  }

  .table-generator p {
    text-align: center;
  }

  .table-generator .row .cell {
    background-color: rgb(200, 200, 200);
    border: 1px solid rgb(80, 80, 80);
    width: 10px;
    height: 10px;
    margin: 1px;

    &.active {
      background-color: rgb(230, 230, 230);
    }
  }
}
</style>
