<template>
  <div ref="component-container">
    <fieldset
      v-for="(item, idx) in schema.fieldsets"
      v-bind:key="idx"
    >
      <template v-for="(field, f_idx) in item">
        <TextInput
          v-if="field.type === 'text'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
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
        <ListInput
          v-if="field.type === 'list'"
          v-bind:key="f_idx"
          v-bind:model-value="getModelValue(field.model)"
          v-bind:label="field.label"
          v-bind:labels="field.labels"
          v-bind:name="field.model"
          v-bind:deletable="field.deletable"
          v-bind:editable="field.editable"
          v-bind:addable="field.addable"
          v-bind:searchable="field.searchable"
          v-bind:search-label="field.searchLabel"
          v-on:update:model-value="$emit('update:modelValue', field.model, $event)"
        ></ListInput>
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

<script>
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
import ListInput from './elements/List.vue'
import TokenInput from './elements/TokenList.vue'
import ThemeInput from './elements/Theme.vue'

export default {
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
    ListInput,
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
  methods: {
    getModelValue: function (model) {
      const modelProps = model.split('.')
      let modelValue = this.model
      for (const key of modelProps) {
        modelValue = modelValue[key]
      }

      return modelValue
    }
  }
}
</script>

<style lang="less">

</style>
