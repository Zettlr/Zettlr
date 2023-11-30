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
              v-if="tag.color !== undefined"
              v-model="tag.desc"
              v-bind:inline="true"
              v-bind:placeholder="descriptionPlaceholder"
              v-on:change="hasUnsavedChanges = true"
            ></TextControl>

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
              v-bind:placeholder="'New tag'"
            ></TextControl>
            <ButtonControl
              v-if="renameActiveFor === tag.name"
              v-bind:label="'Rename'"
              v-on:click="renameTag(tag.name)"
            ></ButtonControl>

            <ButtonControl
              v-else
              v-bind:label="'Rename tag...'"
              v-on:click="renameActiveFor = tag.name"
            ></ButtonControl>
          </td>
        </tr>
      </table>
    </div>
  </WindowChrome>
</template>

<script lang="ts">
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

import WindowChrome from '@common/vue/window/Chrome.vue'
import TextControl from '@common/vue/form/elements/Text.vue'
import ColorControl from '@common/vue/form/elements/Color.vue'
import ButtonControl from '@common/vue/form/elements/Button.vue'
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'
import { TagRecord } from '@providers/tags'

const ipcRenderer = window.ipc

export default defineComponent({
  components: {
    WindowChrome,
    TextControl,
    ButtonControl,
    ColorControl
  },
  data: function () {
    return {
      tags: [] as TagRecord[],
      hasUnsavedChanges: false,
      renameActiveFor: '',
      sortBy: 'name' as 'name'|'idf'|'count'|'color',
      descending: false,
      query: '',
      newTag: ''
    }
  },
  computed: {
    assignColorLabel: function () {
      return trans('Assign color')
    },
    removeColorLabel: function () {
      return trans('Remove color')
    },
    tagNameLabel: function () {
      return trans('Tag name')
    },
    colorLabel: function () {
      return trans('Color')
    },
    countLabel: function () {
      return trans('Count')
    },
    descriptionPlaceholder: function () {
      return trans('A short description')
    },
    tagManagerIntro: function () {
      return trans('Here you can assign colors to different tags. If a tag is found in a file, its tile in the preview list will receive a colored indicator. The description will be shown on mouse hover.')
    },
    windowTitle: function () {
      return trans('Manage tags')
    },
    filterPlaceholder () {
      return trans('Filter tags…')
    },
    filteredTags () {
      const q = this.query.toLowerCase()
      const copy = this.tags.map(x => x).filter(x => x.name.toLowerCase().includes(q))

      const languagePreferences = [ window.config.get('appLang'), 'en' ]
      const coll = new Intl.Collator(languagePreferences, { 'numeric': true })
      copy.sort((a, b) => {
        if (this.sortBy === 'name') {
          return coll.compare(a.name, b.name)
        } else if (this.sortBy === 'color') {
          const aCol = a.color !== undefined
          const bCol = b.color !== undefined
          if (!aCol && bCol) {
            return 1
          } else if (aCol && !bCol) {
            return -1
          } else {
            return 0
          }
        } else if (this.sortBy === 'count') {
          return a.files.length - b.files.length
        } else {
          return a.idf - b.idf
        }
      })

      if (this.descending) {
        copy.reverse()
      }

      return copy
    },
    statusbarControls: function () {
      return [
        {
          type: 'button',
          label: trans('Save'),
          id: 'save',
          icon: '',
          buttonClass: 'primary' // It's a primary button
        },
        {
          type: 'text',
          label: this.hasUnsavedChanges ? trans('Unsaved changes') : ''
        },
        {
          type: 'button',
          label: trans('Close'),
          id: 'close',
          icon: ''
        }
      ]
    }
  },
  created: function () {
    this.retrieveTags().catch(e => console.error(e))
  },
  methods: {
    handleStatusbar: function (controlID: string) {
      if (controlID === 'save') {
        ipcRenderer.invoke('tag-provider', {
          command: 'set-colored-tags',
          // De-proxy the tags so they can be sent over IPC
          payload: JSON.parse(JSON.stringify(this.tags))
        })
          .then(() => {
            ipcRenderer.send('window-controls', { command: 'win-close' })
          })
          .catch(e => console.error(e))
      } else if (controlID === 'close') {
        ipcRenderer.send('window-controls', { command: 'win-close' })
      }
    },
    removeColor: function (tagName: string) {
      const found = this.tags.find(tag => tag.name === tagName)
      if (found !== undefined) {
        found.color = undefined
        found.desc = undefined
        this.hasUnsavedChanges = true
      } else {
        console.error(`Could not remove color for tag ${tagName}: Tag not found`)
      }
    },
    assignColor: function (tagName: string) {
      const found = this.tags.find(tag => tag.name === tagName)
      if (found !== undefined) {
        found.color = '#1cb27e'
        found.desc = ''
        this.hasUnsavedChanges = true
      } else {
        console.error(`Could not assign color to tag ${tagName}: Tag not found`)
      }
    },
    retrieveTags: async function () {
      this.tags = await ipcRenderer.invoke('tag-provider', {
        command: 'get-all-tags'
      }) as TagRecord[]
    },
    renameTag: async function (tagName: string) {
      await ipcRenderer.invoke('application', {
        command: 'rename-tag',
        payload: { oldName: tagName, newName: this.newTag }
      })

      this.newTag = ''
      this.renameActiveFor = tagName

      // Afterwards, fetch the new set of tags
      await this.retrieveTags()
    },
    changeSorting (which: 'name'|'color'|'count'|'idf') {
      if (this.sortBy === which) {
        this.descending = !this.descending
      } else {
        this.sortBy = which
        this.descending = false
      }
    }
  }
})
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
