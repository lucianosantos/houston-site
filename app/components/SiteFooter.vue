<script setup lang="ts">
import { game } from '~/data/site-content'
import { team } from '~/data/site-links'
const { copy } = useSiteLocale()
</script>

<template>
  <footer id="team" class="site-footer container">
    <div class="site-footer__heading"><h2>{{ copy.crew }}</h2><span>FIREFLY STUDIO</span></div>
    <ul class="team">
      <li v-for="member in team" :key="member.name">
        <strong>{{ member.name }}</strong>
        <span>{{ copy.teamRoles[member.role] }}</span>
        <a :href="member.url" target="_blank" rel="noopener noreferrer"
           :aria-label="`${copy.contact} ${member.name} — ${copy.newTab}`">{{ copy.contact }} ↗</a>
      </li>
    </ul>
    <div class="site-footer__bottom"><span>{{ game.name }}</span><span>{{ copy.footerDescription }}</span></div>
  </footer>
</template>


