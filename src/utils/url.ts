import type { LinkFormat } from '../api/types'

const HF_BASE = 'https://huggingface.co'

export function buildDirectUrl(repo: string, path: string, branch = 'main'): string {
  return `${HF_BASE}/datasets/${repo}/resolve/${branch}/${path}`
}

export function buildLink(format: LinkFormat, url: string, name?: string): string {
  const label = name || 'image'
  switch (format) {
    case 'url':
      return url
    case 'markdown':
      return `![${label}](${url})`
    case 'html':
      return `<img src="${url}" alt="${label}" />`
    case 'bbcode':
      return `[img]${url}[/img]`
  }
}

export function buildRepoUrl(repo: string): string {
  return `${HF_BASE}/datasets/${repo}`
}
