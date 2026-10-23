<script setup lang="ts">
import { ref } from 'vue'
import { game } from '~/data/site-content'

const config = useRuntimeConfig().public
const { copy } = useSiteLocale()
const player = ref<HTMLElement | null>(null)
const started = ref(false)
const loaded = ref(false)
const { active, supported, error, toggle } = useGameFullscreen(player)
</script>

<template>
  <section id="play" class="game-section container" :aria-label="copy.playerLabel">
    <div class="section-label"><span>{{ copy.waiting }}</span><span>{{ copy.players }}</span></div>
    <div ref="player" class="player">
      <div class="player__screen">
        <template v-if="!started">
          <img class="player__poster" :src="game.poster" alt="" :width="game.posterWidth" :height="game.posterHeight" fetchpriority="high">
          <div class="player__overlay">
            <p class="eyebrow">{{ copy.browserEdition }}</p>
            <h2>{{ copy.ready }}</h2>
            <button class="button" :disabled="!config.gameUrl" @click="started = true">
              {{ config.gameUrl ? copy.start : copy.comingSoon }}
            </button>
            <p>{{ config.gameUrl ? copy.chooseRole : copy.unavailable }}</p>
          </div>
        </template>
        <template v-else>
          <iframe :src="config.gameUrl" :title="copy.iframeTitle" allow="autoplay; fullscreen" allowfullscreen @load="loaded = true" />
          <p v-if="!loaded" class="player__loading" role="status">{{ copy.loading }}</p>
        </template>
      </div>
      <div class="player__toolbar">
        <span>HOUSTON, WE HAVE A PROBLEM</span>
        <button v-if="supported" type="button" :aria-pressed="active" @click="toggle">
          {{ active ? copy.exitFullscreen : copy.fullscreen }}
        </button>
      </div>
      <p v-if="error" class="player__error" role="status">{{ copy.fullscreenError }}</p>
    </div>
    <p class="device-note">{{ copy.controls }} <span>{{ copy.gameLanguage }}</span></p>
  </section>
</template>

