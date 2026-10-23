import { computed } from 'vue'
import { content, type LocaleCode } from '~/data/site-content'

export function useSiteLocale() {
  const route = useRoute()
  const locale = computed<LocaleCode>(() => route.path.replace(/\/$/, '') === '/pt-br' ? 'pt-br' : 'en-us')
  const copy = computed(() => content[locale.value])
  return { locale, copy }
}

