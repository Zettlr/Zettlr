<template>
  <div v-bind:class="{ 'autocomplete-element': true, inline: inline === true, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldId">{{ label }}</label>
    <input
      v-bind:id="fieldId"
      ref="inputField"
      v-model="thisValue"
      type="search"
      v-bind:class="{
        inline: inline === true,
        'autocomplete-nput': true
      }"
      v-bind:placeholder="placeholder"
      v-on:focusin="onInputFocus"
      v-on:focusout="onInputBlur"
      v-on:keydown="onKeyPress"
    >

    <div class="autocomplete-list-wrapper">
      <div
        v-bind:id="`${fieldId}-list`"
        v-bind:class="{ 'autocomplete-list': true, hidden: !showOptions || visibleSuggestions.length < 2 }"
      >
        <option
          v-for="(option, idx) in visibleSuggestions"
          v-bind:key="idx"
          v-bind:value="option"
          v-bind:class="{ active: activeOption === idx }"
          v-on:mousedown="thisValue = option"
          v-on:mouseenter="activeOption = idx"
        >
          {{ option }}
        </option>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        AutocompleteText
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a text input with autocomplete functionality.
 *
 * END HEADER
 */

import { ref, computed, watch, toRef, nextTick } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder: string
  label: string
  name: string
  inline?: boolean
  autocompleteValues: string[]
}>()

const visibleSuggestions = computed(() => {
  const q = thisValue.value.toLowerCase()
  return props.autocompleteValues.filter(item => item.toLowerCase().includes(q))
})

const emit = defineEmits<(e: 'update:modelValue', val: string) => void>()

/**
 * Value updating logic
 */
const thisValue = ref<string>(props.modelValue)
const showOptions = ref(false)
const activeOption = ref(-1)

function onInputFocus () {
  showOptions.value = true
}

function onInputBlur () {
  showOptions.value = false
  activeOption.value = -1
}

function onKeyPress (event: KeyboardEvent) {
  if (visibleSuggestions.value.length === 0) {
    return // Can't navigate an empty list
  }

  let keyHandled = false
  if (event.key === 'ArrowDown') {
    keyHandled = true
    activeOption.value++
    if (activeOption.value > visibleSuggestions.value.length - 1) {
      activeOption.value = 0
    }
    maybeScrollOptionIntoView()
  } else if (event.key === 'ArrowUp') {
    keyHandled = true
    activeOption.value--
    if (activeOption.value < 0) {
      activeOption.value = visibleSuggestions.value.length - 1
    }
    maybeScrollOptionIntoView()
  } else if (event.key === 'Enter') {
    if (activeOption.value > -1 && visibleSuggestions.value.length > 1) {
      keyHandled = true
      thisValue.value = visibleSuggestions.value[activeOption.value] ?? ''
    }
  }

  if (keyHandled) {
    event.preventDefault()
    event.stopPropagation()
  }
}

function maybeScrollOptionIntoView () {
  nextTick()
    .then(() => {
      const option = document.querySelector(`#${fieldId.value}-list option:nth-child(${activeOption.value})`)
      if (option === null) {
        return
      }
      option.scrollIntoView()
    })
    .catch(err => console.error(err))
}

watch(toRef(props, 'modelValue'), (newVal) => {
  thisValue.value = newVal
})

watch(thisValue, () => {
  emit('update:modelValue', thisValue.value)
})

// Utilities
const inputField = ref<HTMLInputElement|null>(null)
const fieldId = computed<string>(() => 'field-input' + props.name)

function focus (): void {
  inputField.value?.focus()
}

function blur (): void {
  inputField.value?.blur()
}

function select (): void {
  inputField.value?.select()
}

defineExpose({ focus, blur, select })
</script>

<style lang="css" scoped>
div.autocomplete-element {
  div.autocomplete-list-wrapper {
    position: relative;
    height: 0px;
  }

  div.autocomplete-list {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    max-height: 150px; /* DEBUG */
    overflow-y: auto;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0px 0px 5px 0px rgba(0, 0, 0, .2);
    z-index: 1;

    &.hidden {
      display: none;
    }

    option {
      padding: 4px;
      overflow: hidden;
      text-overflow: ellipsis;

      &.active {
        background-color: var(--system-accent-color);
        color: var(--system-accent-color-contrast);
      }
    }
  }
}

body.dark div.autocomplete-element .autocomplete-list {
  background-color: rgba(50, 50, 50, 1);
  box-shadow: 0px 0px 5px 0px rgba(255, 255, 255, .2);;
}
</style>
