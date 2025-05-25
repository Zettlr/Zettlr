<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-statusbar="true"
    v-bind:statusbar-controls="statusbarControls"
    v-bind:disable-vibrancy="true"
    v-on:statusbar-click="handleStatusbar($event)"
  >
    <div id="tag-manager">
      <p>
        {{ tagManagerIntro }}
      </p>

      <p>
        <TextControl
          v-model="query"
          v-bind:placeholder="filterPlaceholder"
        ></TextControl>
      </p>

      <hr>

      <table>
        <tbody>
          <tr>
            <th style="text-align: left;" v-on:click="changeSorting('name')">
              {{ tagNameLabel }}
            </th>
            <th style="text-align: left;" v-on:click="changeSorting('color')">
              {{ colorLabel }}
            </th>
            <th style="text-align: right;" v-on:click="changeSorting('count')">
              {{ countLabel }}
            </th>
            <th style="text-align: right;" v-on:click="changeSorting('idf')">
              IDF
            </th>
            <th>
              Actions <!-- TODO: Translate -->
            </th>
          </tr>
          <tr v-for="tag in filteredTags" v-bind:key="tag.name" class="tag-flex">
            <td style="text-align: left;">
              <span style="flex-shrink: 1;">{{ tag.name }}</span>
            </td>
  
            <td>
              <ColorControl
                v-if="tag.color !== undefined"
                v-model="tag.color"
                v-bind:inline="true"
                v-on:change="hasUnsavedChanges = true"
              ></ColorControl>
  
              <TextControl
                v-if="tag.color !== undefined && tag.desc !== undefined"
                v-model="tag.desc"
                v-bind:inline="true"
                v-bind:placeholder="descriptionPlaceholder"
                v-on:change="hasUnsavedChanges = true"
              ></TextControl>
              <span v-else-if="tag.color !== undefined && tag.desc === undefined">
                No description
              </span>
  
              <ButtonControl
                v-if="tag.color !== undefined"
                v-bind:label="removeColorLabel"
                v-bind:inline="true"
                v-on:click="removeColor(tag.name)"
              ></ButtonControl>
              <ButtonControl
                v-else
                v-bind:label="assignColorLabel"
                v-bind:inline="true"
                v-on:click="assignColor(tag.name)"
              ></ButtonControl>
            </td>
  
            <td style="text-align: right;">
              <span style="flex-shrink: 1;">{{ tag.files.length ?? 0 }}&times;</span>
            </td>
  
            <!-- IDF shall be displayed rounded to two floating point numbers -->
            <td style="text-align: right;">
              {{ Math.round(tag.idf * 100) / 100 }}
            </td>
  
            <td>
              <TextControl
                v-if="renameActiveFor === tag.name"
                v-model="newTag"
                v-bind:placeholder="newTagPlaceholderLabel"
              ></TextControl>
              <ButtonControl
                v-if="renameActiveFor === tag.name"
                v-bind:label="renameTagLabel"
                v-on:click="renameTag(tag.name)"
              ></ButtonControl>
  
              <ButtonControl
                v-else
                v-bind:label="renameTagDefaultLabel"
                v-on:click="renameActiveFor = tag.name"
              ></ButtonControl>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </WindowChrome>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TagManager
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The tag manager's app entry component.
 *
 * END HEADER
 */

import WindowChrome from '@common/vue/window/WindowChrome.vue'
import TextControl from '@common/vue/form/elements/TextControl.vue'
import ColorControl from '@common/vue/form/elements/ColorControl.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import { trans } from '@common/i18n-renderer'
import { ref, computed, unref } from 'vue'
import { type StatusbarControl } from '@common/vue/window/WindowStatusbar.vue'
import { useConfigStore, useTagsStore } from 'source/pinia'

const ipcRenderer = window.ipc

const assignColorLabel = trans('Assign color')
const removeColorLabel = trans('Remove color')
const tagNameLabel = trans('Tag name')
const colorLabel = trans('Color')
const countLabel = trans('Count')
const descriptionPlaceholder = trans('A short description')
const tagManagerIntro = trans('Here you can assign colors to different tags. If a tag is found in a file, its tile in the preview list will receive a colored indicator. The description will be shown on mouse hover.')
const windowTitle = trans('Tags Manager')
const filterPlaceholder = trans('Filter tags…')
const newTagPlaceholderLabel = trans('New tag')
const renameTagLabel = trans('Rename')
const renameTagDefaultLabel = trans('Rename tag…')

