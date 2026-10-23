<script setup lang="ts">
import { game } from '~/data/site-content'
const { copy } = useSiteLocale()
</script>

<template>
  <a id="manual" class="manual-card" :href="game.manual.url" download="Houston-Instruction-Manual.pdf" :aria-label="copy.manualLabel">
    <div class="manual-card__image">
      <img :src="game.manual.image" :alt="copy.manualImageAlt" width="2560" height="1440" loading="lazy">
      <span>{{ copy.manualTag }}</span>
    </div>
    <div class="manual-card__content">
      <p class="eyebrow">{{ copy.manualEyebrow }}</p>
      <h3>{{ copy.manualTitle }}</h3>
      <p>{{ copy.manualDescription }}</p>
      <span class="manual-card__meta">{{ copy.manualMetadata }}</span>
      <span class="manual-card__download">{{ copy.manualDownload }} <span aria-hidden="true">↓</span></span>
    </div>
  </a>
</template>

