import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/app/journal/[slug]/PostClient.tsx', import.meta.url), 'utf8')

assert.match(source, /const VAULT_INVITES_BY_SLUG/)
for (const slug of [
  'tarot-symbolic-machine-for-fate',
  'dreamwalker-lucid-dreaming-astral-projection',
  'i-ching-ancient-oracle-of-change',
  'sexual-alchemy-taoist-tradition',
  'taoism-quantum-physics-controversy',
  'alchemy-of-soul-magnum-opus',
]) {
  assert.match(source, new RegExp(`'${slug}'`))
}

assert.match(source, /const vaultInvite = VAULT_INVITES_BY_SLUG\[post\.slug\]/)
assert.match(source, /\{vaultInvite && \(/)
assert.match(source, /href=\{vaultInvite\.href\}/)

console.log('Vault journal invite contract passed')
