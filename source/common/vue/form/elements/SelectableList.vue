<template>
  <div
    v-bind:class="{
      'selectable-list-wrapper': true,
      'has-footer': editable
    }"
  >
    <div class="selectable-list-container">
      <div v-if="items.length === 0" class="no-items-label">
        {{ noItemsLabel }}
      </div>
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
      <PopoverWrapper v-if="requestTextInput === true" v-bind:target="addButton!" v-bind:placement-priorities="['above', 'right', 'left']">
        <TextControl
          v-model="textInput"
          v-bind:placeholder="requestTextInputPlaceholder"
          v-bind:autofocus="true"
          v-on:confirm="finishTextInput(true)"
          v-on:escape="finishTextInput(false)"
          v-on:blur="finishTextInput(false)"
        ></TextControl>
      </PopoverWrapper>
      <div ref="addButton" class="add" v-on:click="addItem()">
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
import { trans } from 'source/common/i18n-renderer'
import { computed, ref } from 'vue'
import PopoverWrapper from '../../PopoverWrapper.vue'
import TextControl from './TextControl.vue'

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
  noItemsLabel?: string
  selectedItem?: number
  editable?: boolean
  addTextItem?: boolean
  requestTextPlaceholder?: string
}>()

const emit = defineEmits<{
  (e: 'select', value: number): void
  (e: 'add', itemText?: string): void
  (e: 'remove', value: number): void
}>()

const addButton = ref<HTMLDivElement|null>(null)
const requestTextInput = ref<boolean>(false)
const requestTextInputPlaceholder = computed(() => props.requestTextPlaceholder ?? trans('New item'))
const textInput = ref('')

const noItemsLabel = computed(() => props.noItemsLabel ?? trans('No items'))

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

function addItem () {
  if (props.addTextItem) {
    // The parent of this list has requested the addition of a text-based item.
    // Requesting text input from the user is something we implement here, as
    // it makes most sense to have it implemented here from a UI flow
    // perspective. The user simply expects text input to originate next to the
    // plus button instead of somewhere else in the UI. Here we essentially
    // trigger the first part of the text input, that is, show the corresponding
    // popover, which in turn will request text input from the user and then
    // trigger the finishTextInput button below.
    requestTextInput.value = true
  } else {
    emit('add')
  }
}

function finishTextInput (emitEvent: boolean) {
  const name = textInput.value
  textInput.value = ''
  requestTextInput.value = false

  if (emitEvent) {
    emit('add', name)
  }
}
</script>

<style lang="less">
body .selectable-list-wrapper {
  --selectable-list-border-color: rgb(230, 230, 230);
  --muted-color: gray;
  height: 100%;
  min-height: 0;
  padding: 10px 10px 0px 10px;
  display: flex;
  flex-direction: column;

  &.has-footer { margin-bottom: 20px; }

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
    flex: 1;
    min-height: 50px;
    overflow: auto;

    div.no-items-label {
      height: 100%;
      font-size: 200%;
      padding: 5px;
      display: grid;
      align-items: center;
      text-align: center;
      color: var(--muted-color);
    }

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
        color: var(--muted-color);

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
