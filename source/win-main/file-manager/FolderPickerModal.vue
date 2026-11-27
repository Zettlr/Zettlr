<template>
  <div class="folder-picker-modal">
    <div class="fpm-header">
      <span>{{ verb }} to…</span>
    </div>
    <div class="fpm-search">
      <input
        v-model="query"
        type="text"
        placeholder="Filter folders…"
        autofocus
      />
    </div>
    <ul role="tree" class="fpm-list">
      <li
        v-for="dir in filteredDirs"
        v-bind:key="dir.path"
        role="treeitem"
        v-bind:class="{ selected: selected === dir.path }"
        v-bind:style="{ paddingLeft: `${dir.depth * 14 + 10}px` }"
        v-on:click="onSelect(dir.path)"
        v-on:dblclick="onConfirm"
      >
        <cds-icon shape="folder" role="presentation" class="fpm-icon"></cds-icon>
        <span class="fpm-name">{{ dir.name }}</span>
      </li>
      <li v-if="filteredDirs.length === 0" class="fpm-empty">
        No folders match your search.
      </li>
    </ul>
    <div class="fpm-actions">
      <button v-on:click="$emit('cancel')">Cancel</button>
      <button
        class="fpm-confirm"
        v-bind:disabled="selected === null"
        v-on:click="onConfirm"
      >
        {{ verb }} here
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkspaceStore } from 'source/pinia/workspace-store'
import type { DirDescriptor } from '@dts/common/fsal'

defineProps<{
  verb: 'Copy' | 'Move'
}>()

const emit = defineEmits<{
  confirm: [targetPath: string]
  cancel: []
}>()

const workspaceStore = useWorkspaceStore()
const query = ref('')
const selected = ref<string | null>(null)

interface FlatDir {
  readonly path: string
  readonly name: string
  readonly depth: number
}

const allDirs = computed<FlatDir[]>(() => {
  const rootPaths = workspaceStore.rootDescriptors
    .filter(d => d.type === 'directory')
    .map(d => d.path)

  return [...workspaceStore.descriptorMap.values()]
    .filter((d): d is DirDescriptor => d.type === 'directory')
    .map(d => {
      const root = rootPaths.find(r => d.path.startsWith(r))
      const relative = root !== undefined ? d.path.slice(root.length) : d.path
      const depth = relative.split(/[\\/]/).filter(Boolean).length
      return { path: d.path, name: d.name, depth }
    })
    .sort((a, b) => a.path.localeCompare(b.path))
})

const filteredDirs = computed<FlatDir[]>(() => {
  const q = query.value.toLowerCase().trim()
  if (q === '') {
    return allDirs.value
  }
  return allDirs.value.filter(d => d.name.toLowerCase().includes(q))
})

function onSelect (path: string): void {
  selected.value = path
}

function onConfirm (): void {
  if (selected.value !== null) {
    emit('confirm', selected.value)
  }
}
</script>

<style lang="less">
.folder-picker-modal {
  display: flex;
  flex-direction: column;
  width: 380px;
  max-height: 480px;
  background-color: rgb(230, 230, 230);
  border: 1px solid rgb(213, 213, 213);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);

  .fpm-header {
    padding: 12px 16px 10px;
    font-weight: 600;
    font-size: 13px;
    border-bottom: 1px solid rgb(213, 213, 213);
    user-select: none;
  }

  .fpm-search {
    padding: 8px 12px;
    border-bottom: 1px solid rgb(213, 213, 213);

    input {
      width: 100%;
      font-size: 12px;
      padding: 5px 8px;
      border: 1px solid rgb(190, 190, 190);
      border-radius: 4px;
      background-color: white;
      box-sizing: border-box;

      &:focus {
        border-color: var(--system-accent-color, rgb(100, 130, 220));
        outline: none;
      }
    }
  }

  .fpm-list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    flex: 1;
    overflow-y: auto;
    min-height: 120px;
    max-height: 300px;

    li {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      padding-top: 4px;
      padding-bottom: 4px;
      padding-right: 12px;
      font-size: 12px;
      user-select: none;

      &:hover {
        background-color: var(--item-hover-color, rgba(0, 0, 0, 0.07));
      }

      &.selected {
        background-color: var(--selection-color, var(--system-accent-color, rgb(100, 130, 220)));
        color: var(--selection-text-color, white);

        .fpm-icon {
          color: inherit;
        }
      }

      &.fpm-empty {
        color: rgb(140, 140, 140);
        font-style: italic;
        cursor: default;
        padding-left: 12px;

        &:hover {
          background: none;
        }
      }
    }

    .fpm-icon {
      width: 14px;
      height: 14px;
      min-width: 14px;
      flex-shrink: 0;
    }

    .fpm-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .fpm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid rgb(213, 213, 213);

    button {
      font-size: 12px;
      padding: 5px 14px;
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid rgb(190, 190, 190);
      background-color: rgb(245, 245, 245);

      &:hover:not(:disabled) {
        background-color: rgb(235, 235, 235);
      }

      &:disabled {
        opacity: 0.45;
        cursor: default;
      }

      &.fpm-confirm {
        background-color: var(--system-accent-color, rgb(100, 130, 220));
        color: var(--system-accent-color-contrast, white);
        border-color: transparent;
        font-weight: 600;

        &:hover:not(:disabled) {
          filter: brightness(1.1);
        }
      }
    }
  }
}

body.dark {
  .folder-picker-modal {
    background-color: rgb(42, 42, 52);
    border-color: rgb(70, 70, 80);

    .fpm-header {
      border-bottom-color: rgb(70, 70, 80);
      color: rgb(220, 220, 220);
    }

    .fpm-search {
      border-bottom-color: rgb(70, 70, 80);

      input {
        background-color: rgb(60, 60, 70);
        border-color: rgb(80, 80, 90);
        color: rgb(220, 220, 220);
      }
    }

    .fpm-list {
      li {
        color: rgb(220, 220, 220);

        &.fpm-empty {
          color: rgb(120, 120, 130);
        }
      }
    }

    .fpm-actions {
      border-top-color: rgb(70, 70, 80);

      button {
        background-color: rgb(60, 60, 70);
        border-color: rgb(80, 80, 90);
        color: rgb(220, 220, 220);

        &:hover:not(:disabled) {
          background-color: rgb(75, 75, 85);
        }
      }
    }
  }
}
</style>
