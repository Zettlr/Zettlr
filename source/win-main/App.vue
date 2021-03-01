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
        <Editor v-bind:readability-mode="readabilityActive"></Editor>
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
import PopoverExport from './PopoverExport'
import { trans } from '../common/i18n'
import localiseNumber from '../common/util/localise-number'
import generateId from '../common/util/generate-id'
import { ipcRenderer, clipboard } from 'electron'

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
          id: 'open-workspace',
          title: 'menu.open_workspace',
          icon: 'folder-open'
        },
        {
          type: 'button',
          command: 'file-new',
          title: 'toolbar.file_new',
          icon: 'file'
        },
        {
          type: 'button',
          command: 'show-stats',
          title: 'toolbar.stats',
          icon: 'line-chart'
        },
        {
          type: 'button',
          command: 'show-tag-cloud',
          title: 'toolbar.tag_cloud',
          icon: 'tags'
        },
        {
          type: 'button',
          id: 'open-preferences',
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
          id: 'export',
          title: 'toolbar.share',
          icon: 'export'
        },
        {
          type: 'button',
          command: 'file-rename',
          title: 'toolbar.file_rename',
          icon: 'pencil'
        },
        {
          type: 'button',
          command: 'file-delete',
          title: 'toolbar.file_delete',
          icon: 'trash'
        },
        {
          type: 'button',
          command: 'formatting',
          title: 'toolbar.formatting',
          icon: 'text'
        },
        {
          type: 'button',
          command: 'toc',
          title: 'toolbar.show_toc',
          icon: 'indented-view-list'
        },
        {
          type: 'button',
          command: 'file-find',
          title: 'toolbar.find',
          icon: 'search'
        },
        {
          type: 'toggle',
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
          id: 'toggle-sidebar',
          title: 'menu.toggle_sidebar',
          icon: 'view-columns',
          initialState: (this.sidebarVisible === true) ? 'active' : ''
        }
      ]
    }
  },
  mounted: function () {
    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'toggle-sidebar') {
        this.sidebarVisible = this.sidebarVisible === false
      } else if (shortcut === 'insert-id') {
        // Generates an ID based upon the configured pattern, writes it into the
        // clipboard and then triggers the paste command on these webcontents.

        // First we need to backup the existing clipboard contents
        // so that they are not lost during the operation.
        let text = clipboard.readText()
        let html = clipboard.readHTML()
        let image = clipboard.readImage()
        let rtf = clipboard.readRTF()

        // Write an ID to the clipboard
        clipboard.writeText(generateId(global.config.get('zkn.idGen')))
        // Paste the ID
        ipcRenderer.send('window-controls', { command: 'paste' })

        // Now restore the clipboard's original contents
        setTimeout((e) => {
          clipboard.write({
            'text': text,
            'html': html,
            'image': image,
            'rtf': rtf
          })
        }, 10) // Why do a timeout? Because the paste event is asynchronous.
      } else if (shortcut === 'copy-current-id') {
        const activeFile = this.$store.state.activeFile

        if (activeFile !== null && activeFile.id !== '') {
          clipboard.writeText(activeFile.id)
        }
      }
    })
  },
  methods: {
    handleClick: function (clickedID) {
      if (clickedID === 'toggle-readability') {
        this.readabilityActive = this.readabilityActive === false
      } else if (clickedID === 'toggle-sidebar') {
        this.sidebarVisible = this.sidebarVisible === false
      } else if (clickedID === 'open-workspace') {
        ipcRenderer.invoke('application', { command: 'open-workspace' })
          .catch(e => console.error(e))
      } else if (clickedID === 'open-preferences') {
        ipcRenderer.invoke('application', { command: 'open-preferences' })
          .catch(e => console.error(e))
      } else if (clickedID === 'export') {
        if (this.$store.state.activeFile === null) {
          return // Can't export a non-open file
        }
        const data = {
          exportDirectory: this.$store.state.config['export.dir']
        }
        this.$showPopover(PopoverExport, document.getElementById('toolbar-export'), data, (data) => {
          if (data.shouldExport === true) {
            ipcRenderer.invoke('application', {
              command: 'export',
              payload: {
                format: data.format,
                exportTo: data.exportTo,
                file: this.$store.state.activeFile.path
              }
            })
              .catch(e => console.error(e))
            this.$closePopover()
          }
        })
      }
    }
  }
}
</script>

<style lang="less">
//
</style>
