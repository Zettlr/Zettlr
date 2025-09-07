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
          'selected': idx === selectedItem,
          'no-info': !hasInfoString(item),
          'no-icons': !needsIconColumn
        }"
        v-on:click="emit('select', idx)"
        v-on:contextmenu="handleContextMenu($event, idx)"
      >
        <cds-icon
          v-if="typeof item !== 'string' && item.icon !== undefined"
          v-bind:shape="item.icon"
          v-bind:solid="item.solidIcon ?? false"
          class="icon"
        ></cds-icon>
        <span class="display-text">{{ getDisplayText(item) }}</span>
        <span
          v-if="hasInfoString(item)"
          v-bind:class="{
            'info-string': true,
            'error': hasInfoStringError(item)
          }"
        >{{ (item as any).infoString }}</span>
      </div>
    </div>
    <!-- Add an optional footer -->
    <div v-if="editable" class="selectable-list-footer">
      <div class="add" v-on:click="emit('add')">
        <cds-icon shape="plus"></cds-icon>
      </div>
      <div v-if="selectedItem !== undefined" class="remove" v-on:click="emit('remove', selectedItem)">
        <cds-icon shape="minus"></cds-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { computed } from 'vue'

export interface SelectableListItem {
  displayText: string
  infoString?: string
  infoStringClass?: 'error'
  icon?: string
  solidIcon?: boolean
  [key: string]: any // Allow arbitrary items
}

const props = defineProps<{
  items: Array<string|SelectableListItem>
  selectedItem?: number
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', value: number): void
  (e: 'add'): void
  (e: 'remove', value: number): void
}>()

// If there is at least one icon, we need the icon column for the entire list
const needsIconColumn = computed<boolean>(() => {
  return props.items
    .find(i => typeof i !== 'string' && i.icon !== undefined) !== undefined
})

function getDisplayText (listItem: string|SelectableListItem): string {
  if (typeof listItem === 'string') {
    return listItem
  } else {
    return listItem.displayText
  }
}

function hasInfoString (listItem: string|SelectableListItem): boolean {
  return typeof listItem !== 'string' && listItem.infoString !== undefined
}

function hasInfoStringError (listItem: string|SelectableListItem): boolean {
  return typeof listItem !== 'string' && listItem.infoStringClass === 'error'
}

function handleContextMenu (event: MouseEvent, idx: number): void {
  if (!props.editable) {
    return // No action possible
  }

  const menu: AnyMenuItem[] = [
    {
      label: 'Remove',
      id: 'remove-item',
      type: 'normal'
    }
  ]

  showPopupMenu({ x: event.clientX, y: event.clientY }, menu, (clickedID) => {
    if (clickedID === 'remove-item') {
      emit('remove', idx)
    }
  })
}
</script>

<style lang="less">
body .selectable-list-wrapper {
  --selectable-list-border-color: rgb(230, 230, 230);
  padding: 10px;

  &.has-footer { padding-bottom: 40px; }

  .selectable-list-footer {
    height: 22px;
    display: flex;
    justify-content: flex-start;
    background-color: rgb(255, 255, 255);
    border-left: 1px solid var(--selectable-list-border-color);
    border-right: 1px solid var(--selectable-list-border-color);
    border-bottom: 1px solid var(--selectable-list-border-color);

    .add, .remove {
      width: 20px;
      height: 20px;
      line-height: 20px;
      text-align: center;
    }
  }

  .selectable-list-container {
    border: 1px solid var(--selectable-list-border-color);
    height: 100%;
    overflow: auto;

    div.item {
      background-color: white;
      color: rgb(33, 33, 33);
      border-bottom: 1px solid var(--selectable-list-border-color);
      white-space: nowrap;
      overflow: hidden;
      display: grid;
      // Default: A spacious list item with icon, label, and info areas
      grid-template-columns: 28px auto;
      grid-template-rows: 14px 14px;
      grid-template-areas:
        "icon label"
        "icon info";
      align-items: center;

      &.no-info {
        // An item that has no info can be a bit narrower
        grid-template-rows: 10px 10px;
        grid-template-areas:
          "icon label"
          "icon label";
      }

      &.no-icons {
        // An item with no icon
        grid-template-areas:
          "label label"
          "info info";
      }

      &.no-icons.no-info {
        // An item with neither icon nor info text
        grid-template-rows: 10px 10px;
        grid-template-areas:
          "label label"
          "label label";
      }

      .display-text { grid-area: label; }
      .icon { grid-area: icon; justify-self: center; }

      &.selected {
        // background-color: rgb(230, 230, 230);
        background-color: var(--system-accent-color);
        color: var(--system-accent-color-contrast);

        .info-string { color: inherit; }
      }

      &:last-child { border-bottom: none; }

      .info-string {
        grid-area: info;
        font-size: 10px;
        color: gray;

        &.error { color: rgb(200, 80, 100); }
      }

      // Make the text clip if too less space
      .display-text, .info-string {
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
}

body.dark .selectable-list-wrapper {
  --selectable-list-border-color-dark: rgb(120, 120, 120);
  .selectable-list-footer, .selectable-list-container, div.item {
    border-color: var(--selectable-list-border-color-dark);
  }

}

body.darwin {
  .selectable-list-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 12px;
    border-radius: 8px;

    .item {
      line-height: 20px;
      padding: 5px;
    }
  }

  .selectable-list-wrapper {
    .selectable-list-footer {
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
      .add, .remove {
        border-right: 1px solid rgb(230, 230, 230);
      }
    }

    &.has-footer > .selectable-list-container {
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
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

      .item {
        background-color: rgb(50, 50, 50);
        color: white;
        border-color: #505050;

        &.selected {
          background-color: var(--system-accent-color);
          color: var(--system-accent-color-contrast);
          .info-string { color: inherit; }
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
        font-size: 12px;
        grid-template-rows: 20px 20px;
        height: 40px;
        line-height: 20px;

        &.no-info {
          grid-template-rows: 15px 15px;
          height: 30px;
          line-height: 30px;
        }
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
            background-color: var(--system-accent-color);
            color: var(--system-accent-color-contrast);
            .info-string { color: inherit; }
          }
        }
      }
    }
  }
}

body.linux .selectable-list-wrapper .selectable-list-container {
  border-radius: 4px;
}
</style>
