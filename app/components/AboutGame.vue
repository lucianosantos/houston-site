<script setup lang="ts">
const { copy } = useSiteLocale()
</script>

<template>
  <section id="about" class="about-game container" aria-labelledby="about-title">
    <div class="about-game__copy">
      <p class="eyebrow">{{ copy.aboutLabel }}</p>
      <h2 id="about-title">{{ copy.aboutLine1 }}<br>{{ copy.aboutLine2 }}<br><em>{{ copy.aboutLine3 }}</em></h2>
      <p v-for="paragraph in copy.about" :key="paragraph">{{ paragraph }}</p>
      <p class="about-game__setup">{{ copy.setup }}</p>
    </div>
    <ManualDownloadCard />
  </section>
</template>

