<script setup lang="ts">
const { copy } = useSiteLocale()
</script>

<template>
  <header class="site-header container">
    <a class="brand" href="#main" :aria-label="copy.brandLabel">
      <span class="brand__mark" aria-hidden="true">✦</span>
      FIREFLY <span class="brand__suffix">STUDIO</span>
    </a>
    <div class="site-header__actions">
      <nav class="site-nav" :aria-label="copy.navLabel">
        <a href="#about">{{ copy.navAbout }}</a>
        <a href="#team">{{ copy.navTeam }}</a>
        <a class="nav-play" href="#play">{{ copy.navPlay }} <span aria-hidden="true">↗</span></a>
      </nav>
      <LanguageSwitch />
    </div>
  </header>
</template>

