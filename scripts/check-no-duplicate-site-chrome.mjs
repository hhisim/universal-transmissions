import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src/app';
const ALLOWLIST = new Set(['src/app/layout.tsx']);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const offenders = [];
for (const file of walk(ROOT)) {
  if (ALLOWLIST.has(file)) continue;
  const text = readFileSync(file, 'utf8');
  const hasNav = text.includes('import Navigation') || text.includes('<Navigation');
  const hasFooter = text.includes('import Footer') || text.includes('<Footer');
  if (hasNav || hasFooter) {
    offenders.push({ file, hasNav, hasFooter });
  }
}

if (offenders.length) {
  console.error('Duplicate site chrome detected outside root layout:');
  for (const offender of offenders) {
    console.error(`- ${relative(process.cwd(), offender.file)}${offender.hasNav ? ' [Navigation]' : ''}${offender.hasFooter ? ' [Footer]' : ''}`);
  }
  process.exit(1);
}

console.log('PASS: no duplicate page-level Navigation/Footer outside root layout.');
