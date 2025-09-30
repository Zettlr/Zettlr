<template>
  <div ref="component-container" class="form-container">
    <template
      v-for="(fieldset, idx) in schema.fieldsets"
      v-bind:key="idx"
    >
      <div
        v-if="schema.getFieldsetCategory(fieldset) !== undefined"
        class="fieldset-category"
      >
        <cds-icon v-bind:shape="schema.getFieldsetCategory(fieldset)?.icon"></cds-icon>
        <span>
          {{ schema.getFieldsetCategory(fieldset)?.title }}
        </span>
      </div>
      <fieldset>
        <!-- First, let's do some setup of the fieldset -->
        <div class="form-header">
          <!-- First the fieldset legend: Required -->
          <legend>
            {{ fieldset.title }}
          </legend>
          <!-- Then an optional title area form field -->
          <div v-if="fieldset.titleField !== undefined" class="form-header-field">
            <FormFieldControl
              v-bind:field="fieldset.titleField"
              v-bind:model="getModelValue(fieldset.titleField.model)"
              v-on:update:model-value="emit('update:modelValue', fieldset.titleField.model, $event)"
            ></FormFieldControl>
          </div>
          <!-- Finally the optional help tooltip -->
          <div
            v-if="fieldset.help !== undefined" class="form-help"
          >
            ?
          </div>
        </div>
        <!-- Info String, if applicable -->
        <p v-if="fieldset.infoString" style="margin: 10px 0;" class="form-field-info-text">
          {{ fieldset.infoString }}
        </p>

        <!-- Now to the contents of the fieldset -->
        <template v-for="(field, fieldIdx) in fieldset.fields" v-bind:key="fieldIdx">
          <FormFieldControl
            v-if="'model' in field"
            v-bind:field="field"
            v-bind:model="getModelValue(field.model)"
            v-on:update:model-value="emit('update:modelValue', field.model, $event)"
          ></FormFieldControl>
          <div
            v-else-if="field.type === 'style-group'"
            class="style-group"
          >
            <p
              v-if="field.label !== undefined"
              class="form-field-plain-text"
            >
              {{ field.label }}
            </p>
            <div v-bind:class="{ columns: field.style === 'columns' }">
              <template v-for="(subField, subfieldIdx) in field.fields" v-bind:key="subfieldIdx">
                <FormFieldControl
                  v-if="'model' in subField"
                  v-bind:field="subField"
                  v-bind:model="getModelValue(subField.model)"
                  v-on:update:model-value="emit('update:modelValue', subField.model, $event)"
                ></FormFieldControl>
                <FormFieldControl
                  v-else
                  v-bind:field="subField"
                  v-bind:model="undefined"
                ></FormFieldControl>
              </template>
            </div>
          </div>
          <!-- Display a set of related controls in a table/grid-like layout -->
          <div
            v-else-if="field.type === 'control-grid'"
            class="control-grid"
          >
            <div v-if="field.header !== undefined" class="control-grid-row">
              <div v-for="(header, headerIdx) in field.header" v-bind:key="headerIdx" class="control-grid-cell heading">
                {{ header }}
              </div>
            </div>
            <div v-for="(row, rowIdx) in field.rows" v-bind:key="rowIdx" class="control-grid-row">
              <div v-for="(subField, subfieldIdx) in row" v-bind:key="`${rowIdx}${subfieldIdx}`" class="control-grid-cell">
                <FormFieldControl
                  v-if="'model' in subField"
                  v-bind:field="subField"
                  v-bind:model="getModelValue(subField.model)"
                  v-on:update:model-value="emit('update:modelValue', subField.model, $event)"
                ></FormFieldControl>
                <FormFieldControl
                  v-else
                  v-bind:field="subField"
                  v-bind:model="undefined"
                ></FormFieldControl>
              </div>
            </div>
          </div>
          <!-- Else for all elements that don't have a model (i.e., the separator) -->
          <FormFieldControl
            v-else
            v-bind:field="field"
            v-bind:model="undefined"
          ></FormFieldControl>
        </template>
      </fieldset>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Form
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component enables complex forms to be instantiated on a
 *                  schema-basis. This means: You define a simple schema, and
 *                  all markup will be handled by this component. See the
 *                  preferences window for a complete example.
 *
 * END HEADER
 */

// Reference for how to do all this stuff dynamically:
// https://css-tricks.com/creating-vue-js-component-instances-programmatically/

import type { ThemeDescriptor } from './elements/ThemeSelector.vue'
import FormFieldControl from './FormField.vue'
import type { FileFilter } from 'electron'

interface BasicInfo {
  /**
   * The model in the underlying data structure this form element should update.
   */
  model: string
  /**
   * Optional label to put before the input
   */
  label?: string
  /**
   * Whether the field should be displayed inline
   */
  inline?: boolean
  /**
   * An optional group that can be used to sort items into various groups
   */
  group?: string
  /**
   * Whether the field is disabled
   */
  disabled?: boolean
  /**
   * An optional placeholder, not supported everywhere
   */
  placeholder?: string
}

interface Separator {
  type: 'separator'
}

interface FormText {
  type: 'form-text'
  display: 'info'|'sub-heading'|'plain'
  contents: string
}

interface FormButton {
  type: 'button'
  label: string
  onClick: () => void
}

interface TextField extends BasicInfo {
  type: 'text'
  /**
   * Optional placeholder text
   */
  placeholder?: string
  /**
   * Optional resettability; if true will reset to empty, otherwise to the string
   */
  reset?: string|boolean
  /**
   * Optional info string to put below the field
   */
  info?: string
  /**
   * Whether the field is disabled
   */
  disabled?: boolean
}

