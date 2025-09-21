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
</template>

<script setup lang="ts">
import { trans } from 'source/common/i18n-renderer'
import { ref, onMounted, computed, watch } from 'vue'
import { resolveLangCode } from 'source/common/util/map-lang-code'
import type { OnboardingIPCSetAppLangMessage } from 'source/app/service-providers/config/onboarding-window'
import { loadData } from '@common/i18n-renderer'

const ipcRenderer = window.ipc

const pageHeading = trans('Which Language do you speak?')
const langIntro = computed(() => {
  return trans('Based on your operating system settings, we have selected %s as the application language. If you wish, you can select a different language here.', appLangOptions.value[originalLanguage])
})
const caveatLabel = trans('The changes apply from the next slide.')

const appLangOptions = ref<Record<string, string>>({})

const originalLanguage = window.config.get('appLang')

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
}

onMounted(async () => {
  await getAvailableLanguages()
})

function changeAppLang () {
  const msg = { command: 'set-app-lang', language: appLang.value } as OnboardingIPCSetAppLangMessage
  ipcRenderer.invoke('onboarding', msg)
    .then(() => {
      loadData().catch(err => console.error(err))
    })
    .catch(err => {
      appLang.value = originalLanguage
      console.error(err)
    })
}
</script>

<style lang="less">
</style>