const configStore = useConfigStore()
const tagStore = useTagsStore()

// TODO const tags: [] as TagRecord[],
const hasUnsavedChanges = ref(false)
const renameActiveFor = ref('')
const sortBy = ref<'name'|'idf'|'count'|'color'>('name')
const descending = ref(false)
const query = ref('')
const newTag = ref('')

const filteredTags = computed(() => {
  const q = query.value.toLowerCase()
  const copy = tagStore.tags.map(x => x).filter(x => x.name.toLowerCase().includes(q))

  const languagePreferences = [ configStore.config.appLang, 'en' ]
  const coll = new Intl.Collator(languagePreferences, { numeric: true })
  copy.sort((a, b) => {
    if (sortBy.value === 'name') {
      return coll.compare(a.name, b.name)
    } else if (sortBy.value === 'color') {
      const aCol = a.color !== undefined
      const bCol = b.color !== undefined
      if (!aCol && bCol) {
        return 1
      } else if (aCol && !bCol) {
        return -1
      } else {
        return 0
      }
    } else if (sortBy.value === 'count') {
      return a.files.length - b.files.length
    } else {
      return a.idf - b.idf
    }
  })

  if (descending.value) {
    copy.reverse()
  }

  return copy
})

const statusbarControls = computed<StatusbarControl[]>(() => {
  return [
    {
      type: 'button',
      label: trans('Save'),
      id: 'save',
      buttonClass: 'primary' // It's a primary button
    },
    {
      type: 'text',
      label: hasUnsavedChanges.value ? trans('Unsaved changes') : ''
    },
    {
      type: 'button',
      label: trans('Close'),
      id: 'close'
    }
  ]
})

function handleStatusbar (controlID: string): void {
  if (controlID === 'save') {
    ipcRenderer.invoke('tag-provider', {
      command: 'set-colored-tags',
      // De-proxy the tags so they can be sent over IPC
      payload: JSON.parse(JSON.stringify(unref(tagStore.tags)))
    })
      .then(() => {
        ipcRenderer.send('window-controls', { command: 'win-close' })
      })
      .catch(e => console.error(e))
  } else if (controlID === 'close') {
    ipcRenderer.send('window-controls', { command: 'win-close' })
  }
}

function removeColor (tagName: string): void {
  const found = tagStore.tags.find(tag => tag.name === tagName)
  if (found !== undefined) {
    found.color = undefined
    found.desc = undefined
    hasUnsavedChanges.value = true
  } else {
    console.error(`Could not remove color for tag ${tagName}: Tag not found`)
  }
}

function assignColor (tagName: string): void {
  const found = tagStore.tags.find(tag => tag.name === tagName)
  if (found !== undefined) {
    found.color = '#1cb27e'
    found.desc = ''
    hasUnsavedChanges.value = true
  } else {
    console.error(`Could not assign color to tag ${tagName}: Tag not found`)
  }
}

async function renameTag (tagName: string): Promise<void> {
  await ipcRenderer.invoke('application', {
    command: 'rename-tag',
    payload: { oldName: tagName, newName: newTag.value }
  })

  newTag.value = ''
  renameActiveFor.value = tagName
}

function changeSorting (which: 'name'|'color'|'count'|'idf'): void {
  if (sortBy.value === which) {
    descending.value = !descending.value
  } else {
    sortBy.value = which
    descending.value = false
  }
}
</script>

<style lang="less">
div#tag-manager {
  padding: 10px;
  margin-top: 10px;

  p:first-child { margin-bottom: 10px; }

  table {
    width: 100%;
    margin-top: 10px;
    border-collapse: collapse;

    td, th { padding: 5px; }

    tr:nth-child(2n) {
      background-color: rgb(200, 200, 200);
    }
  }
}

body.dark div#tag-manager table tr:nth-child(2n) {
  background-color: rgb(100, 100, 100);
}
</style>
