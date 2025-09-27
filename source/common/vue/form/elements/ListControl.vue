<template>
  <!--
    On macOS Big Sur, this represents a TableView
  -->
  <div class="table-view form-control">
    <label v-if="label !== ''" v-html="label"></label>
    <TextControl
      v-if="searchable"
      v-model="query"
      v-bind:placeholder="searchLabel"
      v-bind:search-icon="true"
      v-bind:reset="true"
    ></TextControl>
    <table
      v-bind:class="{
        striped: isStriped,
        'margin-top': searchable
      }"
    >
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
        <template v-if="filteredValue.length > 0">
          <tr
            v-for="(item, rowIdx) in filteredValue"
            v-bind:key="rowIdx"
            class="list-input-item"
          >
            <!-- Here we output the actual contents -->
            <td
              v-for="(column, colIdx) in columnValues(item)"
              v-bind:key="colIdx"
              v-on:dblclick="handleDoubleClick(rowIdx, colIdx)"
            >
              <template v-if="editing.row === rowIdx && editing.col === colIdx">
                <!-- We are currently editing this cell -->
                <Checkbox
                  v-if="typeof column === 'boolean'"
                  v-bind:model-value="column"
                  v-bind:inline="true"
                  v-bind:name="`${name}-checkbox-${rowIdx}-${colIdx}`"
                  v-on:update:model-value="handleInput(rowIdx, colIdx, $event)"
                >
                </Checkbox>
                <NumberControl
                  v-else-if="typeof column === 'number'"
                  v-bind:model-value="column"
                  v-bind:inline="true"
                  v-on:escape="finishEditing()"
                  v-on:blur="handleInput(rowIdx, colIdx, $event)"
                  v-on:confirm="handleInput(rowIdx, colIdx, $event)"
                >
                </NumberControl>
                <TextControl
                  v-else
                  v-bind:model-value="column"
                  v-bind:inline="true"
                  v-on:escape="finishEditing()"
                  v-on:blur="handleInput(rowIdx, colIdx, $event)"
                  v-on:confirm="handleInput(rowIdx, colIdx, $event)"
                >
                </TextControl>
              </template>
              <template v-else>
                <!-- Display booleans as checkboxes ... -->
                <Checkbox
                  v-if="typeof column === 'boolean'"
                  v-bind:model-value="column"
                  v-bind:inline="true"
                  v-bind:disabled="!isColumnEditable(colIdx)"
                  v-bind:name="`${name}-action-${rowIdx}-${colIdx}`"
                  v-on:update:model-value="handleInput(rowIdx, colIdx, $event)"
                >
                </Checkbox>
                <!-- ... and everything else as normal text -->
                <span v-else>{{ column }}</span>
              </template>
            </td>
            <!-- The list items are deletable -->
            <td v-if="deletable" style="text-align: center">
              <button v-on:click="handleDeletion(rowIdx)">
                {{ deleteButtonLabel }}
              </button>
            </td>
            <td v-else-if="addable" style="text-align: center">
              <!-- Empty column to maintain alignment -->
            </td>
          </tr>
        </template>
        <template v-else>
          <tr>
            <td v-bind:colspan="columnCount" style="text-align: center;">
              {{ emptyListLabel }}
            </td>
          </tr>
        </template>
        <!-- If users may add something, allow them to do so here -->
        <tr v-if="addable">
          <td v-for="(colLabel, colIdx) in columnLabels" v-bind:key="colIdx">
            <Checkbox
              v-if="columnType(colIdx) === 'boolean'"
              v-bind:model-value="true"
              v-bind:placeholder="colLabel"
              v-bind:inline="true"
              v-on:update:model-value="valuesToAdd[colIdx] = $event"
              v-on:keydown.enter="handleAddition()"
            >
            </Checkbox>
            <NumberControl
              v-else-if="columnType(colIdx) === 'number'"
              v-bind:placeholder="colLabel"
              v-bind:inline="true"
              v-bind:model-value="0"
              v-on:update:model-value="valuesToAdd[colIdx] = $event"
              v-on:keydown.enter="handleAddition()"
            >
            </NumberControl>
            <TextControl
              v-else
              v-bind:model-value="''"
              v-bind:placeholder="colLabel"
              v-bind:inline="true"
              v-on:update:model-value="valuesToAdd[colIdx] = $event"
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

<script setup lang="ts">
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

