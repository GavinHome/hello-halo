/**
 * Digital Life Avatar style system.
 *
 * 5 SVG styles auto-matched from name/description/systemPrompt keywords:
 *   geometric — assistant, consultant, service
 *   organic   — finance, data, analysis
 *   crystal   — tech, dev, system
 *   flowing   — creative, writing, design
 *   aura      — wellness, education, health
 *
 * Each style has 3 hash-driven variants for visual diversity.
 * All SVGs: viewBox="0 0 100 100", gradient background, white overlay patterns.
 */

export type AvatarStyle = 'geometric' | 'organic' | 'crystal' | 'flowing' | 'aura' | 'fallback'

// ── Style matching ──

const STYLE_KEYWORDS: [string[], AvatarStyle][] = [
  [['助手', '助理', '秘书', '顾问', '客服', 'chat', 'assistant', 'helper', 'support'], 'geometric'],
  [['股票', '金融', '分析', '数据', '量化', '复盘', 'finance', 'stock', 'market', 'quant', 'analyst'], 'organic'],
  [['技术', '开发', '系统', '运维', '代码', 'monitor', 'devops', 'code', 'deploy', 'infra', 'engineer'], 'crystal'],
  [['创意', '写作', '内容', '设计', '运营', '文案', '小红书', 'creative', 'writer', 'content', 'design'], 'flowing'],
  [['养生', '瑜伽', '心灵', '教育', '医疗', '健康', 'wellness', 'health', 'yoga', 'mindful', 'heal'], 'aura'],
]

export function matchStyle(name: string, description?: string, systemPrompt?: string): AvatarStyle {
  const text = [name, description, systemPrompt].filter(Boolean).join(' ').toLowerCase()
  for (const [keywords, style] of STYLE_KEYWORDS) {
    if (keywords.some(k => text.includes(k))) return style
  }
  return 'fallback'
}

// ── Utilities ──

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** Deterministic pseudo-random from hash + index (0-1 range) */
function hrand(h: number, i: number): number {
  const v = Math.sin(h * 9301 + i * 49297) * 49297
  return v - Math.floor(v)
}