interface NumberField extends BasicInfo {
  type: 'number'
  reset?: number
}

interface TimeField extends BasicInfo {
  type: 'time'
}

interface ColorField extends BasicInfo {
  type: 'color'
}

interface FileField extends BasicInfo {
  type: 'file'|'directory'
  reset?: string|boolean
  filter?: FileFilter[]
}

interface CheckboxField extends BasicInfo {
  type: 'checkbox'|'switch'
  info?: string
}

interface RadioField extends BasicInfo {
  type: 'radio'
  options: Record<string, string>
}

interface SelectField extends BasicInfo {
  type: 'select'
  options: Record<string, string>
}

interface ListField extends BasicInfo {
  type: 'list'
  valueType: 'simpleArray'|'multiArray'|'record'
  keyNames?: string[]
  columnLabels: string[]
  striped?: boolean
  addable?: boolean
  editable?: boolean | number[]
  deletable?: boolean
  deleteLabel?: string
  searchable?: boolean
  searchLabel?: string
  emptyMessage?: string
}

interface TokenField extends BasicInfo {
  type: 'token'
}

interface SliderField extends BasicInfo {
  type: 'slider'
  min?: number
  max?: number
}

interface ThemeField extends BasicInfo {
  type: 'theme'
  options: Record<string, ThemeDescriptor>
}

/**
 * Fields that can occur within the form field list
 */
export type FormField = Separator|FormText|FormButton|TextField|NumberField|
TimeField|ColorField|FileField|CheckboxField|RadioField|SelectField|ListField|
TokenField|SliderField|ThemeField

/**
 * Fields that can only occur within the title area of a fieldset
 */
export type TitleFormField = TextField|NumberField|TimeField|ColorField|
FileField|CheckboxField|RadioField|SelectField|ListField|TokenField|
SliderField

/**
 * This field can be used to apply styles to various groups of fields. Only
 * available directly as children of fieldsets
 */
interface StyleGroup {
  type: 'style-group'
  style: 'columns'
  label?: string
  fields: FormField[]
}

/**
 * This field can be used to display a series of repeating controls in a grid
 * layout (e.g., when you have several elements that share the same sets of
 * controls but that are separate of each other, and when you want to display
 * the same control type in a single column).
 */
interface ControlGrid {
  type: 'control-grid',
  header?: string[],
  rows: Array<FormField[]>
}

export interface Fieldset {
  /**
   * The section heading for the fieldset
   */
  title: string
  /**
   * An optional info string detailing what this fieldset does or contains.
   */
  infoString?: string
  /**
   * An optional help string that can be shown in a questionmark tooltip
   */
  help?: string
  /**
   * Each fieldset can have a single FormField within its title area. Thus, a
   * fieldset can kind of "represent" an entire toggle.
   */
  titleField?: TitleFormField
  /**
   * The fields which are part of this formfield
   */
  fields: Array<FormField|StyleGroup|ControlGrid>
  [key: string]: any // Allow arbitrary additional fields
}

export interface FormSchema {
  fieldsets: Fieldset[]
  getFieldsetCategory: (fieldset: Fieldset) => { title: string, icon: string }|undefined
}

// END: INTERFACES
const props = defineProps<{
  model: any
  schema: FormSchema
}>()

const emit = defineEmits<(e: 'update:modelValue', key: string, value: any) => void>()

function getModelValue (model: string): any {
  const modelProps = model.split('.')
  let modelValue = props.model
  for (const key of modelProps) {
    modelValue = modelValue[key]
  }

  return modelValue
}
</script>

<style lang="less">
.form-container {
  .fieldset-category {
    color: rgb(114, 114, 114);
    font-size: 13px;
    margin: 10px;

    cds-icon {
      margin-right: 10px;
    }
  }

  fieldset {
    background-color: rgb(236, 236, 236);
    border: 1px solid rgb(230, 230, 230);
    margin: 10px;
    padding: 24px;
    padding-top: 18px;
    border-radius: 6px;
    position: relative;
    color: #333;

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      column-gap: 10px;

      legend {
        flex-grow: 1;
        font-weight: bolder;
        font-size: 15px;
        margin-top: 2px;
        padding: 0;
      }

      // .form-header-field {}
    }

    .form-help {
      display: block;
      width: 18px;
      min-width: 18px;
      cursor: help;
      height: 18px;
      line-height: 16px;
      text-align: center;
      background-color: rgb(222, 222, 222);
      border: 1px solid rgb(124, 124, 124);
      color: rgb(124, 124, 124);
      border-radius: 10px;
      font-size: 10px;
    }

    hr {
      margin: 20px 0px;
      border: none;
      border-top: 1px solid rgb(211, 211, 211);
    }

    .style-group {
      .columns {
        column-count: 2;
        column-fill: balance;
      }
    }

    .control-grid {
      display: table;
      .control-grid-row { display: table-row }
      .control-grid-cell {
        display: table-cell;
        padding: 5px 10px;
        &.heading {
          font-weight: bold;
          font-size: 13px;
        }
      }
    }
  }
}

body.dark .form-container {
  fieldset {
    background-color: rgb(60, 60, 60);
    color: inherit;
    border-color: rgb(30, 30, 30);
  }

  hr {
    border-top-color: #5a5a5a;
  }
}

body.win32:not(.dark) .form-container {
  fieldset {
    border-radius: 0px;
    background-color: rgb(245, 245, 245);
  }
}

body.linux:not(.dark) .form-container {
  fieldset {
    border-radius: 4px;
    background-color: rgb(245, 245, 245);
  }
}
</style>