import Checkbox from './CheckboxControl.vue'
import TextControl from './TextControl.vue'
import NumberControl from './NumberControl.vue'

import { trans } from '@common/i18n-renderer'
import { computed, onBeforeUpdate, ref } from 'vue'

/**
 * What types of values can our cells have?
 */
export type SupportedValues = boolean|string|number

/**
 * If the user passes a record, we need a Record of our SupportedValues
 */
export type SupportedRecord = Record<string, SupportedValues>

const props = defineProps<{
  /**
   * The actual data, can be a 1D or 2D array, or a record of values.
   */
  modelValue: SupportedValues[]|SupportedValues[][]|SupportedRecord[]
  /**
   * For type inference, you must pass the correct valueType
   */
  valueType: 'simpleArray'|'multiArray'|'record'
  /**
   * Provide the key names if your value type is object
   */
  keyNames?: string[]
  /**
   * An optional label for the data table
   */
  label?: string
  /**
   * User-defined, human-readable labels for the columns. This must correspond
   * to the amount of columns present in your data.
   */
  columnLabels: string[]
  /**
   * The form element's name.
   */
  name?: string
  /**
   * Use striped rows (default: false)
   */
  striped?: boolean
  /**
   * Whether users can add rows (default: false)
   */
  addable?: boolean
  /**
   * Controls editable columns. This variable can be either false (not at all
   * editable), true (all columns are editable), or an array with column
   * indices indicating which are editable.
   */
  editable?: boolean | number[]
  /**
   * Whether rows are deletable (default: false)
   */
  deletable?: boolean
  /**
   * An optional label for the delete button
   */
  deleteLabel?: string
  /**
   * Whether users can filter the table (default: false)
   */
  searchable?: boolean
  /**
   * An optional search label, defaults to `trans('Find…')`
   */
  searchLabel?: string
  /**
   * An optional message to show when the (filtered) list is empty.
   */
  emptyMessage?: string
}>()

const emit = defineEmits(['update:modelValue'])

// DATA
/**
 * The filter value, if applicable
 *
 * @return  {string}  The filter value
 */
const query = ref<string>('')
/**
 * A record of the currently edited row and col (-1 if not editing)
 */
const editing = ref<{ row: number, col: number }>({ row: -1, col: -1 })

/**
 * An array that contains the values to be added if the user confirms the
 * addition.
 */
const valuesToAdd = ref<SupportedValues[]>([])

const addButtonLabel = computed<string>(() => trans('Add'))
const actionsLabel = computed<string>(() => trans('Actions'))
const deleteButtonLabel = computed<string>(() => props.deleteLabel ?? trans('Delete'))
const emptyListLabel = computed<string>(() => props.emptyMessage ?? trans('No records.'))
const isStriped = computed<boolean>(() => props.striped ?? true)

const columnCount = computed<number>(() => {
  const baseCount = props.columnLabels.length
  if (props.deletable || props.addable) {
    return baseCount + 1
  } else {
    return baseCount
  }
})

/**
 * Returns modelValue coerced to a simpleArray, or undefined if it is not.
 *
 * @return  {SupportedValues[]|undefined}  The properly coerced type
 */
const asSimpleArray = computed<SupportedValues[]|undefined>(() => {
  if (props.valueType === 'simpleArray') {
    return props.modelValue as SupportedValues[]
  } else {
    return undefined
  }
})

/**
 * Returns modelValue coerced to a multiArray, or undefined if it is not.
 *
 * @return  {SupportedValues[][]|undefined}  The properly coerced type
 */
const asMultiArray = computed<SupportedValues[][]|undefined>(() => {
  if (props.valueType === 'multiArray') {
    return props.modelValue as SupportedValues[][]
  } else {
    return undefined
  }
})

/**
 * Returns modelValue coerced to a record, or undefined if it is not.
 *
 * @return  {SupportedRecord|undefined}  The properly coerced type
 */
const asRecord = computed<SupportedRecord[]|undefined>(() => {
  if (props.valueType === 'record') {
    return props.modelValue as SupportedRecord[]
  } else {
    return undefined
  }
})

/**
 * Contains the object keys if the data is a record, or undefined
 *
 * @return  {string[]|undefined}  The object keys or undefined
 */
const objectKeys = computed<string[]|undefined>(() => {
  if (props.valueType !== 'record' || props.keyNames === undefined) {
    return undefined
  }

  if (props.keyNames.length > 0) {
    return props.keyNames
  } else if (props.modelValue.length > 0) {
    return Object.keys(props.modelValue[0])
  } else {
    return undefined
  }
})

