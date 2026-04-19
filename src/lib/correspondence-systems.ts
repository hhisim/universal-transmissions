export const CODEX_SYSTEMS = [
  "ALCHEMY","ARCHETYPES","CHAKRAS","COLORS","CRYSTALS",
  "DEITIES","ELEMENTS","FREQUENCY","GEOMETRY","I_CHING",
  "KABBALAH","LETTERS_HEBREW","LETTERS_LATIN","MAJOR_ARCANA","MAYAN",
  "METALS","MINOR_ARCANA","NUMBERS","PHYSIOLOGY","PLANETS",
  "PLANTS","PLATONIC_SOLIDS","VICES","VIRTUES","ZODIAC",
] as const;

export const SYS_COLORS: Record<string, string> = {
  ALCHEMY:'#ef4444',ARCHETYPES:'#d4a847',CHAKRAS:'#a21caf',
  COLORS:'#ec4899',CRYSTALS:'#06b6d4',DEITIES:'#8b5cf6',
  ELEMENTS:'#22c55e',FREQUENCY:'#f59e0b',GEOMETRY:'#3b82f6',
  I_CHING:'#14b8a6',KABBALAH:'#a855f7',LETTERS_HEBREW:'#eab308',
  LETTERS_LATIN:'#eab308',MAJOR_ARCANA:'#d946ef',MAYAN:'#f97316',
  METALS:'#94a3b8',MINOR_ARCANA:'#a855f7',NUMBERS:'#64748b',
  PHYSIOLOGY:'#10b981',PLANETS:'#eab308',PLANTS:'#22c55e',
  PLATONIC_SOLIDS:'#8b5cf6',VICES:'#dc2626',VIRTUES:'#16a34a',
  ZODIAC:'#0ea5e9',
};

export const EL_CLS: Record<string, string> = {
  Fire:'t-fire',Water:'t-water',Earth:'t-earth',Air:'t-air',Aether:'t-aether',
};

export const CK: Record<string, {l:string;s:string;c:string;cls:string;e:string;n:string}> = {
  'ROOT-MULADHARA':    {l:'Root',       s:'Muladhara',    c:'#dc2626', cls:'t-root',   e:'🔴', n:'1'},
  'SACRAL-SVADHISTHANA':{l:'Sacral',     s:'Svadhisthana', c:'#ea580c', cls:'t-sacral', e:'🟠', n:'2'},
  'SOLAR-PLEXUS-MANIPURA':{l:'Solar',    s:'Manipura',     c:'#ca8a04', cls:'t-solar',  e:'🟡', n:'3'},
  'HEART-ANAHATA':     {l:'Heart',      s:'Anahata',      c:'#16a34a', cls:'t-heart',  e:'🟢', n:'4'},
  'THROAT-VISHUDDHA':  {l:'Throat',     s:'Vishuddha',    c:'#2563eb', cls:'t-throat', e:'🔵', n:'5'},
  'AJNA-THIRD-EYE':    {l:'Third Eye',  s:'Ajna',         c:'#7c3aed', cls:'t-eye',    e:'🟣', n:'6'},
  'CROWN-SAHASRARA':   {l:'Crown',      s:'Sahasrara',    c:'#a21caf', cls:'t-crown',  e:'⚪', n:'7'},
};

export const FORORDER = [
  'sys','e','al','ar','co','cr','de','el','fr','gm','ge','ic','ka','lh','ll','ma','my','me','mi','no','nu','ph','pl','pt','ps','vi','vr','zo','ch',
] as const;

export function getCkClass(ch: string): string {
  if (!ch) return '';
  return ch.split(';').map(s => { const k = s.trim(); return CK[k]?.cls || ''; }).filter(Boolean).join(' ');
}
export function getCkColor(ch: string): string {
  if (!ch) return 'rgba(255,255,255,.08)';
  return ch.split(';').map(s => { const k = s.trim(); return CK[k]?.c || ''; })[0] || 'rgba(255,255,255,.08)';
}
export function getSysColor(sys: string): string {
  return SYS_COLORS[sys] || '#e040fb';
}