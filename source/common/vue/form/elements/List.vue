<template>
  <!--
    On macOS Big Sur, this represents a TableView
  -->
  <div v-bind:class="{
    'table-view': platform === 'darwin',
    'form-control': true
  }"
  >
    <input
      v-if="listOptions.searchable"
      v-model="query"
      type="search"
      v-bind:placeholder="listOptions.searchLabel"
    >
    <table>
      <!-- Head row -->
      <thead>
        <tr>
          <th v-if="listOptions.selectable">
            <clr-icon shape="check-circle"></clr-icon>
          </th>
          <template v-if="listOptions.isDatatable">
            <th>Keys</th>
            <th>Values</th>
          </template>
          <template v-else>
            <!-- Not a datatable -->
            <th>{{ label }}</th>
          </template>
          <th v-if="listOptions.deletable">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, key, idx) in filteredOptions"
          v-bind:key="key"
          class="list-input-item"
        >
          <td v-if="listOptions.selectable" style="text-align: center">
            <!-- The list items are selectable -->
            <Checkbox
              v-bind:value="value.includes(key)"
              v-on:input="handleSelection(key, $event)"
            >
            </Checkbox>
          </td>
          <!-- Datatable: Key->value mappings -->
          <td
            v-if="listOptions.isDatatable"
          >
            {{ key }}
          </td>
          <td v-bind:tabindex="idx">
            <!-- Item contents -->
            {{ item }}
          </td>
          <td v-if="listOptions.deletable" style="text-align: center">
            <button v-on:click="handleDeletion(key)">
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import Checkbox from './checkbox.vue'

export default {
  name: 'ListField',
  components: {
    Checkbox
  },
  props: {
    // Value contains a list of already selected items, but only if it's a selectable list
    value: {
      type: Array,
      default: function () { return [] }
    },
    label: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    listOptions: {
      type: Object,
      default: function () {
        return {
          searchable: false,
          selectable: false,
          deletable: false,
          isDatatable: false,
          editable: true // Only important when isDatatable is true
        }
      }
    },
    options: {
      type: Object,
      default: function () { return {} }
    }
  },
  data: function () {
    return {
      query: '' // Optional filter
    }
  },
  computed: {
    platform: function () {
      return process.platform
    },
    filteredOptions: function () {
      // If no options are passed, this indicates that
      // the list is rather populated as a very simple
      // list. In that case, we'll spit out the value.
      const query = this.query.trim().toLowerCase()
      const source = (this.listOptions.isDatatable) ? this.value : this.options
      if (query === '') {
        // Full display datatable
        return source
      } else {
        // Filtered restricted option set
        const returnValue = {}
        for (const key in source) {
          if (source[key].toLowerCase().includes(query)) {
            returnValue[key] = source[key]
          }
        }
        return returnValue
      }
    }
  },
  methods: {
    handleSelection: function (key, isSelected) {
      const currentValue = this.value

      // If the selection changes the list value, emit
      // an input event with the new value.
      if (isSelected && !currentValue.includes(key)) {
        currentValue.push(key)
        this.$emit('input', currentValue)
      } else {
        currentValue.splice(currentValue.indexOf(key), 1)
        this.$emit('input', currentValue)
      }
    },
    handleDeletion: function (key) {
      // This function deletes elements
      const newOptions = {}
      const source = (this.listOptions.isDatatable) ? this.value : this.options

      for (let optionKey in source) {
        if (optionKey !== key) {
          newOptions[optionKey] = source[optionKey]
        }
      }
      this.$emit('input', newOptions)
    }
  }
}
</script>

<style lang="less">
// Maps to AppKit's TableView. See:
// https://developer.apple.com/design/human-interface-guidelines/macos/windows-and-views/table-views/
div.table-view {
  .filter {
    // Optional filter field
  }
  break-inside: avoid; // Avoid breaking table views when inside column views

  table {
    // font-family: @font-system;
    border: 1px solid rgb(220, 220, 220);
    border-collapse: collapse;
    line-height: 100%;
    overflow: auto;
    width: 100%;

    thead{
      tr {
        border-bottom: 1px solid rgb(220, 220, 220);
        th {
          padding: 4px;
          font-size: small;
          font-weight: normal;
          text-align: left;
          border-right: 1px solid rgb(220, 220, 220);
        }
      }
    }

    tbody {
      tr {
        td {
          padding: 1px 4px;
          margin: 0;
          border-radius: 4px;
          &:focus {
            outline: 0;
            background-color: rgb(230, 230, 230);
          }
        }
      }
    }
  }
}

body.darwin.dark {
  input, select, textarea, button {
    color: rgb(215, 215, 215);
    border-color: transparent;
    background-color: rgb(85, 85, 85);
    border-top-color: rgb(100, 100, 100);
  }

  div.table-view {
    table {
      border-color: rgb(50, 50, 50);

      thead{
        tr {
          border-bottom-color: rgb(50, 50, 50);
          th {
            border-right-color: rgb(50, 50, 50);
          }
        }
      }

      tbody tr td:focus {
        background-color: rgb(70, 70, 70);
      }
    }
  }
}
</style>