/**
 * modelValue, but filtered using query
 */
const filteredValue = computed<SupportedValues[] | SupportedValues[][] | SupportedRecord[]>(() => {
  // If no options are passed, this indicates that
  // the list is rather populated as a very simple
  // list. In that case, we'll spit out the value.
  const q = query.value.trim().toLowerCase()
  if (q === '' || props.modelValue.length === 0) {
    return props.modelValue
  }

  const simple = asSimpleArray.value
  const multi = asMultiArray.value
  const record = asRecord.value

  if (simple !== undefined) {
    return simple.filter(elem => {
      return String(elem).toLowerCase().includes(q)
    })
  } else if (multi !== undefined) {
    return multi.filter(elem => {
      for (const column of elem) {
        // Same, but for each column
        if (String(column).toLowerCase().includes(q)) {
          return true
        }
      }
      return false
    })
  } else if (record !== undefined) {
    return record.filter(elem => {
      // We have an object, so the same as multiArray, but with Object.keys()
      for (const key of Object.keys(elem)) {
        if (String(elem[key]).toLowerCase().includes(q)) {
          return true
        }
      }
      return false
    })
  } else {
    return []
  }
})

onBeforeUpdate(() => {
  // Reset the available input columns
  valuesToAdd.value = []
})

/**
 * Returns the values for a single column
 *
 * @param   {SupportedRecord|SupportedValues[]|SupportedValues}  element  The
 *                                                                        (row)
 *                                                                        element
 *
 * @return  {SupportedValues[]}                   The contents of the given row as an array of SupportedValues
 */
function columnValues (element: SupportedRecord|SupportedValues[]|SupportedValues): SupportedValues[] {
  // Returns the value of the given element in a way that can be display
  // in the table within the rendering template.
  if (typeof element !== 'object') {
    return [element] // One-element array
  } else if (Array.isArray(element)) {
    return element // It's already an array
  } else {
    // Return all object values
    return Object.values(element)
  }
}

/**
 * Determines if the given column is editable
 *
 * @param   {number}   columnIndex  The column to check
 *
 * @return  {boolean}               Whether the column is editable
 */
function isColumnEditable (columnIndex: number): boolean {
  if (props.editable === undefined) {
    return false
  } else if (typeof props.editable === 'boolean') {
    return props.editable // All or nothing
  } else {
    return props.editable.includes(columnIndex)
  }
}

/**
 * Returns the type of the column.
 *
 * @param   {number}  columnIndex  The column in question
 *
 * @return  {string}               The type of the column
 */
function columnType (columnIndex: number): 'string'|'number'|'bigint'|'boolean'|'symbol'|'undefined'|'object'|'function' {
  if (props.modelValue.length === 0) {
    return 'string' // ¯\_(ツ)_/¯
  }

  const simple = asSimpleArray.value
  const multi = asMultiArray.value
  const record = asRecord.value

  if (simple !== undefined) {
    return typeof simple[0]
  } else if (multi !== undefined) {
    return typeof multi[0][columnIndex]
  } else if (record !== undefined && objectKeys.value !== undefined) {
    return typeof record[0][objectKeys.value[columnIndex]]
  } else {
    return 'string'
  }
}

/**
 * Makes a given cell editable if applicable
 *
 * @param   {number}  row  The row index
 * @param   {number}  col  The column index
 */
function handleDoubleClick (row: number, col: number): void {
  if (isColumnEditable(col)) {
    editing.value.row = row
    editing.value.col = col
  }
}

/**
 * Should be called after editing a cell to reset it to an uneditable state.
 */
function finishEditing (): void {
  editing.value.row = -1
  editing.value.col = -1
}

/**
 * Allows the user to edit records in the data table
 *
 * @param   {number}           row       The affected row index
 * @param   {number}           col       The column index
 * @param   {SupportedValues}  newValue  The new value
 */
