export const game = {
  name: 'Houston, We Have a Problem',
  studio: 'Firefly Studio',
  poster: '/images/key-art.png',
  posterWidth: 1672,
  posterHeight: 941,
  manual: { url: '/downloads/houston-manual.pdf', image: '/images/manual-cover.jpg' }
} as const

export type LocaleCode = 'en-us' | 'pt-br'

const en = {
  htmlLang: 'en-US', ogLocale: 'en_US',
  seoTitle: 'Houston, We Have a Problem | Two-player co-op puzzle game',
  description: 'Two players. Five puzzles. Ten minutes. One operates the ship, the other reads the manual. Communicate and repair the ship before impact.',
  imageAlt: 'Houston cockpit with a red warning light and an approaching planet',
  skip: 'Skip to content', brandLabel: 'Firefly Studio — back to top', navLabel: 'Main navigation',
  navAbout: 'About & manual', navTeam: 'The team', navPlay: 'Play',
  languageLabel: 'Website language', presents: 'FIREFLY STUDIO PRESENTS',
  tagline: 'Two players. Five puzzles. Ten minutes.',
  summary: 'Talk your way out of a cosmic disaster.',
  playerLabel: 'Play Houston, We Have a Problem', waiting: 'YOUR SHIP IS WAITING', players: '2 PLAYERS · CO-OP',
  browserEdition: 'BROWSER EDITION', ready: 'Ready for launch?', start: 'Start game',
  comingSoon: 'Web build coming soon', chooseRole: 'Choose your role in the game menu.',
  unavailable: 'The browser version is not available yet. Download the game below.',
  iframeTitle: 'Houston, We Have a Problem — playable game', loading: 'Loading the game…',
  fullscreen: 'Fullscreen ↗', exitFullscreen: 'Exit fullscreen ↙',
  fullscreenError: 'Fullscreen is unavailable. You can still play in the page.',
  controls: 'Browser controls: mouse & keyboard. Use your own voice chat to communicate.',
  gameLanguage: 'Game and manual available in English.',
  downloadTitle: 'Prefer to download?', downloadNote: 'Choose your version. Downloads open in Google Drive.',
  downloadFor: 'Download for', driveHint: 'opens Google Drive in a new tab',
  aboutLabel: 'ABOUT THE GAME', aboutLine1: 'One ship.', aboutLine2: 'Two perspectives.', aboutLine3: 'Talk to survive.',
  about: [
    'Your ship is on a collision course with a planet. Five systems need repairing, and you have ten minutes to work it out together.',
    'One player operates the control panel. The other reads the manual and explains the instructions. You see different information, so neither of you can do it alone.'
  ],
  setup: 'Stay within earshot or on a voice call. Each player uses a separate device. The manual reader can use the in-game manual or download the PDF to read offline or print. Keep the instructions with the manual reader — the controller should rely on their partner.',
  manualTag: 'FOR THE MANUAL READER', manualEyebrow: 'YOUR PARTNER HAS THE CONTROLS.',
  manualTitle: 'You have the manual.',
  manualDescription: 'The ship’s instructions, diagrams and clues. Download a copy and guide your partner through the repairs.',
  manualMetadata: 'PDF · 8 original spreads · 13.9 MB · English',
  manualDownload: 'Download the manual',
  manualLabel: 'Download the instruction manual — PDF, 8 original spreads, 13.9 MB, English',
  manualImageAlt: 'Spacecraft instruction manual with a celestial diagram',
  crew: 'The crew behind the chaos.', contact: 'Contact', newTab: 'opens in a new tab',
  footerDescription: 'A two-player communication puzzle game.',
  teamRoles: {
    '3D Art and Project Manager': '3D Art and Project Manager',
    'Programming': 'Programming',
    'Game Design and 3D Art': 'Game Design and 3D Art',
    '2D Artist and UI Design': '2D Artist and UI Design',
    'Sound Design': 'Sound Design'
  }
}

export type SiteCopy = typeof en

