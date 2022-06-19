<template>
  <div
    v-bind:class="{
      'selectable-list-wrapper': true,
      'has-footer': editable
    }"
  >
    <div class="selectable-list-container">
      <div
        v-for="item, idx in items" v-bind:key="idx"
        v-bind:class="{
          'item': true,
          'selected': idx === selectedItem
        }"
        v-on:click="$emit('select', idx)"
        v-on:contextmenu="handleContextMenu($event, idx)"
      >
        <span class="display-text">{{ getDisplayText(item) }}</span>
        <span
          v-if="hasInfoString(item)"
          v-bind:class="{
            'info-string': true,
            'error': (item as any).infoStringClass === 'error'
          }"
        >{{ (item as any).infoString }}</span>
      </div>
    </div>
    <!-- Add an optional footer -->
    <div v-if="editable" class="selectable-list-footer">
      <div class="add" v-on:click="$emit('add')">
        <clr-icon shape="plus" size="16"></clr-icon>
      </div>
      <div class="remove" v-on:click="$emit('remove', selectedItem)">
        <clr-icon shape="minus" size="16"></clr-icon>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
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

import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { AnyMenuItem } from '@dts/renderer/context'
import { defineComponent } from 'vue'

interface SelectableListItem {
  displayText: string
  infoString: string
}

export default defineComponent({
  name: 'SelectableList',
  props: {
    items: {
      type: Object as () => Array<string|SelectableListItem>,
      required: true
    },
    selectedItem: {
      type: Number,
      default: 0
    },
    // If set to true, the user can add and remove items
    editable: {
      type: Boolean,
      default: false
    }
  },
  emits: [ 'select', 'add', 'remove' ],
  methods: {
    getDisplayText: function (listItem: string|SelectableListItem): string {
      if (typeof listItem === 'string') {
        return listItem
      } else {
        return listItem.displayText
      }
    },
    hasInfoString: function (listItem: string|SelectableListItem): boolean {
      return typeof listItem !== 'string'
    },
    handleContextMenu: function (event: MouseEvent, idx: number) {
      if (!this.editable) {
        return // No action possible
      }

      const menu: AnyMenuItem[] = [
        {
          label: 'Remove',
          id: 'remove-item',
          type: 'normal',
          enabled: true
        }
      ]

      showPopupMenu({ x: event.clientX, y: event.clientY }, menu, (clickedID) => {
        if (clickedID === 'remove-item') {
          this.$emit('remove', idx)
        }
      })
    }
  }
})
</script>

<style lang="less">
body .selectable-list-wrapper {
  padding: 20px;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  &.has-footer { padding-bottom: 40px; }

  .selectable-list-footer {
    position: absolute;
    bottom: 18px;
    left: 20px;
    right: 20px;
    height: 22px;
    display: flex;
    justify-content: flex-start;
    background-color: rgb(255, 255, 255);
    border-left: 1px solid rgb(180, 180, 180);
    border-right: 1px solid rgb(180, 180, 180);
    border-bottom: 1px solid rgb(180, 180, 180);

    .add, .remove {
      width: 20px;
      height: 20px;
      line-height: 20px;
      text-align: center;
    }
  }

  .selectable-list-container {
    border: 1px solid rgb(180, 180, 180);
    height: 100%;
    overflow: auto;

    div.item {
      background-color: white;
      color: rgb(33, 33, 33);
      border-bottom: 1px solid rgb(180, 180, 180);
      white-space: nowrap;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      &.selected { background-color: rgb(230, 230, 230); }

      &:last-child { border-bottom: none; }

      .info-string {
        font-size: 10px;
        color: gray;

        &.error { color: rgb(200, 80, 100); }
      }
    }
  }
}

body.darwin {
  .selectable-list-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 12px;

    .item {
      line-height: 20px;
      padding: 5px;
    }

    .selectable-list-footer {
      .add, .remove {
        border-right: 1px solid rgb(230, 230, 230);
      }
    }
  }

  &.dark {
    .selectable-list-footer {
      background-color: rgb(68, 68, 68);
      border-color: #505050;

      .add, .remove {
        color: rgb(230, 230, 230);
        border-right-color: rgb(90, 90, 90);
      }
    }

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

// TODO: Only rudimentary styles currently
body.win32, body.linux {
  .selectable-list-wrapper {
    .selectable-list-container {
      div.item {
        border: none;
        // height: 30px;
        line-height: 20px;
        padding: 0 5px;
      }
    }
  }
  &.dark {
    .selectable-list-wrapper {
      .selectable-list-footer {
        background-color: rgb(70, 70, 70);

        .add, .remove { color: rgb(230, 230, 230); }
      }

      .selectable-list-container {
        div.item {
          background-color: rgb(70, 70, 70);
          color: white;

          &.selected {
            background-color: rgb(90, 90, 90);
          }

        }
      }
    }
  }
}
</style>
