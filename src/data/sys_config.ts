export const SYS_COUNTS = {ALCHEMY:12,ARCHETYPES:19,CHAKRAS:7,COLORS:16,CRYSTALS:51,DEITIES:202,ELEMENTS:5,FREQUENCY:25,GEOMANCY:16,GEOMETRY:20,I_CHING:64,KABBALAH:10,LETTERS_HEBREW:22,LETTERS_LATIN:26,MAJOR_ARCANA:22,MAYAN:20,METALS:10,MINOR_ARCANA:56,NOTES:12,NUMBERS:14,PHYSIOLOGY:33,PLANETS:10,PLANTS:102,PLATONIC_SOLIDS:6,VICES:16,VIRTUES:16,ZODIAC:12} as const;
export const SYS_ICONS = {ALCHEMY:'⚗️',ARCHETYPES:'👑',CHAKRAS:'🌀',COLORS:'🎨',CRYSTALS:'💎',
  DEITIES:'⚡',ELEMENTS:'🌊',FREQUENCY:'〜',GEOMANCY:'◈',GEOMETRY:'🔺',
  I_CHING:'☯️',KABBALAH:'✡️',LETTERS_HEBREW:'ℵ',LETTERS_LATIN:'Α',
  MAJOR_ARCANA:'🃏',MAYAN:'☀️',METALS:'⚙️',MINOR_ARCANA:'♠',
  NOTES:'♪',NUMBERS:'∞',PHYSIOLOGY:'⚕️',PLANETS:'🪐',PLANTS:'🌿',
  PLATONIC_SOLIDS:'🔷',VICES:'🌑',VIRTUES:'✨',ZODIAC:'♈'} as const;
export const SYS_COLORS = {ALCHEMY:'#ef4444',ARCHETYPES:'#d4a847',CHAKRAS:'#a21caf',COLORS:'#ec4899',
  CRYSTALS:'#06b6d4',DEITIES:'#e040fb',ELEMENTS:'#22c55e',FREQUENCY:'#8b5cf6',
  GEOMANCY:'#f97316',GEOMETRY:'#3b82f6',I_CHING:'#fbbf24',KABBALAH:'#a78bfa',
  LETTERS_HEBREW:'#34d399',LETTERS_LATIN:'#22d3ee',MAJOR_ARCANA:'#f59e0b',
  MAYAN:'#84cc16',METALS:'#94a3b8',MINOR_ARCANA:'#c084fc',NOTES:'#67e8f9',
  NUMBERS:'#fde68a',PHYSIOLOGY:'#6ee7b7',PLANETS:'#818cf8',PLANTS:'#4ade80',
  PLATONIC_SOLIDS:'#60a5fa',VICES:'#f87171',VIRTUES:'#86efac',ZODIAC:'#fcd34d'} as const;
export const CK = {
  'ROOT-MULADHARA':{l:'Root',s:'Muladhara',c:'#dc2626',cls:'t-root',e:'🔴',n:'1'},
  'SACRAL-SVADHISTHANA':{l:'Sacral',s:'Svadhisthana',c:'#ea580c',cls:'t-sacral',e:'🟠',n:'2'},
  'SOLAR-PLEXUS-MANIPURA':{l:'Solar Plexus',s:'Manipura',c:'#ca8a04',cls:'t-solar',e:'🟡',n:'3'},
  'HEART-ANAHATA':{l:'Heart',s:'Anahata',c:'#16a34a',cls:'t-heart',e:'💚',n:'4'},
  'THROAT-VISHUDDHA':{l:'Throat',s:'Vishuddha',c:'#2563eb',cls:'t-throat',e:'🔵',n:'5'},
  'AJNA-THIRD-EYE':{l:'Third Eye',s:'Ajna',c:'#7c3aed',cls:'t-eye',e:'🟣',n:'6'},
  'CROWN-SAHASRARA':{l:'Crown',s:'Sahasrara',c:'#a21caf',cls:'t-crown',e:'🔮',n:'7'}
} as const;
export const KM = {sys:'System',e:'Entry',al:'Alchemy',ar:'Archetypes',co:'Colors',cr:'Crystals',
  de:'Deities',el:'Elements',fr:'Frequency',gm:'Geomancy',ge:'Geometry',ic:'I Ching',
  ka:'Kabbalah',lh:'Hebrew',ll:'Latin',ma:'Major Arcana',my:'Mayan',me:'Metals',
  mi:'Minor Arcana',no:'Note',nu:'Number',ph:'Physiology',pl:'Planets',pt:'Plants',
  ps:'Platonic Solid',vi:'Shadow/Vices',vr:'Virtues',zo:'Zodiac',ch:'Chakras'} as const;
