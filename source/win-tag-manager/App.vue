<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-statusbar="true"
    v-bind:statusbar-controls="statusbarControls"
    v-bind:disable-vibrancy="true"
    v-on:statusbar-click="handleClick($event)"
  >
    <div id="tag-manager">
      <p>
        {{ tagManagerIntro }}
      </p>
      <div>
        <div v-for="(tag, index) in tags" v-bind:key="index" class="tag-flex">
          <TextControl
            v-model="tag.name"
            v-bind:placeholder="namePlaceholder"
            v-bind:inline="false"
          ></TextControl>
          <ColorControl
            v-model="tag.color"
            v-bind:placeholder="colorPlaceholder"
            v-bind:inline="false"
          ></ColorControl>
          <TextControl
            v-model="tag.desc"
            v-bind:placeholder="descriptionPlaceholder"
            v-bind:inline="false"
          ></TextControl>
          <button type="button" v-on:click="removeTag(index)">
            Delete
          </button>
        </div>
      </div>
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
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'

const ipcRenderer = window.ipc

interface ColouredTag {
  name: string
  color: string
  desc: string
}

export default defineComponent({
  components: {
    WindowChrome,
    TextControl,
    ColorControl
  },
  data: function () {
    return {
      tags: [] as ColouredTag[]
    }
  },
  computed: {
    namePlaceholder: function () {
      return trans('dialog.tags.name_desc')
    },
    colorPlaceholder: function () {
      return trans('dialog.tags.color_desc')
    },
    descriptionPlaceholder: function () {
      return trans('dialog.tags.desc_desc')
    },
    tagManagerIntro: function () {
      return trans('dialog.tags.description')
    },
    windowTitle: function () {
      return trans('dialog.tags.title')
    },
    statusbarControls: function () {
      return [
        {
          type: 'button',
          label: trans('dialog.button.save'),
          id: 'save',
          icon: '',
          buttonClass: 'primary' // It's a primary button
        },
        {
          type: 'button',
          label: trans('dialog.button.cancel'),
          id: 'cancel',
          icon: ''
        },
        {
          type: 'button',
          label: 'Add new tag',
          id: 'add-new',
          icon: ''
        }
      ]
    }
  },
  created: function () {
    ipcRenderer.invoke('tag-provider', {
      command: 'get-coloured-tags'
    })
      .then((tags) => {
        this.tags = tags
      })
      .catch(e => console.error(e))
  },
  methods: {
    handleClick: function (controlID: string) {
      if (controlID === 'save') {
        ipcRenderer.invoke('tag-provider', {
          command: 'set-coloured-tags',
          payload: this.tags.map(tag => {
            // De-proxy the tags so they can be sent over IPC
            return {
              name: tag.name,
              color: tag.color,
              desc: tag.desc
            }
          })
        })
          .then(() => {
            ipcRenderer.send('window-controls', { command: 'win-close' })
          })
          .catch(e => console.error(e))
      } else if (controlID === 'cancel') {
        ipcRenderer.send('window-controls', { command: 'win-close' })
      } else if (controlID === 'add-new') {
        this.tags.push({
          name: '',
          color: '#ffffff',
          desc: ''
        })
      }
    },
    removeTag: function (tagIndex: number) {
      this.tags.splice(tagIndex, 1)
    }
  }
})
</script>

<style lang="less">
div#tag-manager {
  padding: 10px;
  margin-top: 10px;

  div.tag-flex {
    display: flex;

    & > * {
      flex: 1;
      text-align: center;
      margin: 5px 5px;
    }

    & > :last-child, & > :nth-child(2) {
      flex: 0.2;
    }
  }
}
</style>
