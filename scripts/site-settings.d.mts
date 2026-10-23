export interface SiteSettings {
  siteUrl: string
  indexable: boolean
  gameUrl: string
}
export function getSiteSettings(env?: Record<string, string | undefined>): SiteSettings