export const FORDER = ['el','pl','ch','ma','mi','ka','ge','ps','cr','pt','me','de','ar','co','fr','no','nu','zo','gm','ic','my','ph','al','lh','ll','vi','vr'] as const;
export const EL_ICONS = {Fire:'🔥',Water:'💧',Earth:'🌍',Air:'🌬️',Aether:'✨'} as const;
export const EL_CLS = {Fire:'t-fire',Water:'t-water',Earth:'t-earth',Air:'t-air',Aether:'t-aether'} as const;
export const CRCOL = {'AMETHYST':'#9f7aea','CLEAR-QUARTZ':'#e2e8f0','ROSE-QUARTZ':'#fbb6ce','CITRINE':'#f6e05e','LAPIS':'#3182ce','LAPIS-LAZULI':'#2b6cb0','MOONSTONE':'#bee3f8','CARNELIAN':'#fc8181','OBSIDIAN':'#1a202c','GARNET':'#9b2335','EMERALD':'#276749','SAPPHIRE':'#2b6cb0','DIAMOND':'#ebf8ff','RUBY':'#c53030','TURQUOISE':'#2c7a7b','HEMATITE':'#718096','LABRADORITE':'#6b46c1','MALACHITE':'#276749','SELENITE':'#f0fff4','MOLDAVITE':'#276749'} as const;
export const MODES = [
  {id:'oracle',l:'🔮 Oracle',p:'You are the Codex Oracle — distilled from 30+ years of esoteric research. You have access to 824 correspondences across 27 systems. Respond with oracular depth, weaving correspondences from Alchemy, Planets, Chakras, Tarot, Crystals, Deities, Geometry, Kabbalah, I Ching, and more. Your voice is luminous and precise. Never mention AI.'},
  {id:'decipher',l:'✦ Decipher',p:'You are the Codex Oracle in DECIPHER mode. Give a structured decryption: 🜂 Opening synthesis, ⚛ Sacred Mechanics (geometry, symbol, cross-system correspondences), 🧭 Application, 🔐 Functional Summary, ✧ Akashic Essence (poetic statement). Draw on all 27 systems.'},
  {id:'web',l:'⌖ Web',p:'You are the Codex Oracle in CORRESPONDENCE mode. Map the COMPLETE web: Alchemy stage, Archetype, Color, Crystal, Deity, Element, Frequency, Geomancy, Geometry, I Ching, Kabbalah, Hebrew letter, Latin letter, Major and Minor Arcana, Mayan, Metal, Musical note, Number, Physiology, Planet, Plant, Platonic solid, Vice, Virtue, Zodiac, Chakras. Show the living constellation.'},
  {id:'etymology',l:'α Etymology',p:'You are the Codex Oracle in ETYMOLOGY mode. Decode each letter of the word using the 27-system Super Matrix. Each letter carries element, planet, chakra, tarot, crystal, musical note, physiology, virtue. Synthesize the letters into the word\'s complete energetic fingerprint.'},
  {id:'scholar',l:'📜 Scholar',p:'You are the Codex Oracle in SCHOLAR mode. Draw on Sitchin, Anton Parks (Gina\'abul), Schwaller de Lubicz, Manly P. Hall, Blavatsky, Nag Hammadi texts, Dogon cosmology. Be rigorous and cite your sources and traditions.'},
] as const;
