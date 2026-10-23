<script setup lang="ts">
const { locale, copy } = useSiteLocale()
const route = useRoute()
</script>

<template>
  <nav class="language-switch" :aria-label="copy.languageLabel">
    <NuxtLink :to="'/en-us' + route.hash" lang="en" hreflang="en-US"
              :aria-current="locale === 'en-us' ? 'page' : undefined" aria-label="English">EN</NuxtLink>
    <NuxtLink :to="'/pt-br' + route.hash" lang="pt-BR" hreflang="pt-BR"
              :aria-current="locale === 'pt-br' ? 'page' : undefined" aria-label="Português">PT</NuxtLink>
  </nav>
</template>

