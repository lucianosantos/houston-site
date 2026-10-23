import type { SiteCopy } from './site-content'
export interface TeamMember {
  name: string
  role: keyof SiteCopy['teamRoles']
  url: string
}

export const downloads = [
  { platform: 'Windows', url: 'https://drive.google.com/file/d/1ObkxOQtCsQGK-pZ_eHkWoI6VmInbMYPw/view?usp=sharing' },
  { platform: 'Mobile', url: 'https://drive.google.com/file/d/17aiD4n0JrrqkoX5trT6Pcv2UtIqXhn0G/view?usp=drive_link' }
] as const

// QR destinations supplied by the team. Keep the original redirects until direct contacts are supplied.
export const team: TeamMember[] = [
  { name: 'Jhonatan Brendo', role: '3D Art and Project Manager', url: 'https://qr.generatorqr.com/C9JTF0PgX' },
  { name: 'Luciano Santos', role: 'Programming', url: 'https://qr.generatorqr.com/C9LTg2nT3' },
  { name: 'Marcela Nunes', role: 'Game Design and 3D Art', url: 'https://qr.generatorqr.com/C9II6jEyY' },
  { name: 'Victoria Viana', role: '2D Artist and UI Design', url: 'https://qr.generatorqr.com/C9KHS5j4d' },
  { name: 'Maurício Junior', role: 'Sound Design', url: 'https://qr.generatorqr.com/C9GaEB7ms' }
]


