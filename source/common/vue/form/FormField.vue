<template>
  <hr v-if="props.field.type === 'separator'">
  <template v-else-if="props.field.type === 'form-text'">
    <p
      v-if="props.field.display === 'info' || props.field.display === 'plain'"
      v-bind:class="{
        'form-field-info-text': props.field.display === 'info',
        'form-field-plain-text': props.field.display === 'plain'
      }"
    >
      {{ props.field.contents }}
    </p>
    <h4 v-else-if="props.field.display === 'sub-heading'" class="form-field-sub-heading">
      {{ props.field.contents }}
    </h4>
  </template>
  <Button
    v-if="props.field.type === 'button'"
    v-bind:label="props.field.label"
    v-bind:inline="true"
    v-on:click="props.field.onClick()"
  ></Button>
  <TextInput
    v-else-if="props.field.type === 'text'"
    v-bind:model-value="model"
    v-bind:disabled="props.field.disabled"
    v-bind:placeholder="props.field.placeholder"
    v-bind:label="props.field.label"
    v-bind:name="props.field.model"
    v-bind:reset="props.field.reset"
    v-bind:info="props.field.info"
    v-bind:inline="props.field.inline"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></TextInput>
  <NumberInput
    v-else-if="props.field.type === 'number'"
    v-bind:model-value="model"
    v-bind:label="props.field.label"
    v-bind:name="props.field.model"
    v-bind:reset="props.field.reset"
    v-bind:inline="props.field.inline"
    v-bind:disabled="props.field.disabled"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></NumberInput>
  <TimeInput
    v-else-if="props.field.type === 'time'"
    v-bind:model-value="model"
    v-bind:label="props.field.label"
    v-bind:name="props.field.model"
    v-bind:inline="props.field.inline"
    v-bind:disabled="props.field.disabled"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></TimeInput>
  <ColorInput
    v-else-if="props.field.type === 'color'"
    v-bind:model-value="model"
    v-bind:label="props.field.label"
    v-bind:name="props.field.model"
    v-bind:inline="props.field.inline"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></ColorInput>
  <FileInput
    v-else-if="props.field.type === 'file'"
    v-bind:model-value="model"
    v-bind:label="props.field.label"
    v-bind:reset="props.field.reset"
    v-bind:name="props.field.model"
    v-bind:placeholder="props.field.placeholder"
    v-bind:directory="false"
    v-bind:filter="props.field.filter"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></FileInput>
  <FileInput
    v-else-if="props.field.type === 'directory'"
    v-bind:model-value="model"
    v-bind:label="props.field.label"
    v-bind:reset="props.field.reset"
    v-bind:name="props.field.model"
    v-bind:placeholder="props.field.placeholder"
    v-bind:directory="true"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></FileInput>
  <CheckboxInput
    v-else-if="props.field.type === 'checkbox'"
    v-bind:model-value="model"
    v-bind:label="props.field.label"
    v-bind:name="props.field.model"
    v-bind:disabled="props.field.disabled"
    v-bind:info="props.field.info"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></CheckboxInput>
  <SwitchInput
    v-else-if="props.field.type === 'switch'"
    v-bind:model-value="model"
    v-bind:label="props.field.label"
    v-bind:name="props.field.model"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></SwitchInput>
  <RadioInput
    v-else-if="props.field.type === 'radio'"
    v-bind:model-value="model"
    v-bind:label="props.field.label"
    v-bind:name="props.field.model"
    v-bind:disabled="props.field.disabled"
    v-bind:inline="props.field.inline"
    v-bind:options="props.field.options"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></RadioInput>
  <SelectInput
    v-else-if="props.field.type === 'select'"
    v-bind:disabled="props.field.disabled"
    v-bind:model-value="model"
    v-bind:label="props.field.label"
    v-bind:name="props.field.model"
    v-bind:options="props.field.options"
    v-bind:inline="props.field.inline"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></SelectInput>
  <ListControl
    v-else-if="props.field.type === 'list'"
    v-bind:model-value="model"
    v-bind:value-type="props.field.valueType"
    v-bind:label="props.field.label"
    v-bind:column-labels="props.field.columnLabels"
    v-bind:key-names="props.field.keyNames"
    v-bind:name="props.field.model"
    v-bind:deletable="props.field.deletable"
    v-bind:delete-label="props.field.deleteLabel"
    v-bind:editable="props.field.editable"
    v-bind:striped="props.field.striped"
    v-bind:addable="props.field.addable"
    v-bind:searchable="props.field.searchable"
    v-bind:search-label="props.field.searchLabel"
    v-bind:empty-message="props.field.emptyMessage"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></ListControl>
  <TokenInput
    v-else-if="props.field.type === 'token'"
    v-bind:model-value="model"
    v-bind:label="props.field.label"
    v-bind:name="props.field.model"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></TokenInput>
  <!-- NOTE: For sliders we only listen to change events -->
  <SliderInput
    v-else-if="props.field.type === 'slider'"
    v-bind:model-value="model"
    v-bind:min="props.field.min"
    v-bind:max="props.field.max"
    v-bind:label="props.field.label"
    v-bind:name="props.field.model"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></SliderInput>
  <ThemeInput
    v-else-if="props.field.type === 'theme'"
    v-bind:model-value="model"
    v-bind:options="props.field.options"
    v-bind:label="props.field.label"
    v-bind:name="props.field.model"
    v-on:update:model-value="emit('update:modelValue', $event)"
  ></ThemeInput>
</template>

<script setup lang="ts">
import type { FormField } from './FormBuilder.vue'
import TextInput from './elements/TextControl.vue'
import Button from './elements/ButtonControl.vue'
import NumberInput from './elements/NumberControl.vue'
import TimeInput from './elements/TimeControl.vue'
import ColorInput from './elements/ColorControl.vue'
import FileInput from './elements/FileControl.vue'
import CheckboxInput from './elements/CheckboxControl.vue'
import SwitchInput from './elements/SwitchControl.vue'
import RadioInput from './elements/RadioControl.vue'
import SelectInput from './elements/SelectControl.vue'
import SliderInput from './elements/SliderControl.vue'
import ListControl from './elements/ListControl.vue'
import TokenInput from './elements/TokenList.vue'
import ThemeInput from './elements/ThemeSelector.vue'

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

const props = defineProps<{ field: FormField, model: any }>()
const emit = defineEmits<(e: 'update:modelValue', newValue: any) => void>()
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

.form-field-plain-text {
  font-size: 13px;
}
</style>
