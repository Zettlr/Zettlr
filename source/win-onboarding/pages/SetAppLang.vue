<template>
  <h1>{{ pageHeading }}</h1>

  <p>
    {{ langIntro }}
  </p>

  <div style="margin: 20px 0; display: flex; justify-content: center;">
    <select v-model="appLang">
      <option
        v-for="(valueLabel, key) in appLangOptions"
        v-bind:key="key"
        v-bind:value="key"
        v-bind:selected="key === appLang"
      >
        {{ valueLabel }}
      </option>
    </select>
  </div>

  <p>
    {{ caveatLabel }}
  </p>

  <div style="text-align: center; height: 20px">
    <LoadingSpinner v-if="isLoading"></LoadingSpinner>
  </div>
</template>

<script setup lang="ts">
import { trans } from 'source/common/i18n-renderer'
import { ref, onMounted, watch } from 'vue'
import { resolveLangCode } from 'source/common/util/map-lang-code'
import type { OnboardingIPCSetAppLangMessage } from 'source/app/service-providers/config/onboarding-window'
import { loadData } from '@common/i18n-renderer'
import LoadingSpinner from 'source/common/vue/LoadingSpinner.vue'

const ipcRenderer = window.ipc

const isLoading = ref(false)

const emit = defineEmits<{
  (e: 'app-lang-changed'): void
  (e: 'disable-navigation'): void
  (e: 'enable-navigation'): void
}>()

const originalLanguage = window.config.get('appLang')

const pageHeading = ref(trans('Which Language do you speak?'))
const langIntro = ref(trans('Based on your operating system settings, we have selected %s as the application language. If you wish, you can select a different language here.', originalLanguage))
const caveatLabel = ref(trans('The changes apply from the next slide.'))

function retranslate () {
  // Just as with the navigation, we have to re-translate the page's strings
  // once the user toggles the app lang.
  pageHeading.value = trans('Which Language do you speak?')
  caveatLabel.value = trans('The changes apply from the next slide.')
  langIntro.value = trans('Based on your operating system settings, we have selected %s as the application language. If you wish, you can select a different language here.', appLangOptions.value[originalLanguage])
}

const appLangOptions = ref<Record<string, string>>({})
const appLang = ref(originalLanguage)

watch(appLang, () => {
  changeAppLang()
})

async function getAvailableLanguages () {
  // Get a list of all available languages
  const languages = await ipcRenderer.invoke('application', {
    command: 'get-available-languages'
  })

  languages.map((lang: string) => {
    appLangOptions.value[lang] = resolveLangCode(lang, 'name')
  })

  langIntro.value = trans('Based on your operating system settings, we have selected %s as the application language. If you wish, you can select a different language here.', appLangOptions.value[originalLanguage])
}

onMounted(async () => {
  await getAvailableLanguages()
})

function changeAppLang () {
  emit('disable-navigation')
  isLoading.value = true
  const msg = { command: 'set-app-lang', language: appLang.value } as OnboardingIPCSetAppLangMessage
  ipcRenderer.invoke('onboarding', msg)
    .then(() => {
      loadData()
        .then(() => {
          emit('app-lang-changed')
          retranslate()
        })
        .catch(err => console.error(err))
    })
    .catch(err => {
      appLang.value = originalLanguage
      console.error(err)
    })
    .finally(() => {
      emit('enable-navigation')
      isLoading.value = false
    })
}
</script>

<style lang="less">
</style>
