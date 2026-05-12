/**
 * Removes build output and Vite prebundle caches (safe to run anytime).
 */
import { existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const paths = [
  join(root, 'dist'),
  join(root, 'node_modules', '.vite'),
  join(root, 'node_modules', '.cache'),
]

for (const p of paths) {
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true })
    console.log('Removed:', p)
  }
}