function gradientDef(from: string, to: string, id: string): string {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect width="100" height="100" fill="url(#${id})"/>`
}

// ── A. Geometric Face ──
// Bold symmetric eyes + mouth, clearly recognizable at 40px

function generateGeometric(name: string, from: string, to: string): string {
  const h = hashName(name)
  const v = h % 3
  const ey = 34 + (h % 4) * 2
  const sp = 18 + (h % 3) * 3
  const lx = 50 - sp, rx = 50 + sp
  const ER = 11 + (h % 3) * 2

  let eyes: string
  if (v === 0) {
    // Round eyes with bright pupils
    eyes = [
      `<circle cx="${lx}" cy="${ey}" r="${ER}" fill="white" fill-opacity=".55"/>`,
      `<circle cx="${lx}" cy="${ey}" r="${ER * .45}" fill="white" fill-opacity=".9"/>`,
      `<circle cx="${rx}" cy="${ey}" r="${ER}" fill="white" fill-opacity=".55"/>`,
      `<circle cx="${rx}" cy="${ey}" r="${ER * .45}" fill="white" fill-opacity=".9"/>`,
    ].join('')
  } else if (v === 1) {
    // Diamond eyes
    const d = (cx: number, cy: number) =>
      `<polygon points="${cx},${cy - ER} ${cx + ER * .75},${cy} ${cx},${cy + ER} ${cx - ER * .75},${cy}" fill="white" fill-opacity=".5"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${ER * .3}" fill="white" fill-opacity=".9"/>`
    eyes = d(lx, ey) + d(rx, ey)
  } else {
    // Wide elliptical eyes
    eyes = [
      `<ellipse cx="${lx}" cy="${ey}" rx="${ER * 1.2}" ry="${ER * .6}" fill="white" fill-opacity=".5"/>`,
      `<ellipse cx="${rx}" cy="${ey}" rx="${ER * 1.2}" ry="${ER * .6}" fill="white" fill-opacity=".5"/>`,
      `<circle cx="${lx}" cy="${ey}" r="${ER * .3}" fill="white" fill-opacity=".9"/>`,
      `<circle cx="${rx}" cy="${ey}" r="${ER * .3}" fill="white" fill-opacity=".9"/>`,
    ].join('')
  }

  const my = 62 + (h % 4)
  let mouth: string
  if (v === 0) mouth = `<path d="M32 ${my}Q50 ${my + 16} 68 ${my}" fill="none" stroke="white" stroke-opacity=".6" stroke-width="3.5" stroke-linecap="round"/>`
  else if (v === 1) mouth = `<rect x="35" y="${my - 2}" width="30" height="8" rx="4" fill="white" fill-opacity=".35"/>`
  else mouth = `<line x1="34" y1="${my}" x2="66" y2="${my}" stroke="white" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`

  // Nose accent
  const nose = `<circle cx="50" cy="${ey + 12}" r="2.5" fill="white" fill-opacity=".3"/>`

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${gradientDef(from, to, `g${h}`)}${eyes}${nose}${mouth}</svg>`
}

// ── B. Organic Cell ──
// Central hub with satellite nodes, thick organic curves

function generateOrganic(name: string, from: string, to: string): string {
  const h = hashName(name)
  const n = 4 + (h % 3)

  // Central hub
  const hubR = 10 + (h % 3) * 2
  const hub = [
    `<circle cx="50" cy="50" r="${hubR}" fill="white" fill-opacity=".2"/>`,
    `<circle cx="50" cy="50" r="${hubR * .5}" fill="white" fill-opacity=".6"/>`,
  ].join('')

  // Satellite nodes arranged around center
  const satellites = Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n + (h % 60) * Math.PI / 180
    const dist = 26 + hrand(h, i) * 12
    const x = 50 + dist * Math.cos(angle)
    const y = 50 + dist * Math.sin(angle)
    const r = 5 + hrand(h, i + 50) * 6
    return { x, y, r }
  })

  // Curves from hub to each satellite
  const curves = satellites.map(s => {
    const cx = (50 + s.x) / 2 + (hrand(h, Math.round(s.x)) - 0.5) * 16
    const cy = (50 + s.y) / 2 + (hrand(h, Math.round(s.y)) - 0.5) * 16
    return `<path d="M50 50Q${cx.toFixed(1)} ${cy.toFixed(1)} ${s.x.toFixed(1)} ${s.y.toFixed(1)}" fill="none" stroke="white" stroke-opacity=".4" stroke-width="2.5" stroke-linecap="round"/>`
  }).join('')

  // Satellite dots
  const dots = satellites.map(s =>
    `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(1)}" fill="white" fill-opacity=".45"/><circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${(s.r * .4).toFixed(1)}" fill="white" fill-opacity=".85"/>`
  ).join('')

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${gradientDef(from, to, `o${h}`)}${curves}${hub}${dots}</svg>`
}

// ── C. Crystal Structure ──
// Bold polygonal gem with strong facet lines

