<template>
  <div>
    <h4>Properties: {{ dirname }}</h4>
    <div class="properties-info-container">
      <div><span>Created: {{ creationTime }}</span></div>
      <div>
        <span>Files: {{ formattedFiles }}</span>
      </div>
    </div>
    <div class="properties-info-container">
      <div><span>Modified: {{ modificationTime }}</span></div>
      <div><span>Folders: {{ formattedDirs }}</span></div>
    </div>
    <hr>
    <!-- Sorting options -->
    <SelectControl
      v-model="sortingType"
      v-bind:inline="true"
      v-bind:options="{
        'name': 'Sort by name',
        'time': 'Sort by time'
      }"
    ></SelectControl>
    <SelectControl
      v-model="sortingDirection"
      v-bind:inline="true"
      v-bind:options="{
        'up': 'ascending',
        'down': 'descending'
      }"
    ></SelectControl>
  </div>
</template>

<script>
import formatDate from '../../common/util/format-date'
import localiseNumber from '../../common/util/localise-number'
import SelectControl from '../../common/vue/form/elements/Select'

export default {
  name: 'PopoverDirProps',
  components: {
    SelectControl
  },
  data: function () {
    return {
      dirname: '',
      creationtime: 0,
      modtime: 0,
      files: 0,
      dirs: 0,
      sortingType: 'name',
      sortingDirection: 'up'
    }
  },
  computed: {
    // This property needs to be exposed on every Popover. The popover needs to
    // return the data that will then be reported back to the caller.
    popoverData: function () {
      return {
        sorting: `${this.sortingType}-${this.sortingDirection}`
      }
    },
    creationTime: function () {
      return formatDate(new Date(this.creationtime), true)
    },
    modificationTime: function () {
      return formatDate(new Date(this.modtime), true)
    },
    formattedFiles: function () {
      return localiseNumber(this.files)
    },
    formattedDirs: function () {
      return localiseNumber(this.dirs)
    }
  },
  methods: {
  }
}
</script>

<style lang="less">
// Styles are defined in the File popover
</style>
