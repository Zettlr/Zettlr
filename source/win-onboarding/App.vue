<template>
  <div id="onboarding-wrapper">
    <!-- Show a notification -->
    <div v-if="mode === 'update'" class="page">
      <div class="page-wrapper" style="text-align: center;">
        <p>
          <img src="../../resources/icons/png/64x64.png" />
        </p>
        <h1>{{ updateCompleteHeading }}</h1>
        <p>
          {{ updateCompleteMessage }}
        </p>
        <p id="version-string">
          v{{ version }}
        </p>
        <p>
          <button class="active" v-on:click="loadUrl(`https://zettlr.com/changelog?to_version=${version}`)">
            {{ whatsChangedLabel }}
          </button>
        </p>
        <p class="small">
          {{ buildDateLabel }}
        </p>

        <SupportLogos></SupportLogos>
      </div>
    </div>

    <!-- Start the first-start flow -->
    <Transition v-else v-bind:name="`slide-${transitionMode}`" mode="default">
      <div v-if="currentPage === 'welcome'" class="page">
        <div class="page-wrapper">
          <WelcomePage></WelcomePage>
        </div>
      </div>
      <div v-else-if="currentPage === 'app-lang'" class="page">
        <div class="page-wrapper">
          <SetAppLang></SetAppLang>
        </div>
      </div>
      <div v-else-if="currentPage === 'updates'" class="page">
        <div class="page-wrapper">
          <UpdatingPage></UpdatingPage>
        </div>
      </div>
      <div v-else-if="currentPage === 'look-and-feel'" class="page">
        <div class="page-wrapper">
          <LookAndFeelPage></LookAndFeelPage>
        </div>
      </div>
      <div v-else-if="currentPage === 'writing-markdown'" class="page">
        <div class="page-wrapper">
          <WritingMarkdownPage></WritingMarkdownPage>
        </div>
      </div>
      <div v-else-if="currentPage === 'citations'" class="page">
        <div class="page-wrapper">
          <CitingPage></CitingPage>
        </div>
      </div>
      <div v-else-if="currentPage === 'writing-check'" class="page">
        <div class="page-wrapper">
          <WritingCheckPage></WritingCheckPage>
        </div>
      </div>
      <div v-else-if="currentPage === 'other-files'" class="page">
        <div class="page-wrapper">
          <OtherFilesPage></OtherFilesPage>
        </div>
      </div>
      <div v-else-if="currentPage === 'finish'" class="page">
        <div class="page-wrapper">
          <FinishPage></FinishPage>
        </div>
      </div>
    </Transition>
  </div>

  <!--
    The nav must adapt to whether we are running the onboarding flow or the new
    update notification
  -->
  <nav>
    <template v-if="mode === 'update'">
      <button v-on:click="close">
        {{ getStartedLabel }}
      </button>
    </template>

    <template v-else>
      <!-- Allow the user to always skip the onboarding. -->
      <button v-on:click="close">
        {{ skipLabel }}
      </button>
      <div id="onboarding-progress">
        <span
          v-for="page, i in pages"
          v-bind:key="i"
          v-bind:class="{ done: currentPageIndex >= i }"
          v-on:click="moveToPage(i)"
        ></span>
      </div>
      <!-- Allow the user to go back if possible. -->
      <button v-if="canGoBackward" v-on:click="back">
        {{ previousLabel }}
      </button>
      <!-- Provide a forward button while possible. -->
      <button v-if="canGoForward" v-on:click="forward">
        <template v-if="!canGoBackward">
          <!-- On the first slide, call the button "Start setup" -->
          {{ startSetupLabel }}
        </template>
        <template v-else-if="canGoForward">
          {{ nextLabel }}
        </template>
      </button>
      <!--
        If the user cannot go forward anymore, exchange with a finish button
        that closes the onboarding window.
      -->
      <button v-else v-on:click="close">
        {{ finishLabel }}
      </button>
    </template>
  </nav>
</template>

<script setup lang="ts">
import type { OnboardingIPCMessage } from 'source/app/service-providers/config/onboarding-window'
import { ref, computed } from 'vue'
import WelcomePage from './pages/WelcomePage.vue'
import SetAppLang from './pages/SetAppLang.vue'
import FinishPage from './pages/FinishPage.vue'
import UpdatingPage from './pages/UpdatingPage.vue'
import LookAndFeelPage from './pages/LookAndFeelPage.vue'
import WritingMarkdownPage from './pages/WritingMarkdownPage.vue'
import CitingPage from './pages/CitingPage.vue'
import WritingCheckPage from './pages/WritingCheckPage.vue'
import OtherFilesPage from './pages/OtherFilesPage.vue'
import PACKAGE_JSON from '../../package.json'
import { trans } from 'source/common/i18n-renderer'
import SupportLogos from './SupportLogos.vue'
import { DateTime } from 'luxon'

// This is required because some elements (looking at you, RadioControl) are
// completely namespaced to platform specific values and we don't include the
// standard window chrome here.
document.body.classList.add(process.platform)

const ipcRenderer = window.ipc

const searchParams = new URLSearchParams(window.location.search)
const mode: string|null = searchParams.get('mode')
const version = PACKAGE_JSON.version

