<script setup lang="ts">
const { copy } = useSiteLocale()
useGameSeo()
</script>

<template>
  <a class="skip-link" href="#main">{{ copy.skip }}</a>
  <SiteHeader />
  <main id="main">
    <section class="game-intro container" aria-labelledby="game-title">
      <div>
        <p class="eyebrow">{{ copy.presents }}</p>
        <h1 id="game-title" lang="en">Houston,<br><span>we have a problem.</span></h1>
      </div>
      <p class="game-intro__summary">{{ copy.tagline }}<br>{{ copy.summary }}</p>
    </section>
    <GamePlayer />
    <PlatformDownloads />
    <AboutGame />
  </main>
  <SiteFooter />
</template>

