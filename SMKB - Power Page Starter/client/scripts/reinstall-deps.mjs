/**
 * Deletes node_modules and runs pnpm install.
 * On Windows, stop other terminals running `vite` / `pnpm dev` first (avoids EPERM on esbuild.exe).
 */
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { rimrafSync } from 'rimraf'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nm = join(root, 'node_modules')

try {
  rimrafSync(nm)
  console.log('Removed node_modules')
} catch (e) {
  console.error(
    'Could not remove node_modules. Close any running Vite dev server / IDE locks, then retry.\n',
    e,
  )
  process.exit(1)
}

const result = spawnSync('pnpm', ['install'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

process.exit(result.status ?? 1)
