import { execFileSync } from 'node:child_process'
import { cp, mkdir, rm, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const action = process.argv[2] ?? 'stage'
const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(currentDir, '..')
const backendRoot = resolve(projectRoot, 'backend')
const buildRoot = resolve(projectRoot, 'build')
const buildWhmcsRoot = resolve(buildRoot, 'whmcs')
const releasesRoot = resolve(buildRoot, 'releases')
const packageFile = resolve(releasesRoot, 'cloudhub-whmcs.zip')

const copyFilter = (source) => {
  const normalizedSource = source.replaceAll('\\', '/')

  if (normalizedSource.endsWith('/.DS_Store')) {
    return false
  }

  if (normalizedSource.endsWith('/dist') || normalizedSource.includes('/dist/')) {
    return false
  }

  return true
}

async function cleanBuildDirectories() {
  await rm(buildWhmcsRoot, { recursive: true, force: true })
  await rm(packageFile, { force: true })
  await mkdir(buildWhmcsRoot, { recursive: true })
  await mkdir(releasesRoot, { recursive: true })
}

async function stageBackend() {
  await cleanBuildDirectories()

  await cp(resolve(backendRoot, 'cloudhub.php'), resolve(buildWhmcsRoot, 'cloudhub.php'))
  await cp(resolve(backendRoot, 'modules'), resolve(buildWhmcsRoot, 'modules'), {
    recursive: true,
    filter: copyFilter,
  })
}

async function packageBuild() {
  await mkdir(releasesRoot, { recursive: true })
  await stat(buildWhmcsRoot)
  await rm(packageFile, { force: true })

  const zipCommand = process.platform === 'win32' ? 'tar.exe' : 'zip'
  const zipArguments =
    process.platform === 'win32'
      ? ['-a', '-c', '-f', packageFile, '.']
      : ['-rq', packageFile, '.']

  execFileSync(zipCommand, zipArguments, {
    cwd: buildWhmcsRoot,
    stdio: 'inherit',
  })
}

if (action === 'clean') {
  await cleanBuildDirectories()
} else if (action === 'stage') {
  await stageBackend()
} else if (action === 'zip') {
  await packageBuild()
} else {
  throw new Error(`Unsupported action: ${action}`)
}
