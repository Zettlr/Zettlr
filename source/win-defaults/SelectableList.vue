<template>
  <div class="selectable-list-wrapper">
    <div class="selectable-list-container">
      <div
        v-for="item, idx in items" v-bind:key="idx"
        v-bind:class="{
          'item': true,
          'selected': idx === selectedItem
        }"
        v-on:click="$emit('select', idx)"
      >
        <span class="display-text">{{ item }}</span>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SelectableList
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A component for displaying static, but selectable lists.
 *                  NOTE: This component is likely going to be relocated to
 *                  common/vue/form.
 *
 * END HEADER
 */

export default {
  name: 'SelectableList',
  props: {
    items: {
      type: Array,
      required: true
    },
    selectedItem: {
      type: Number,
      default: 0
    }
  }
}
</script>

<style lang="less">
body .selectable-list-wrapper {
  padding: 20px;

  .selectable-list-container {
    border: 1px solid rgb(180, 180, 180);

    div.item {
      background-color: white;
      color: rgb(33, 33, 33);
      border-bottom: 1px solid rgb(180, 180, 180);

      &.selected { background-color: rgb(230, 230, 230); }

      &:last-child { border-bottom: none; }
    }
  }
}

body.darwin {
  .selectable-list-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 12px;

    .item {
      white-space: nowrap;
      overflow: hidden;
      height: 30px;
      line-height: 20px;
      padding: 5px;
    }
  }

  &.dark {
    .selectable-list-container {
      border-color: #505050;

      div.item {
        background-color: rgb(50, 50, 50);
        color: white;
        border-color: #505050;

        &.selected {
          background-color: rgb(80, 80, 80);
        }
      }
    }
  }
}
</style>
