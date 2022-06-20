<template>
  <div id="sidebar">
    <TabBar
      v-bind:tabs="tabs"
      v-bind:current-tab="currentTab"
      v-on:tab="setCurrentTab($event)"
    ></TabBar>

    <!-- Now the tab containers -->
    <div id="sidebar-tab-container">
      <ToCTab
        v-if="currentTab === 'toc'"
        v-on:move-section="$emit('move-section', $event)"
      ></ToCTab>
      <ReferencesTab v-if="currentTab === 'references'"></ReferencesTab>
      <RelatedFilesTab v-if="currentTab === 'relatedFiles'"></RelatedFilesTab>
      <OtherFilesTab v-if="currentTab === 'attachments'"></OtherFilesTab>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Sidebar
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component renders the sidebar.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import TabBar from '@common/vue/TabBar.vue'
import { defineComponent } from 'vue'
import { MDFileMeta } from '@dts/common/fsal'
import { TabbarControl } from '@dts/renderer/window'
import ToCTab from './ToCTab.vue'
import ReferencesTab from './ReferencesTab.vue'
import RelatedFilesTab from './RelatedFilesTab.vue'
import OtherFilesTab from './OtherFilesTab.vue'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'MainSidebar',
  components: {
    TabBar,
    ToCTab,
    ReferencesTab,
    RelatedFilesTab,
    OtherFilesTab
  },
  emits: ['move-section'],
  data: function () {
    return {}
  },
  computed: {
    currentTab: function (): string {
      return this.$store.state.config['window.currentSidebarTab']
    },
    tabs: function (): TabbarControl[] {
      return [
        {
          icon: 'indented-view-list',
          id: 'toc',
          target: 'sidebar-toc',
          label: this.tocLabel
        },
        {
          icon: 'book',
          id: 'references',
          target: 'sidebar-bibliography',
          label: this.referencesLabel
        },
        {
          icon: 'file-group',
          id: 'relatedFiles',
          target: 'sidebar-related-files',
          label: this.relatedFilesLabel
        },
        {
          icon: 'attachment',
          id: 'attachments',
          target: 'sidebar-files',
          label: this.otherFilesLabel
        }
      ]
    },
    otherFilesLabel: function (): string {
      return trans('gui.other_files')
    },
    referencesLabel: function (): string {
      return trans('gui.citeproc.references_heading')
    },
    tocLabel: function (): string {
      return trans('gui.table_of_contents')
    },
    relatedFilesLabel: function (): string {
      return trans('gui.related_files_label')
    },
    activeFile: function (): MDFileMeta|null {
      return this.$store.state.activeFile
    },
    modifiedFiles: function (): string[] {
      return this.$store.state.modifiedDocuments
    },
    citationKeys: function (): string[] {
      return this.$store.state.citationKeys
    }
  },
  watch: {
    // TODO: MOVE THIS TO THE STORE
    modifiedFiles: function () {
      if (this.activeFile == null) {
        return
      }

      // Update the related files when the current document is not modified to
      // immediately account for any changes in the related files.
      const activePath = this.activeFile.path
      if (!(activePath in this.modifiedFiles)) {
        this.$store.dispatch('updateRelatedFiles')
          .catch(e => console.error('Could not update related files', e))
      }
    }
  },
  mounted: function () {
    // TODO: MOVE THIS TO THE STORE
    ipcRenderer.on('links', () => {
      this.$store.dispatch('updateRelatedFiles')
        .catch(e => console.error('Could not update related files', e))
    })
  },
  methods: {
    setCurrentTab: function (which: string) {
      (global as any).config.set('window.currentSidebarTab', which)
    }
  }
})
</script>

<style lang="less">
body {
  @button-margin: 5px;
  @border-radius: 5px;
  @button-size: 5px;
  @button-icon-size: 5px;

  #sidebar {
    background-color: rgb(230, 230, 230);
    height: 100%;
    width: 100%;

    #sidebar-tab-container {
      position: absolute;
      top: 40px;
      bottom: 0;
      left: 0px;
      right: 0px;
      padding: 0px 5px 5px 0px;
      overflow-y: auto;
    }

    #open-dir-external {
      padding: @button-margin;
      border-radius: @border-radius;
      display: inline-block;
      width: @button-size;
      height: @button-size;

      clr-icon {
        width: @button-icon-size;
        height: @button-icon-size;
      }
    }

    h1 {
      padding: 10px;
      font-size: 16px;
    }

    p { padding: 10px; }

    a.attachment {
      display: block;
      margin: 10px;
      padding: 4px;
      text-decoration: none;
      color: inherit;
      // Padding 4px + 4px margin + 24px icon width = 32px
      text-indent: -32px;
      padding-left: 32px;
      // Some filenames are too long for the sidebar. However, unlike with the
      // file manager where we have the full filename visible in multiple places,
      // here we must make sure the filename is fully visible. Hence, we don't
      // use white-space: nowrap, but rather word-break: break-all.
      word-break: break-all;

      svg {
        width: 24px;
        height: 24px;
        margin-right: 4px;
        vertical-align: bottom;
        margin-bottom: -1px;
        // Necessary to give the extension icons the correct colour
        fill: currentColor;
      }
    }

    // Bibliography entries
    div.csl-bib-body {
      div.csl-entry {
        display: list-item;
        list-style-type: square;
        margin: 1em 0.2em 1em 1.8em;
        font-size: 80%;
        user-select: text;
        cursor: text;
      }

      a { color: var(--blue-0); }
    }

    // Table of Contents entries
    div.toc-entry-container {
      // Clever calculation based on the data-level property
      // margin-left: calc(attr(data-level) * 10px);
      display: flex;
      margin-bottom: 10px;
      margin-right: 10px;

      div.toc-level {
        flex-shrink: 1;
        padding: 0px 5px;
        font-weight: bold;
        color: var(--system-accent-color, --c-primary);
      }

      div.toc-entry {
        flex-grow: 3;
        cursor: pointer;
        &:hover { text-decoration: underline; }
      }

      div.toc-entry-active {
        font-weight: bold;
        color: var(--system-accent-color);
      }
    }

    div.related-files-container {
      padding: 10px;

      div.related-file {
        // NOTE: The margin + height equal 42, which was the automatic height
        // before we fixed it here. We have to fix it because the Recycle
        // scroller requires completely fixed heights.
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        padding: 5px 5px;
        height: 35px;
        overflow: hidden;

        &:hover { background-color: rgb(200, 200, 200); }

        span.filename {
          font-size: 11px;
          height: 28px;
          flex-grow: 8;
          // The next four properties together ensure that we show at most two
          // lines with a nice ellipsis (…) to indicate cut-off lines.
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        span.icons {
          display: inline-block;
          border-radius: 4px;
          padding: 2px;
          flex-grow: 2;
          flex-shrink: 0;
          text-align: right;
        }
      }
    }
  }

  &.dark {
    #sidebar {
      background-color: rgba(30, 30, 30, 1);
      color: rgb(230, 230, 230);

      div.related-files-container div.related-file:hover {
        background-color: rgb(80, 80, 80);
      }
    }
  }
}

body.darwin {
  div#sidebar {
    // On macOS the toolbar is 40px high and the documents titlebar is 30px high,
    // so we want to offset the sidebar by that.
    top: calc(40px + 30px);
    background-color: transparent;

    div.related-files-container {
      div.related-file { border-radius: 4px; }
    }
  }

  &.dark {
    div#sidebar {
      background-color: transparent;
    }
  }
}
</style>