const pages = [
  'welcome',
  'app-lang',
  'updates',
  'look-and-feel',
  'writing-markdown',
  'citations',
  'writing-check',
  'other-files',
  'finish'
] as const

// Update labels
const updateCompleteHeading = trans('Update complete!')
const updateCompleteMessage = trans('Zettlr has been updated. You are now running Zettlr')
const getStartedLabel = trans('Get started')
const whatsChangedLabel = trans('See what\'s changed')
const buildDate = DateTime.fromISO(__BUILD_DATE__).toLocaleString({ dateStyle: 'full' })
const buildDateLabel = trans('Build date: %s', buildDate)

// Onboarding workflow labels
const startSetupLabel = trans('Start setup')
const skipLabel = trans('Skip')
const previousLabel = trans('Previous')
const nextLabel = trans('Next')
const finishLabel = trans('Finish')

const currentPage = ref<typeof pages[number]>('welcome')
const currentPageIndex = computed(() => pages.indexOf(currentPage.value))

const transitionMode = ref<'forward'|'backward'>('forward')

const canGoBackward = computed(() => currentPageIndex.value > 0)
const canGoForward = computed(() => currentPageIndex.value < pages.length - 1)

function forward () {
  if (currentPageIndex.value > -1 && currentPageIndex.value === pages.length - 1) {
    // TODO: Finish
  } else {
    transitionMode.value = 'forward'
    currentPage.value = pages[currentPageIndex.value + 1]
  }
}

function back () {
  if (currentPageIndex.value > 0) {
    transitionMode.value = 'backward'
    currentPage.value = pages[currentPageIndex.value - 1]
  } else {
    // TODO: No more back
  }
}

function moveToPage (i: number) {
  if (i < 0 || i >= pages.length || i === currentPageIndex.value) {
    return
  }

  if (i > currentPageIndex.value) {
    transitionMode.value = 'forward'
  } else {
    transitionMode.value = 'backward'
  }
  currentPage.value = pages[i]
}

function close () {
  sendMessage({ command: 'close' })
}

function sendMessage (payload: OnboardingIPCMessage) {
  ipcRenderer.send('onboarding', payload)
}

function loadUrl (url: string) {
  window.location.href = url
}
</script>

<style lang="less">
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: #333;
  -webkit-app-region: drag;

  &.dark {
    background-color: #333;
    color: white;
  }
}

#app {
  width: 100vw;
  height: 100vh;
  padding: 20px 40px;
  display: flex;
  gap: 20px;
  flex-direction: column;
  justify-content: space-between;
}

nav {
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
  -webkit-app-region: no-drag;
}

#onboarding-wrapper {
  position: relative;
  width: 100%;
  height: 100%;

  * {
    -webkit-app-region: no-drag;
  }
}

// The following classes ensure a smooth sliding animation for both backward and
// forward movement, making it so that the pages appear to move back and forward
// when the user continues or goes backward.
.slide-forward-enter-from,
.slide-backward-leave-to {
  transform: translateX(100%);
}

.slide-forward-enter-to,
.slide-forward-leave-from,
.slide-backward-enter-to,
.slide-backward-leave-from {
  transform: translateX(0%);
}

.slide-forward-leave-to,
.slide-backward-enter-from {
  transform: translateX(-100%);
}

// Shared by all animations
.slide-forward-enter-active,
.slide-forward-leave-active,
.slide-backward-enter-active,
.slide-backward-leave-active {
  transition: transform 0.3s ease;
}

// Fix to ensure the pages are all at the same page so that the transitions are
// appropriate.
.page {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  overflow-y: auto;
  // The following setting ensures that small contents are centered vertically,
  // but as the content exceeds the container size, scrolling is enabled.
  justify-content: safe center;

  .page-wrapper {
    max-width: 500px;
    max-height: 100%;
    margin: 0 auto;
  }
}

#onboarding-progress {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  gap: 5px;

  span {
    display: inline-block;
    width: 10px;
    height: 10px;
    background-color: #ddd;
    border-radius: 10px;

    &.done {
      background-color: #1cb27e;
    }
  }
}

p#version-string {
  color: #1cb27e;
  font-size: 250%;
  font-weight: bold;
}

body.dark #onboarding-progress {
  span {
    background-color: white;
    &.done {
      background-color: #1cb27e;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// Generics

h1, h2, h3, h4, h5, h6 {
  margin-bottom: 25px;
}

p {
  margin-bottom: 15px;
  line-height: 140%;

  &.small {
    font-size: 80%;
  }
}

////////////////////////////////////////////////////////////////////////////////
// Helper classes

.box {
  border: 1px solid #333;
  padding: 10px 20px;
  border-radius: 8px;
}

body.dark {
  .box { border-color: #ddd; }
}

////////////////////////////////////////////////////////////////////////////////
// Form elements

button, select {
  background-color: rgb(51, 93, 144);
  border: 0px;
  color: white;
  border-radius: 8px;
  padding: 10px 20px;

  &:hover {
    background-color: rgb(67, 116, 175);
  }

  &:disabled, &.inactive {
    background-color: rgb(159, 159, 159);
    color: rgb(100, 100, 100);
  }

  &.inactive:hover {
    background-color: rgb(180, 180, 180);
  }

  &.active {
    background-color: #1cb27e;

    &:hover {
      background-color: #159266;
    }
  }
}
</style>
