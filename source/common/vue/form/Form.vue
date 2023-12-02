<template>
  <div ref="component-container" class="form-container">
    <fieldset
      v-for="(fieldset, idx) in typedSchema.fieldsets"
      v-bind:key="idx"
    >
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
            v-on:update:model-value="$emit('update:modelValue', fieldset.titleField.model, $event)"
          ></FormFieldControl>
        </div>
        <!-- Finally the optional help tooltip -->
        <div
          v-if="fieldset.help !== undefined" class="form-help"
        >
          ?
        </div>
      </div>
      <!-- If the first fieldset field is not a separator and we have following fields, add a small gap -->
      <div
        v-if="fieldset.fields.length > 0 && fieldset.fields[0].type !== 'separator'"
        style="height: 10px;"
      ></div>
      <!-- Now to the contents of the fieldset -->
      <template v-for="(field, f_idx) in fieldset.fields" v-bind:key="f_idx">
        <FormFieldControl
          v-if="'model' in field"
          v-bind:field="field"
          v-bind:model="getModelValue(field.model)"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></FormFieldControl>
        <!-- Else for all elements that don't have a model (i.e., the separator) -->
        <FormFieldControl
          v-else
          v-bind:field="field"
          v-bind:model="undefined"
        ></FormFieldControl>
      </template>
    </fieldset>
  </div>
</template>

<script lang="ts">
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

import { ThemeDescriptor } from './elements/Theme.vue'
import FormFieldControl from './FormField.vue'
import { defineComponent } from 'vue'

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
}

interface Separator {
  type: 'separator'
}

interface FormText {
  type: 'form-text'
  display: 'info'|'sub-heading'
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
  disabled?: boolean
}

interface TimeField extends BasicInfo {
  type: 'time'
  disabled?: boolean
}

interface ColorField extends BasicInfo {
  type: 'color'
  disabled?: boolean
}

interface FileField extends BasicInfo {
  type: 'file'|'directory'
  reset?: string|boolean
  placeholder?: string
  filter?: Record<string, string>
}

interface CheckboxField extends BasicInfo {
  type: 'checkbox'|'switch'
  info?: string
  disabled?: boolean
}

interface RadioField extends BasicInfo {
  type: 'radio'
  disabled?: boolean
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
  searchable?: boolean
  searchLabel?: string
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

export type FormField = Separator|FormText|FormButton|TextField|NumberField|TimeField|ColorField|FileField|CheckboxField|RadioField|SelectField|ListField|TokenField|SliderField|ThemeField
export type TitleFormField = TextField|NumberField|TimeField|ColorField|FileField|CheckboxField|RadioField|SelectField|ListField|TokenField|SliderField

export interface Fieldset {
  /**
   * The section heading for the fieldset
   */
  title: string
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
  fields: FormField[]
  [key: string]: any // Allow arbitrary additional fields
}

export interface FormSchema {
  fieldsets: Fieldset[]
}

export default defineComponent({
  name: 'FormBuilder',
  components: {
    FormFieldControl
  },
  props: {
    model: {
      type: Object,
      required: true
    },
    schema: {
      type: Object,
      required: true
    }
  },
  emits: ['update:modelValue'],
  computed: {
    typedSchema (): FormSchema {
      return this.schema as FormSchema
    }
  },
  methods: {
    getModelValue: function (model: string): any {
      const modelProps = model.split('.')
      let modelValue = this.model
      for (const key of modelProps) {
        modelValue = modelValue[key]
      }

      return modelValue
    }
  }
})
</script>

<style lang="less">
.form-container {
  fieldset {
    background-color: rgb(236, 236, 236);
    border: 1px solid rgb(230, 230, 230);
    margin: 10px;
    padding: 10px;
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
  }
}

body.dark .form-container {
  fieldset {
    background-color: rgb(60, 60, 60);
    color: inherit;
    border-color: rgb(30, 30, 30);
  }
}

body.win32 .form-container {
  fieldset { border-radius: 0px; }
}
</style>
