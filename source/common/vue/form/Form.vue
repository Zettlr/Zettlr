<template>
  <div ref="component-container">
    <fieldset
      v-for="(item, idx) in typedSchema.fieldsets"
      v-bind:key="idx"
    >
      <template v-for="(field, f_idx) in item">
        <TextInput
          v-if="field.type === 'text'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:disabled="field.disabled"
          v-bind:placeholder="field.placeholder"
          v-bind:label="field.label"
          v-bind:name="field.model"
          v-bind:reset="field.reset"
          v-bind:info="field.info"
          v-bind:inline="field.inline"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></TextInput>
        <NumberInput
          v-if="field.type === 'number'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:label="field.label"
          v-bind:name="field.model"
          v-bind:reset="field.reset"
          v-bind:inline="field.inline"
          v-bind:disabled="field.disabled"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></NumberInput>
        <TimeInput
          v-if="field.type === 'time'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:label="field.label"
          v-bind:name="field.model"
          v-bind:inline="field.inline"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></TimeInput>
        <ColorInput
          v-if="field.type === 'color'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:label="field.label"
          v-bind:name="field.model"
          v-bind:inline="field.inline"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></ColorInput>
        <FileInput
          v-if="field.type === 'file'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:label="field.label"
          v-bind:reset="field.reset"
          v-bind:name="field.model"
          v-bind:directory="false"
          v-bind:filter="field.filter"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></FileInput>
        <FileInput
          v-if="field.type === 'directory'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:label="field.label"
          v-bind:reset="field.reset"
          v-bind:name="field.model"
          v-bind:directory="true"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></FileInput>
        <CheckboxInput
          v-if="field.type === 'checkbox'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:label="field.label"
          v-bind:name="field.model"
          v-bind:disabled="field.disabled"
          v-bind:info="field.info"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></CheckboxInput>
        <SwitchInput
          v-if="field.type === 'switch'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:label="field.label"
          v-bind:name="field.model"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></SwitchInput>
        <RadioInput
          v-if="field.type === 'radio'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:label="field.label"
          v-bind:name="field.model"
          v-bind:disabled="field.disabled"
          v-bind:options="field.options"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></RadioInput>
        <SelectInput
          v-if="field.type === 'select'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:label="field.label"
          v-bind:name="field.model"
          v-bind:options="field.options"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></SelectInput>
        <ListControl
          v-if="field.type === 'list'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:value-type="field.valueType"
          v-bind:label="field.label"
          v-bind:column-labels="field.columnLabels"
          v-bind:key-names="field.keyNames"
          v-bind:name="field.model"
          v-bind:deletable="field.deletable"
          v-bind:editable="field.editable"
          v-bind:striped="field.striped"
          v-bind:addable="field.addable"
          v-bind:searchable="field.searchable"
          v-bind:search-label="field.searchLabel"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></ListControl>
        <TokenInput
          v-if="field.type === 'token'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:label="field.label"
          v-bind:name="field.model"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></TokenInput>
        <!-- NOTE: For sliders we only listen to change events -->
        <SliderInput
          v-if="field.type === 'slider'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:min="field.min"
          v-bind:max="field.max"
          v-bind:label="field.label"
          v-bind:name="field.model"
          v-on:change="$emit('update:modelValue', field.model, $event)"
        ></SliderInput>
        <ThemeInput
          v-if="field.type === 'theme'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:options="field.options"
          v-bind:label="field.label"
          v-bind:name="field.model"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></ThemeInput>
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

import TextInput from './elements/Text.vue'
import NumberInput from './elements/Number.vue'
import TimeInput from './elements/Time.vue'
import ColorInput from './elements/Color.vue'
import FileInput from './elements/File.vue'
import CheckboxInput from './elements/Checkbox.vue'
import SwitchInput from './elements/Switch.vue'
import RadioInput from './elements/Radio.vue'
import SelectInput from './elements/Select.vue'
import SliderInput from './elements/Slider.vue'
import ListControl from './elements/ListControl.vue'
import TokenInput from './elements/TokenList.vue'
import ThemeInput, { ThemeDescriptor } from './elements/Theme.vue'
import { defineComponent } from 'vue'

interface RequiredInfo {
  model: string
}

interface TextField extends RequiredInfo {
  type: 'text'
  placeholder?: string
  label?: string
  reset?: string|boolean
  info?: string
  inline?: boolean
  disabled?: boolean
}

interface NumberField extends RequiredInfo {
  type: 'number'
  label?: string
  reset?: number
  inline?: boolean
  disabled?: boolean
}

interface TimeField extends RequiredInfo {
  type: 'time'
  label?: string
  inline?: boolean
}

interface ColorField extends RequiredInfo {
  type: 'color'
  label?: string
  inline?: boolean
}

interface FileField extends RequiredInfo {
  type: 'file'|'directory'
  label?: string
  reset?: string|boolean
  filter?: Record<string, string>
}

interface CheckboxField extends RequiredInfo {
  type: 'checkbox'|'switch'
  label?: string
  info?: string
  disabled?: boolean
}

interface RadioField extends RequiredInfo {
  type: 'radio'
  label?: string
  disabled?: boolean
  options: Record<string, string>
}

interface SelectField extends RequiredInfo {
  type: 'select'
  label?: string
  options: Record<string, string>
}

interface ListField extends RequiredInfo {
  type: 'list'
  valueType: 'simpleArray'|'multiArray'|'record'
  keyNames?: string[]
  label?: string
  columnLabels: string[]
  striped?: boolean
  addable?: boolean
  editable?: boolean | number[]
  deletable?: boolean
  searchable?: boolean
  searchLabel?: string
}

interface TokenField extends RequiredInfo {
  type: 'token'
  label?: string
}

interface SliderField extends RequiredInfo {
  type: 'slider'
  label?: string
  min?: number
  max?: number
}

interface ThemeField extends RequiredInfo {
  type: 'theme'
  label?: string
  options: ThemeDescriptor
}

type Fields = TextField|NumberField|TimeField|ColorField|FileField|CheckboxField|RadioField|SelectField|ListField|TokenField|SliderField|ThemeField

export interface FormSchema {
  fieldsets: Fields[][]
}

export default defineComponent({
  name: 'FormBuilder',
  components: {
    TextInput,
    NumberInput,
    TimeInput,
    ColorInput,
    FileInput,
    CheckboxInput,
    SwitchInput,
    RadioInput,
    SelectInput,
    SliderInput,
    ListControl,
    TokenInput,
    ThemeInput
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

</style>
