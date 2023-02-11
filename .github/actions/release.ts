import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'node:fs/promises'
import * as github from '@actions/github'
import { execaCommand } from 'execa'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CLIENT_SECRET: string
      CLIENT_ID: string
      GITHUB_TOKEN: string
    }
  }
}

const dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(dirname, '..', '..', '.env')
const packageJsonPath = path.join(dirname, '..', '..', 'package.json')
const token = process.env.GITHUB_TOKEN
const secret = process.env.CLIENT_SECRET
const id = process.env.CLIENT_ID

const envFileContent = `\
VITE_CLIENT_SECRET=${secret}
VITE_CLIENT_ID=${id}
`

async function run() {
  const packageJSON = JSON.parse(
    await fs.readFile(packageJsonPath, 'utf-8'),
  ) as typeof import('../../package.json')

  const dmgFileName = `Gitification_${packageJSON.version}_universal.dmg`

  const dmgPath = path.join(
    dirname,
    '..',
    '..',
    'src-tauri',
    'target',
    'universal-apple-darwin',
    'release',
    'bundle',
    'dmg',
    dmgFileName,
  )

  const octokit = github.getOctokit(token)

  await fs.writeFile(envPath, envFileContent, 'utf-8')
  await execaCommand('pnpm tauri build --target universal-apple-darwin', { stdio: 'inherit' })

  const release = await octokit.rest.repos.createRelease({
    owner: 'Gitification-App',
    repo: 'gitification',
    tag_name: packageJSON.version.toString(),
    name: packageJSON.version.toString(),
    body: 'Click to view [CHANGELOG](https://github.com/Gitification-App/gitification/blob/main/CHANGELOG.md).',
  })

  octokit.rest.repos.uploadReleaseAsset({
    owner: 'Gitification-App',
    repo: 'gitification',
    name: dmgFileName,
    release_id: release.data.id,
    // @ts-expect-error type
    data: (await fs.readFile(dmgPath)).buffer,
  })
}

run()
