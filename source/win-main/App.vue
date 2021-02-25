<template>
  <WindowChrome
    v-bind:title="title"
    v-bind:titlebar="false"
    v-bind:menubar="true"
    v-bind:show-toolbar="true"
    v-bind:toolbar-controls="toolbarControls"
    v-on:toolbar-toggle="handleClick($event)"
    v-on:toolbar-click="handleClick($event)"
  >
    <SplitView
      v-bind:initial-size-percent="[ 20, 80 ]"
      v-bind:minimum-size-percent="10"
      v-bind:split="'horizontal'"
      v-bind:initial-total-width="$el.getBoundingClientRect().width"
    >
      <template #view1>
        <FileManager></FileManager>
      </template>
      <template #view2>
        <Tabs></Tabs>
        <Editor></Editor>
      </template>
    </SplitView>
    <Sidebar v-bind:show-sidebar="sidebarVisible"></Sidebar>
  </WindowChrome>
</template>

<script>
import WindowChrome from '../common/vue/window/Chrome'
import FileManager from './file-manager/file-manager'
import Sidebar from './Sidebar'
import Tabs from './Tabs'
import SplitView from './SplitView'
import Editor from './Editor'
import { trans } from '../common/i18n'
import localiseNumber from '../common/util/localise-number'

export default {
  name: 'Main',
  components: {
    WindowChrome,
    FileManager,
    Tabs,
    SplitView,
    Editor,
    Sidebar
  },
  data: function () {
    return {
      title: 'Zettlr',
      readabilityActive: false,
      sidebarVisible: false
    }
  },
  computed: {
    parsedDocumentInfo: function () {
      const info = this.$store.state.activeDocumentInfo
      if (info === null) {
        return ''
      }

      let cnt = ''

      if (info.selections.length > 0) {
        // We have selections to display.
        let length = 0
        info.selections.forEach(sel => {
          length += sel.selectionLength
        })

        cnt = trans('gui.words_selected', localiseNumber(length))
        cnt += '<br>'
        if (info.selections.length === 1) {
          cnt += (info.selections[0].start.line + 1) + ':'
          cnt += (info.selections[0].start.ch + 1) + ' &ndash; '
          cnt += (info.selections[0].end.line + 1) + ':'
          cnt += (info.selections[0].end.ch + 1)
        } else {
          // Multiple selections --> indicate
          cnt += trans('gui.number_selections', info.selections.length)
        }
      } else {
        // No selection. NOTE: words always contains the count of chars OR words.
        cnt = trans('gui.words', localiseNumber(info.words))
        cnt += '<br>'
        cnt += (info.cursor.line + 1) + ':' + (info.cursor.ch + 1)
      }

      return cnt
    },
    toolbarControls: function () {
      return [
        {
          type: 'button',
          class: 'workspace-open',
          command: 'workspace-open',
          title: 'menu.open_workspace',
          icon: 'folder-open'
        },
        {
          type: 'button',
          class: 'file-new',
          command: 'file-new',
          title: 'toolbar.file_new',
          icon: 'file'
        },
        {
          type: 'button',
          class: 'stats',
          command: 'show-stats',
          title: 'toolbar.stats',
          icon: 'line-chart'
        },
        {
          type: 'button',
          class: 'tag-cloud',
          command: 'show-tag-cloud',
          title: 'toolbar.tag_cloud',
          icon: 'tags'
        },
        {
          type: 'button',
          class: 'preferences',
          command: 'open-preferences',
          title: 'toolbar.preferences',
          icon: 'cog'
        },
        {
          type: 'spacer'
        },
        {
          type: 'search',
          placeholder: 'Find …'
        },
        {
          type: 'spacer'
        },
        {
          type: 'button',
          class: 'share',
          command: 'export',
          title: 'toolbar.share',
          icon: 'export'
        },
        {
          type: 'button',
          class: 'file-rename',
          command: 'file-rename',
          title: 'toolbar.file_rename',
          icon: 'pencil'
        },
        {
          type: 'button',
          class: 'file-delete',
          command: 'file-delete',
          title: 'toolbar.file_delete',
          icon: 'trash'
        },
        {
          type: 'button',
          class: 'formatting',
          command: 'formatting',
          title: 'toolbar.formatting',
          icon: 'text'
        },
        {
          type: 'button',
          class: 'show-toc',
          command: 'toc',
          title: 'toolbar.show_toc',
          icon: 'indented-view-list'
        },
        {
          type: 'button',
          class: 'find',
          command: 'file-find',
          title: 'toolbar.find',
          icon: 'search'
        },
        {
          type: 'toggle',
          class: 'readability',
          id: 'toggle-readability',
          title: 'toolbar.readability',
          icon: 'eye'
        },
        {
          type: 'spacer'
        },
        {
          type: 'text',
          align: 'center',
          content: this.parsedDocumentInfo
        },
        {
          type: 'pomodoro',
          title: 'toolbar.pomodoro'
        },
        {
          type: 'toggle',
          class: 'toggle-sidebar',
          id: 'toggle-sidebar',
          title: 'menu.toggle_sidebar',
          icon: 'view-columns'
        }
      ]
    }
  },
  methods: {
    handleClick: function (clickedID) {
      console.log('Clicked:', clickedID)
      if (clickedID === 'toggle-readability') {
        this.readabilityActive = !this.readabilityActive
      } else if (clickedID === 'toggle-sidebar') {
        this.sidebarVisible = !this.sidebarVisible
      }
    }
  }
}
</script>

<style lang="less">
//
</style>
