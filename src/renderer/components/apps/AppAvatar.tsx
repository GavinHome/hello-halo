/**
 * AppAvatar - Name-character avatar for digital humans.
 *
 * Priority:
 * 1. Brand match — detects platform names (小红书, 微信, GitHub, etc.)
 *    and applies their signature color + character.
 * 2. Generic fallback — first character on a hash-determined gradient.
 */

import { useMemo } from 'react'

interface BrandDef {
  keywords: string[]
  char: string
  from: string
  to: string
}

const BRANDS: BrandDef[] = [
  { keywords: ['小红书', 'red', 'xhs'], char: '红', from: '#FF2442', to: '#FF6B81' },
  { keywords: ['微信', 'wechat', 'wx'], char: '微', from: '#07C160', to: '#38D974' },
  { keywords: ['抖音', 'tiktok', 'douyin'], char: '抖', from: '#111111', to: '#FE2C55' },
  { keywords: ['微博', 'weibo'], char: '博', from: '#E6162D', to: '#FF6B4A' },
  { keywords: ['b站', 'bilibili', '哔哩'], char: 'B', from: '#FB7299', to: '#FF9EB5' },
  { keywords: ['知乎', 'zhihu'], char: '知', from: '#0066FF', to: '#3D8BFF' },
  { keywords: ['淘宝', 'taobao'], char: '淘', from: '#FF5000', to: '#FF7D33' },
  { keywords: ['钉钉', 'dingtalk', 'ding'], char: '钉', from: '#3296FA', to: '#5CB3FF' },
  { keywords: ['飞书', 'feishu', 'lark'], char: '飞', from: '#3370FF', to: '#6699FF' },
  { keywords: ['github'], char: 'G', from: '#24292E', to: '#57606A' },
  { keywords: ['twitter', 'x.com', ' 𝕏'], char: '𝕏', from: '#000000', to: '#333333' },
  { keywords: ['youtube', '油管'], char: 'Y', from: '#FF0000', to: '#FF4444' },
  { keywords: ['instagram', 'ins'], char: 'I', from: '#833AB4', to: '#E1306C' },
  { keywords: ['telegram', 'tg'], char: 'T', from: '#0088CC', to: '#29B6F6' },
  { keywords: ['slack'], char: 'S', from: '#4A154B', to: '#E01E5A' },
  { keywords: ['notion'], char: 'N', from: '#000000', to: '#555555' },
  { keywords: ['linkedin', '领英'], char: 'L', from: '#0A66C2', to: '#378FE9' },
  { keywords: ['discord'], char: 'D', from: '#5865F2', to: '#7289DA' },
]

const FALLBACK_GRADIENTS: [string, string][] = [
  ['#1B3A5C', '#3B7DD8'],
  ['#1A365D', '#4299E1'],
  ['#2D3748', '#718096'],
  ['#22543D', '#48BB78'],
  ['#44337A', '#805AD5'],
  ['#744210', '#D69E2E'],
  ['#2A4365', '#63B3ED'],
  ['#285E61', '#4FD1C5'],
  ['#553C9A', '#B794F4'],
  ['#7B341E', '#ED8936'],
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function matchBrand(name: string): BrandDef | null {
  const lower = name.toLowerCase()
  return BRANDS.find(b => b.keywords.some(k => lower.includes(k))) ?? null
}

function getDisplayChar(name: string): string {
  const ch = name.trim().charAt(0)
  return ch >= 'a' && ch <= 'z' ? ch.toUpperCase() : ch
}

interface AppAvatarProps {
  name: string
  size?: number
  className?: string
}

export function AppAvatar({ name, size = 40, className }: AppAvatarProps) {
  const { char, from, to } = useMemo(() => {
    const brand = matchBrand(name)
    if (brand) return { char: brand.char, from: brand.from, to: brand.to }
    const h = hashName(name)
    const [from, to] = FALLBACK_GRADIENTS[h % FALLBACK_GRADIENTS.length]
    return { char: getDisplayChar(name), from, to }
  }, [name])

  const fontSize = Math.round(size * 0.45)

  return (
    <div
      className={`flex items-center justify-center rounded-xl shrink-0 ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      <span
        className="text-white font-semibold select-none"
        style={{ fontSize, lineHeight: 1 }}
      >
        {char}
      </span>
    </div>
  )
}