const pt: SiteCopy = {
  htmlLang: 'pt-BR', ogLocale: 'pt_BR',
  seoTitle: 'Houston, We Have a Problem | Jogo de enigmas cooperativo para dois',
  description: 'Duas pessoas. Cinco enigmas. Dez minutos. Uma opera a nave; a outra consulta o manual. Conversem e consertem a nave antes do impacto.',
  imageAlt: 'Painel da nave de Houston com luz de alerta vermelha e um planeta se aproximando',
  skip: 'Pular para o conteúdo', brandLabel: 'Firefly Studio — voltar ao topo', navLabel: 'Navegação principal',
  navAbout: 'Sobre e manual', navTeam: 'O time', navPlay: 'Jogar',
  languageLabel: 'Idioma do site', presents: 'FIREFLY STUDIO APRESENTA',
  tagline: 'Duas pessoas. Cinco enigmas. Dez minutos.',
  summary: 'Conversem para escapar de um desastre cósmico.',
  playerLabel: 'Jogar Houston, We Have a Problem', waiting: 'SUA NAVE ESTÁ ESPERANDO', players: '2 JOGADORES · COOP',
  browserEdition: 'VERSÃO PARA NAVEGADOR', ready: 'Prontos para decolar?', start: 'Iniciar jogo',
  comingSoon: 'Versão Web em breve', chooseRole: 'Escolha seu papel no menu do jogo.',
  unavailable: 'A versão para navegador ainda não está disponível. Baixe o jogo abaixo.',
  iframeTitle: 'Houston, We Have a Problem — jogo', loading: 'Carregando o jogo…',
  fullscreen: 'Tela cheia ↗', exitFullscreen: 'Sair da tela cheia ↙',
  fullscreenError: 'A tela cheia não está disponível. Você ainda pode jogar na página.',
  controls: 'Controles no navegador: mouse e teclado. Usem sua própria chamada de voz para conversar.',
  gameLanguage: 'Jogo e manual disponíveis em inglês.',
  downloadTitle: 'Prefere baixar?', downloadNote: 'Escolha sua versão. Os links abrem no Google Drive.',
  downloadFor: 'Baixar para', driveHint: 'abre o Google Drive em uma nova aba',
  aboutLabel: 'SOBRE O JOGO', aboutLine1: 'Uma nave.', aboutLine2: 'Duas perspectivas.', aboutLine3: 'Conversem para sobreviver.',
  about: [
    'Sua nave está em rota de colisão com um planeta. Cinco sistemas precisam de reparos, e vocês têm dez minutos para resolver tudo em equipe.',
    'Uma pessoa opera o painel de controle. A outra consulta o manual e explica as instruções. Cada uma vê informações diferentes: ninguém resolve tudo sozinho.'
  ],
  setup: 'Fiquem próximos para se ouvir ou entrem em uma chamada de voz. Cada pessoa usa um dispositivo separado. Quem lê o manual pode consultá-lo no jogo ou baixar o PDF para ler offline ou imprimir. As instruções ficam com essa pessoa — quem opera o painel deve confiar no parceiro.',
  manualTag: 'PARA QUEM LÊ O MANUAL', manualEyebrow: 'SEU PARCEIRO TEM OS CONTROLES.',
  manualTitle: 'Você tem o manual.',
  manualDescription: 'Instruções, diagramas e pistas da nave. Baixe uma cópia e oriente seu parceiro durante os reparos.',
  manualMetadata: 'PDF · 8 páginas duplas originais · 13,9 MB · Inglês',
  manualDownload: 'Baixar o manual',
  manualLabel: 'Baixar o manual de instruções — PDF, 8 páginas duplas, 13,9 MB, em inglês',
  manualImageAlt: 'Manual de instruções da nave aberto, com um diagrama celeste',
  crew: 'O time por trás do caos.', contact: 'Contato', newTab: 'abre em uma nova aba',
  footerDescription: 'Um jogo de enigmas e comunicação para duas pessoas.',
  teamRoles: {
    '3D Art and Project Manager': 'Arte 3D e gestão do projeto',
    'Programming': 'Programação',
    'Game Design and 3D Art': 'Game design e arte 3D',
    '2D Artist and UI Design': 'Arte 2D e design de interface',
    'Sound Design': 'Design de som'
  }
}

export const content: Record<LocaleCode, SiteCopy> = { 'en-us': en, 'pt-br': pt }

