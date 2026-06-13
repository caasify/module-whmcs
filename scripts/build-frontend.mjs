import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(currentDir, '..')
const buildTarget = resolve(projectRoot, 'build', 'whmcs', 'modules', 'addons', 'caasify')

if (!existsSync(buildTarget)) {
  throw new Error('Missing staged backend package. Run the backend stage step before building the frontend.')
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

execFileSync(npmCommand, ['--prefix', 'frontend', 'run', 'build'], {
  cwd: projectRoot,
  stdio: 'inherit',
})
