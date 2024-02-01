<template>
  <hr v-if="field.type === 'separator'">
  <p v-if="field.type === 'form-text' && field.display === 'info'" class="form-field-info-text">
    {{ field.contents }}
  </p>
  <h4 v-if="field.type === 'form-text' && field.display === 'sub-heading'" class="form-field-sub-heading">
    {{ field.contents }}
  </h4>
  <Button
    v-if="field.type === 'button'"
    v-bind:label="field.label"
    v-bind:inline="true"
    v-on:click="field.onClick()"
  ></Button>
  <TextInput
    v-if="field.type === 'text'"
    v-bind:model-value="model"
    v-bind:disabled="field.disabled"
    v-bind:placeholder="field.placeholder"
    v-bind:label="field.label"
    v-bind:name="field.model"
    v-bind:reset="field.reset"
    v-bind:info="field.info"
    v-bind:inline="field.inline"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></TextInput>
  <NumberInput
    v-if="field.type === 'number'"
    v-bind:model-value="model"
    v-bind:label="field.label"
    v-bind:name="field.model"
    v-bind:reset="field.reset"
    v-bind:inline="field.inline"
    v-bind:disabled="field.disabled"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></NumberInput>
  <TimeInput
    v-if="field.type === 'time'"
    v-bind:model-value="model"
    v-bind:label="field.label"
    v-bind:name="field.model"
    v-bind:inline="field.inline"
    v-bind:disabled="field.disabled"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></TimeInput>
  <ColorInput
    v-if="field.type === 'color'"
    v-bind:model-value="model"
    v-bind:label="field.label"
    v-bind:name="field.model"
    v-bind:inline="field.inline"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></ColorInput>
  <FileInput
    v-if="field.type === 'file'"
    v-bind:model-value="model"
    v-bind:label="field.label"
    v-bind:reset="field.reset"
    v-bind:name="field.model"
    v-bind:placeholder="field.placeholder"
    v-bind:directory="false"
    v-bind:filter="field.filter"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></FileInput>
  <FileInput
    v-if="field.type === 'directory'"
    v-bind:model-value="model"
    v-bind:label="field.label"
    v-bind:reset="field.reset"
    v-bind:name="field.model"
    v-bind:placeholder="field.placeholder"
    v-bind:directory="true"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></FileInput>
  <CheckboxInput
    v-if="field.type === 'checkbox'"
    v-bind:model-value="model"
    v-bind:label="field.label"
    v-bind:name="field.model"
    v-bind:disabled="field.disabled"
    v-bind:info="field.info"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></CheckboxInput>
  <SwitchInput
    v-if="field.type === 'switch'"
    v-bind:model-value="model"
    v-bind:label="field.label"
    v-bind:name="field.model"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></SwitchInput>
  <RadioInput
    v-if="field.type === 'radio'"
    v-bind:model-value="model"
    v-bind:label="field.label"
    v-bind:name="field.model"
    v-bind:disabled="field.disabled"
    v-bind:inline="field.inline"
    v-bind:options="field.options"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></RadioInput>
  <SelectInput
    v-if="field.type === 'select'"
    v-bind:model-value="model"
    v-bind:label="field.label"
    v-bind:name="field.model"
    v-bind:options="field.options"
    v-bind:inline="field.inline"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></SelectInput>
  <ListControl
    v-if="field.type === 'list'"
    v-bind:model-value="model"
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
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></ListControl>
  <TokenInput
    v-if="field.type === 'token'"
    v-bind:model-value="model"
    v-bind:label="field.label"
    v-bind:name="field.model"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></TokenInput>
  <!-- NOTE: For sliders we only listen to change events -->
  <SliderInput
    v-if="field.type === 'slider'"
    v-bind:model-value="model"
    v-bind:min="field.min"
    v-bind:max="field.max"
    v-bind:label="field.label"
    v-bind:name="field.model"
    v-on:change="$emit('update:modelValue', $event)"
  ></SliderInput>
  <ThemeInput
    v-if="field.type === 'theme'"
    v-bind:model-value="model"
    v-bind:options="field.options"
    v-bind:label="field.label"
    v-bind:name="field.model"
    v-on:update:model-value="$emit('update:modelValue', $event)"
  ></ThemeInput>
</template>

<script lang="ts" setup>
import type { FormField } from './Form.vue'
import TextInput from './elements/Text.vue'
import Button from './elements/ButtonControl.vue'
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
import ThemeInput from './elements/Theme.vue'

/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FormField
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Renders a single form field, described by `field`. This is a
 *                  barebones component, as it only translates a FormField into
 *                  a corresponding component and transmits the events back up.
 *
 * END HEADER
 */

interface Props {
  field: FormField
  model: any
}

type Emits = (e: 'update:modelValue', newValue: any) => void

defineProps<Props>()
defineEmits<Emits>()
</script>

<style lang="less">
.form-field-info-text {
  // This is some faint hint text
  font-size: 11px;
  color: rgb(150, 150, 150);
}

.form-field-sub-heading {
  font-size: 13px;
  margin-bottom: 10px;
}
</style>
