<template>
  <!--
    On macOS Big Sur, this represents a TableView
  -->
  <div class="table-view form-control">
    <label v-if="label !== ''" v-html="label"></label>
    <input
      v-if="searchable"
      v-model="query"
      class="filter"
      type="search"
      v-bind:placeholder="searchLabel"
    >
    <table v-bind:class="{ 'striped': striped }">
      <!-- Head row -->
      <thead>
        <tr>
          <th v-for="(colLabel, idx) in columnLabels" v-bind:key="idx">
            {{ colLabel }}
          </th>
          <th v-if="deletable || addable">
            {{ actionsLabel }}
          </th>
        </tr>
      </thead>
      <!-- Table body -->
      <tbody>
        <tr
          v-for="(item, idx) in filteredValue"
          v-bind:key="idx"
          class="list-input-item"
        >
          <!-- Here we output the actual contents -->
          <td
            v-for="(column, colIdx) in columnValues(item)"
            v-bind:key="colIdx"
            v-on:dblclick="handleDoubleClick(idx, colIdx)"
          >
            <template v-if="editing.row === idx && editing.col === colIdx">
              <!-- We are currently editing this cell -->
              <Checkbox
                v-if="typeof column === 'boolean'"
                v-bind:model-value="column"
                v-bind:name="`${name}-checkbox-${idx}-${colIdx}`"
                v-on:update:model-value="handleInput(idx, colIdx, $event)"
              >
              </Checkbox>
              <NumberControl
                v-else-if="typeof column === 'number'"
                v-bind:model-value="column"
                v-on:escape="finishEditing()"
                v-on:blur="handleInput(idx, colIdx, $event)"
                v-on:confirm="handleInput(idx, colIdx, $event)"
              >
              </NumberControl>
              <TextControl
                v-else
                v-bind:model-value="column"
                v-on:escape="finishEditing()"
                v-on:blur="handleInput(idx, colIdx, $event)"
                v-on:confirm="handleInput(idx, colIdx, $event)"
              >
              </TextControl>
            </template>
            <template v-else>
              <!-- Display booleans as checkboxes ... -->
              <Checkbox
                v-if="typeof column === 'boolean'"
                v-bind:model-value="column"
                v-bind:disabled="isColumnEditable(colIdx) === false"
                v-bind:name="`${name}-action-${idx}-${colIdx}`"
                v-on:update:model-value="handleInput(idx, colIdx, $event)"
              >
              </Checkbox>
              <!-- ... and everything else as normal text -->
              <span v-else>{{ column }}</span>
            </template>
          </td>
          <!-- The list items are deletable -->
          <td v-if="deletable" style="text-align: center">
            <button v-on:click="handleDeletion(idx)">
              {{ deleteLabel }}
            </button>
          </td>
          <td v-else-if="addable" style="text-align: center">
            <!-- Empty column to maintain alignment -->
          </td>
        </tr>
        <!-- If users may add something, allow them to do so here -->
        <tr v-if="addable">
          <td v-for="(colLabel, idx) in columnLabels" v-bind:key="idx">
            <Checkbox
              v-if="columnType(idx) === 'boolean'"
              v-bind:placeholder="colLabel"
              v-on:update:model-value="valuesToAdd[idx] = $event"
              v-on:keydown.enter="handleAddition()"
            >
            </Checkbox>
            <NumberControl
              v-else-if="columnType(idx) === 'number'"
              v-bind:placeholder="colLabel"
              v-on:update:model-value="valuesToAdd[idx] = $event"
              v-on:keydown.enter="handleAddition()"
            >
            </NumberControl>
            <TextControl
              v-else
              v-bind:placeholder="colLabel"
              v-on:update:model-value="valuesToAdd[idx] = $event"
              v-on:keydown.enter="handleAddition()"
            >
            </TextControl>
          </td>
          <td style="text-align: center">
            <button v-on:click="handleAddition()">
              {{ addButtonLabel }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        List
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component displays a tabled list
 *
 * END HEADER
 */

import Checkbox from './Checkbox'
import TextControl from './Text'
import NumberControl from './Number'

import { trans } from '@common/i18n-renderer'

export default {
  name: 'ListField',
  components: {
    Checkbox,
    TextControl,
    NumberControl
  },
  props: {
    // Value must contain an array with elements to be displayed. These can come
    // in three flavours: 1.) a simple, one-dimensional array. Then the table
    // will only contain a single column. 2.) A two-dimensional array. Then the
    // first index contains the rows, and the second index the columns. Thus,
    // all inner array must be of the same length. 3.) An object-array. Then,
    // all enumerable properties (returned by Object.keys()) contain the columns.
    // Hence, all objects must have the same properties.
    modelValue: {
      type: Array,
      default: function () { return [] }
    },
    label: {
      type: String,
      default: ''
    },
    /**
     * Optional user-defined labels for the columns
     */
    labels: {
      type: Array,
      default: function () { return [] }
    },
    /**
     * The form element's name.
     */
    name: {
      type: String,
      default: ''
    },
    /**
     * Do we want a striped table?
     */
    striped: {
      type: Boolean,
      default: true
    },
    /**
     * If set to true, users may add new rows
     */
    addable: {
      type: Boolean,
      default: false
    },
    /**
     * Controls editable columns. This variable can be either false (not at all
     * editable), true (all columns are editable), or an array with column
     * indices indicating which are editable.
     */
    editable: {
      type: [ Boolean, Array ],
      default: false
    },
    /**
     * Whether rows are deletable
     */
    deletable: {
      type: Boolean,
      default: false
    },
    /**
     * Is the table searchable?
     */
    searchable: {
      type: Boolean,
      default: false
    },
    /**
     * An optional search label
     */
    searchLabel: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue'],
  data: function () {
    return {
      query: '', // Optional filter
      // Contains the pointer to the currently editing cell
      editing: { row: -1, col: -1 },
      valuesToAdd: [] // Contains values to add
    }
  },
  computed: {
    /**
     * Returns the type of the value to be displayed.
     *
     * @return  {string}  Can be simpleArray, multiArray, or object.
     */
    valueType: function () {
      if (this.modelValue.length === 0) {
        return 'simpleArray'
      }

      const testElement = this.modelValue[0]
      const isPrimitive = [ 'number', 'boolean', 'string' ].includes(typeof testElement)
      const isNone = testElement === undefined || testElement === null

      if (Array.isArray(testElement)) {
        // We have a multidimensional array
        return 'multiArray'
      } else if (isPrimitive || isNone) {
        // We have a one-dimensional array of primitives
        return 'simpleArray'
      } else {
        // It only can be an object. Errors may be thrown if the user
        // (that's you!) passes a false value.
        return 'object'
      }
    },
    addButtonLabel: function () {
      return trans('Add')
    },
    actionsLabel: function () {
      return trans('Actions')
    },
    deleteLabel: function () {
      return trans('Delete')
    },
    columnLabels: function () {
      if (this.labels.length !== 0) {
        return this.labels // The user provided labels for us
      }

      // Else: We have to find the labels by looking at the value
      if (this.valueType === 'object' && this.modelValue.length > 0) {
        // We can infer the values from the object keys
        return Object.keys(this.modelValue[0])
      } else if (this.valueType === 'multiArray' && this.modelValue.length > 0) {
        // We have a multi-array so there are no column names -> return a list
        // of numbers
        const labels = []
        for (let i = 1; i <= this.modelValue[0].length; i++) {
          labels.push(i)
        }
        return labels
      }

      // Apparently we have a simple array, so exactly one column
      return [trans('Item')]
    },
    platform: function () {
      return process.platform
    },
    filteredValue: function () {
      // If no options are passed, this indicates that
      // the list is rather populated as a very simple
      // list. In that case, we'll spit out the value.
      const query = this.query.trim().toLowerCase()
      if (query === '') {
        // No filtering
        return this.modelValue
      } else {
        // Filtered values
        return this.modelValue.filter(element => {
          if (this.valueType === 'simpleArray') {
            // Return the string coerced index
            return String(element).indexOf(query) > -1
          } else if (this.valueType === 'multiArray') {
            for (const column of element) {
              // Same, but for each column
              if (String(column).indexOf(query) > -1) {
                return true
              }
            }
            return false
          } else {
            // We have an object, so the same as multiArray, but with Object.keys()
            for (const key of Object.keys(element)) {
              if (String(element[key]).indexOf(query) > -1) {
                return true
              }
            }
            return false
          }
        })
      }
    }
  },
  beforeUpdate: function () {
    // Reset the available input columns
    this.valuesToAdd = []
  },
  methods: {
    columnValues: function (element) {
      // Returns the value of the given element in a way that can be display
      // in the table within the rendering template.
      if (this.valueType === 'simpleArray') {
        return [element] // One-element array
      } else if (this.valueType === 'multiArray') {
        return element // It's already an array
      } else if (this.valueType === 'object') {
        // Return all object values
        return Object.values(element)
      }
    },
    isColumnEditable: function (idx) {
      if (typeof this.editable === 'boolean') {
        return this.editable // All or nothing
      }

      return this.editable.includes(idx)
    },
    columnType: function (idx) {
      if (this.modelValue.length === 0) {
        return 'string' // ¯\_(ツ)_/¯
      }

      if (this.valueType === 'simpleArray') {
        return typeof this.modelValue[0]
      } else if (this.valueType === 'multiArray') {
        return typeof this.modelValue[0][idx]
      } else if (this.valueType === 'object') {
        const keys = Object.keys(this.modelValue[0])
        return typeof this.modelValue[0][keys[idx]]
      }
    },
    handleInput: function (row, col, newValue) {
      const emitValue = []

      for (let i = 0; i < this.modelValue.length; i++) {
        if (i !== row) {
          // Nothing changed here, so retain the old value
          emitValue.push(this.modelValue[i])
        } else if (this.valueType === 'simpleArray') {
          // Simply push the new value instead
          emitValue.push(newValue)
        } else if (this.valueType === 'multiArray') {
          // Exchange the correct column with the new value
          const newRow = []
          for (let j = 0; j < this.modelValue[i].length; j++) {
            if (j !== col) {
              newRow.push(this.modelValue[i][j])
            } else {
              newRow.push(newValue)
            }
          }
          emitValue.push(newRow)
        } else if (this.valueType === 'object') {
          // Set the correct key to the new value
          const newObj = Object.assign({}, this.modelValue[i])
          newObj[Object.keys(newObj)[col]] = newValue
          emitValue.push(newObj)
        }
      }

      // After we have amended the value, emit the new array of values.
      this.$emit('update:modelValue', emitValue)

      // Also, in any case make sure we exit the editing mode after something
      // has changed.
      this.finishEditing()
    },
    handleDeletion: function (key) {
      // This function deletes elements
      const realIndex = this.modelValue.indexOf(this.filteredValue[key])
      const newValue = this.modelValue.filter((elem, index) => {
        return index !== realIndex
      })
      this.$emit('update:modelValue', newValue)
    },
    handleAddition: function () {
      // NOTE: This will break with checkboxes or radio buttons. But, hell,
      // we only need to add checkboxes. Additionally, this requires that the
      // components all declare a ref "input" which is an input element ...
      const newValues = this.valuesToAdd // .map(elem => elem.$refs['input'].value)

      // Refs is now an array of all columns
      if (this.valueType === 'simpleArray') {
        const newValue = this.modelValue.map(elem => elem)
        newValue.push(newValues[0])
        this.$emit('update:modelValue', newValue)
      } else if (this.valueType === 'multiArray') {
        const newValue = this.modelValue.map(elem => elem.map(elem => elem))
        newValue.push(newValues)
        this.$emit('update:modelValue', newValue)
      } else if (this.valueType === 'object') {
        const newValue = this.modelValue.map(elem => Object.assign({}, elem))
        const keys = Object.keys(newValue[0])
        const newObject = {}
        for (let i = 0; i < keys.length; i++) {
          newObject[keys[i]] = newValues[i]
        }
        newValue.push(newObject)
        this.$emit('update:modelValue', newValue)
      }

      // TODO: Reset the values
      // this.$refs['add_row'].forEach(elem => { elem.$refs['input'].value = '' })
    },
    handleDoubleClick: function (row, col) {
      if (this.isColumnEditable(col) === true) {
        this.editing.row = row
        this.editing.col = col
      }
    },
    finishEditing: function () {
      this.editing.row = -1
      this.editing.col = -1
    }
  }
}
</script>

<style lang="less">
// Maps to AppKit's TableView. See:
// https://developer.apple.com/design/human-interface-guidelines/macos/windows-and-views/table-views/
body {
  div.table-view {
    break-inside: avoid; // Avoid breaking table views when inside column views
    margin: 5px;

    table {
      border: 1px solid rgb(220, 220, 220);
      border-collapse: collapse;
      line-height: 100%;
      overflow: auto;
      width: 100%;

      &.striped {
        border: none;
        tr:nth-child(2n) {
          background-color: rgb(220, 220, 220);
        }
      }

      thead{
        tr {
          border-bottom: 1px solid rgb(180, 180, 180);
          th {
            padding: 4px;
            font-size: small;
            font-weight: normal;
            text-align: left;
            border-right: 1px solid rgb(180, 180, 180);
          }
        }
      }

      tbody {
        tr {
          td {
            padding: 1px 4px;
            margin: 0;
            &:focus {
              outline: 0;
              background-color: var(--system-accent-color, rgb(230, 230, 230));
            }
          }
        }
      }
    }
  }

  &.dark {
    div.table-view {
      table {
        &.striped {
          tr:nth-child(2n) {
            background-color: rgb(50, 50, 50);
          }
        }
      }
    }
  }
}

body.darwin{
  &.dark {
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
}

body.win32 {
  div.table-view {
    input.filter {
      margin-bottom: 5px;
    }

    table {
      thead{
        tr {
          border-bottom: none;
          background-color: rgb(220, 220, 220);

          th {
            font-weight: bold;
            border-right: none;
          }
        }
      }
    }
  }

  &.dark {
    div.table-view {
      table {
        thead {
          tr {
            background-color: rgb(50, 50, 50);
          }
        }
      }
    }
  }
}
</style>