function generateCrystal(name: string, from: string, to: string): string {
  const h = hashName(name)
  const sides = 5 + (h % 2)
  const rot = (h % 360) * Math.PI / 180
  const cx = 50, cy = 50, R = 36

  // Outer polygon (the gem shape)
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = rot + (2 * Math.PI * i) / sides - Math.PI / 2
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }
  })
  const outer = `<polygon points="${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="white" fill-opacity=".12" stroke="white" stroke-opacity=".7" stroke-width="2.5"/>`

  // Inner polygon (rotated)
  const innerR = R * 0.45
  const innerPts = Array.from({ length: sides }, (_, i) => {
    const a = rot + Math.PI / sides + (2 * Math.PI * i) / sides - Math.PI / 2
    return { x: cx + innerR * Math.cos(a), y: cy + innerR * Math.sin(a) }
  })
  const inner = `<polygon points="${innerPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="white" fill-opacity=".1" stroke="white" stroke-opacity=".5" stroke-width="1.5"/>`

  // Facet lines: outer vertices → center
  const facets = pts.map(p =>
    `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${cx}" y2="${cy}" stroke="white" stroke-opacity=".3" stroke-width="1.5"/>`
  ).join('')

  // Cross-facets: outer vertices → adjacent inner vertices
  const cross = pts.map((p, i) =>
    `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${innerPts[i].x.toFixed(1)}" y2="${innerPts[i].y.toFixed(1)}" stroke="white" stroke-opacity=".2" stroke-width="1"/>`
  ).join('')

  // Bright center gem
  const core = `<circle cx="${cx}" cy="${cy}" r="6" fill="white" fill-opacity=".3"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="white" fill-opacity=".8"/>`

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${gradientDef(from, to, `c${h}`)}${outer}${inner}${facets}${cross}${core}</svg>`
}

// ── D. Flowing Energy ──
// Bold sinusoidal ribbons with visible particles

function generateFlowing(name: string, from: string, to: string): string {
  const h = hashName(name)
  const wn = 3 + (h % 2)
  const amp0 = 12 + hrand(h, 0) * 10
  const phase0 = hrand(h, 1) * Math.PI * 2

  let waves = ''
  for (let w = 0; w < wn; w++) {
    const yb = 18 + w * (64 / wn)
    const amp = amp0 * (0.6 + hrand(h, w + 10) * 0.8)
    const ph = phase0 + w * 0.9
    const sw = 3 + hrand(h, w + 20) * 4
    const op = (0.2 + hrand(h, w + 30) * 0.35).toFixed(2)
    let d = `M-5 ${yb.toFixed(1)}`
    for (let x = 0; x <= 105; x += 3) {
      const y = yb + Math.sin((x / 100) * Math.PI * 2.5 + ph) * amp
      d += `L${x} ${y.toFixed(1)}`
    }
    waves += `<path d="${d}" fill="none" stroke="white" stroke-opacity="${op}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"/>`
  }

  // Flowing particles
  const dots = Array.from({ length: 6 + (h % 4) }, (_, i) => {
    const x = hrand(h, i + 50) * 80 + 10
    const y = hrand(h, i + 60) * 80 + 10
    const r = 2 + hrand(h, i + 70) * 4
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="white" fill-opacity=".4"/>`
  }).join('')

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${gradientDef(from, to, `f${h}`)}${waves}${dots}</svg>`
}

// ── E. Aura Totem ──
// Bold concentric rings + radial petals + bright core mandala

function generateAura(name: string, from: string, to: string): string {
  const h = hashName(name)
  const cx = 50, cy = 50

  // Concentric rings (bold, visible)
  const rn = 3 + (h % 2)
  const rings = Array.from({ length: rn }, (_, i) => {
    const r = 14 + i * (30 / rn)
    const sw = 2 + hrand(h, i) * 1.5
    const op = (0.2 + (rn - i) * 0.12).toFixed(2)
    return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="white" stroke-opacity="${op}" stroke-width="${sw.toFixed(1)}"/>`
  }).join('')

  // Radial rays
  const ln = 8 + (h % 4) * 2
  const rays = Array.from({ length: ln }, (_, i) => {
    const a = (2 * Math.PI * i) / ln + (h % 30) * Math.PI / 180
    const ir = 10, or = 40
    return `<line x1="${(cx + ir * Math.cos(a)).toFixed(1)}" y1="${(cy + ir * Math.sin(a)).toFixed(1)}" x2="${(cx + or * Math.cos(a)).toFixed(1)}" y2="${(cy + or * Math.sin(a)).toFixed(1)}" stroke="white" stroke-opacity=".2" stroke-width="1.5"/>`
  }).join('')

  // Mandala petals
  const pn = 6 + (h % 3)
  const petals = Array.from({ length: pn }, (_, i) => {
    const a = (2 * Math.PI * i) / pn
    const x = cx + 14 * Math.cos(a)
    const y = cy + 14 * Math.sin(a)
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6" ry="3.5" transform="rotate(${(a * 180 / Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="white" fill-opacity=".3"/>`
  }).join('')

  // Bright core
  const core = `<circle cx="${cx}" cy="${cy}" r="8" fill="white" fill-opacity=".25"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="white" fill-opacity=".8"/>`

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${gradientDef(from, to, `a${h}`)}${rings}${rays}${petals}${core}</svg>`
}

// ── Public API ──

const GENERATORS: Record<Exclude<AvatarStyle, 'fallback'>, (name: string, from: string, to: string) => string> = {
  geometric: generateGeometric,
  organic: generateOrganic,
  crystal: generateCrystal,
  flowing: generateFlowing,
  aura: generateAura,
}

/** Returns SVG string for matched style, or null if fallback (use existing letter+gradient). */
export function generateAvatarSvg(
  name: string,
  from: string,
  to: string,
  description?: string,
  systemPrompt?: string,
): string | null {
  const style = matchStyle(name, description, systemPrompt)
  if (style === 'fallback') return null
  return GENERATORS[style](name, from, to)
}