function handleInput (row: number, col: number, newValue: SupportedValues): void {
  const emitValue = []

  const simple = asSimpleArray.value
  const multi = asMultiArray.value
  const record = asRecord.value

  for (let i = 0; i < props.modelValue.length; i++) {
    if (i !== row) {
      // Nothing changed here, so retain the old value
      emitValue.push(props.modelValue[i])
    } else if (simple !== undefined) {
      // Simply push the new value instead of the old one
      emitValue.push(newValue)
    } else if (multi !== undefined) {
      // Exchange the correct column with the new value
      const newRow = []
      for (let j = 0; j < multi[i].length; j++) {
        if (j !== col) {
          newRow.push(multi[i][j])
        } else {
          newRow.push(newValue)
        }
      }
      emitValue.push(newRow)
    } else if (record !== undefined && objectKeys.value !== undefined) {
      // Set the correct key to the new value
      const newObj = Object.assign({}, record[i])
      newObj[objectKeys.value[col]] = newValue
      emitValue.push(newObj)
    }
  }

  // After we have amended the value, emit the new array of values.
  emit('update:modelValue', emitValue)

  // Also, in any case make sure we exit the editing mode after something
  // has changed.
  finishEditing()
}

/**
 * Allows the user to delete a table row
 *
 * @param   {number}  key  The row to be deleted
 */
function handleDeletion (key: number): void {
  // This function deletes elements
  const simple = asSimpleArray.value
  const multi = asMultiArray.value
  const record = asRecord.value

  // Here we basically just find the element in the unfiltered original array
  // and emit an update that includes the array without the deleted row.
  if (simple !== undefined) {
    const realIndex = simple.indexOf(filteredValue.value[key] as SupportedValues)
    const newValue = simple.filter((elem, index) => {
      return index !== realIndex
    })
    emit('update:modelValue', newValue)
  } else if (multi !== undefined) {
    const realIndex = multi.indexOf(filteredValue.value[key] as SupportedValues[])
    const newValue = multi.filter((elem, index) => {
      return index !== realIndex
    })
    emit('update:modelValue', newValue)
  } else if (record !== undefined) {
    const realIndex = record.indexOf(filteredValue.value[key] as SupportedRecord)
    const newValue = record.filter((elem, index) => {
      return index !== realIndex
    })
    emit('update:modelValue', newValue)
  }
}

/**
 * Allows the user to add a new entry -- is called after the user finishes the
 * addition workflow
 */
function handleAddition (): void {
  const simple = asSimpleArray.value
  const multi = asMultiArray.value
  const record = asRecord.value

  const newValues = valuesToAdd.value

  if (newValues.some(x => x === undefined)) {
    console.error('Cannot add new record: Some value was undefined.', newValues)
    return
  }

  if (simple !== undefined) {
    const newValue = simple.map(elem => elem)
    newValue.push(newValues[0])
    emit('update:modelValue', newValue)
  } else if (multi !== undefined) {
    const newValue = multi.map(elem => elem.map(elem => elem))
    newValue.push(newValues.map(x => x))
    emit('update:modelValue', newValue)
  } else if (record !== undefined && objectKeys.value !== undefined) {
    if (objectKeys.value.length !== newValues.length) {
      console.error('Cannot add new record: Didn\'t receive the right amount of values to add.')
      return
    }

    const newValue = record.map(elem => Object.assign({}, elem))
    const keys = objectKeys.value
    const newObject: SupportedRecord = {}
    for (let i = 0; i < keys.length; i++) {
      newObject[keys[i]] = newValues[i]
    }

    newValue.push(newObject)
    emit('update:modelValue', newValue)
  }
}

</script>

<style lang="less">
// Maps to AppKit's TableView. See:
// https://developer.apple.com/design/human-interface-guidelines/macos/windows-and-views/table-views/
body {
  div.table-view {
    break-inside: avoid; // Avoid breaking table views when inside column views

    table {
      border: 1px solid rgb(220, 220, 220);
      background-color: white;
      border-collapse: collapse;
      line-height: 100%;
      overflow: auto;
      width: 100%;

      &.striped {
        border: none;
        tr:nth-child(2n) {
          background-color: rgb(249, 249, 249);
        }
      }

      &.margin-top { margin-top: 8px; }

      thead {
        tr {
          border-bottom: 1px solid rgb(220, 220, 220);
          th {
            padding: 4px;
            font-size: small;
            font-weight: normal;
            text-align: left;

            &:not(:last-child) {
              border-right: 1px solid rgb(220, 220, 220);
            }
          }
        }
      }

      tbody {
        tr {
          td {
            padding: 4px;
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
        background-color: transparent;
        &.striped {
          tr:nth-child(2n) {
            background-color: rgb(50, 50, 50);
          }
        }
      }
    }
  }
}

body.darwin {
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
