<script setup lang="ts">
import { downloads } from '~/data/site-links'
const { copy } = useSiteLocale()
</script>

<template>
  <section class="platform-downloads container" aria-labelledby="downloads-title">
    <div><h2 id="downloads-title">{{ copy.downloadTitle }}</h2><p>{{ copy.downloadNote }}</p></div>
    <div class="download-actions">
      <a v-for="download in downloads" :key="download.platform" class="platform-link"
         :href="download.url" download
         :aria-label="`${copy.downloadFor} ${download.platform} — ${copy.downloadHint}`">
        <span>{{ copy.downloadFor }} <strong>{{ download.platform }}</strong></span>
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  </section>
</template>

