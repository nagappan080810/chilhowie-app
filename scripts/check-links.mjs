import { readFile } from 'node:fs/promises'

const sources = ['app/page.tsx', 'components/site-chrome.tsx', 'data/coming-soon.ts']
const content = (await Promise.all(sources.map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')))).join('\n')
const plannedContent = await readFile(new URL('../data/coming-soon.ts', import.meta.url), 'utf8')
const planned = new Set([
  ...[...plannedContent.matchAll(/\b(?:residents|business|government|visit)\('([^']+)'/g)].map((match) => match[1]),
  ...[...plannedContent.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]),
])
const built = new Set(['/', '/admin', '/admin/login'])
const paths = new Set([...content.matchAll(/["'](\/[A-Za-z0-9/_-]+)(?:[?#][^"']*)?["']/g)].map((match) => match[1]))
const ignoredPrefixes = ['/api/', '/images/']
const missing = [...paths].filter((path) => !built.has(path) && !planned.has(path) && !ignoredPrefixes.some((prefix) => path.startsWith(prefix)))

if (missing.length) {
  console.error(`Unmapped internal links:\n${missing.map((path) => `- ${path}`).join('\n')}`)
  process.exit(1)
}

console.log(`Checked ${paths.size} internal paths; all resolve to a built or planned route.`)
