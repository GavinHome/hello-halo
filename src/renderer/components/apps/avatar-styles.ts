/**
 * Digital Life Avatar style system.
 *
 * Visual style is driven by runtime status — the avatar's appearance
 * changes as the digital human transitions between states, giving
 * immediate visual feedback about what it's doing.
 *
 *   idle        → Geometric Face   (calm, structured, waiting)
 *   running     → Flowing Energy   (dynamic, active, flowing)
 *   paused      → Aura Totem       (still, meditative, suspended)
 *   error       → Crystal Structure (sharp, fractured, alerting)
 *   queued      → Organic Cell     (processing, pulsing, alive)
 */

export type AvatarStyle = 'geometric' | 'organic' | 'crystal' | 'flowing' | 'aura' | 'fallback'

// ── Status → Style mapping ──

const STATUS_STYLE: Record<string, AvatarStyle> = {
  idle: 'geometric',
  active: 'geometric',
  running: 'flowing',
  paused: 'aura',
  error: 'crystal',
  queued: 'organic',
  waiting_user: 'geometric',
}

export function styleForStatus(status?: string): AvatarStyle {
  if (!status) return 'geometric'
  return STATUS_STYLE[status] ?? 'geometric'
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
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect class="bg" width="100" height="100" fill="url(#${id})"/>`
}

function animCSS(status: string): string {
  const dur = status === 'running' ? '3s' : status === 'paused' ? '7s' : status === 'error' ? '6s' : '5s'
  return `<style>` +
    `@keyframes ab{0%,88%,100%{transform:scaleY(1)}94%{transform:scaleY(.1)}}` +
    `@keyframes abg{0%,100%{opacity:1}50%{opacity:.78}}` +
    `@keyframes ask{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}` +
    `@keyframes arot{to{transform:rotate(360deg)}}` +
    `@keyframes aop{0%,100%{transform:scale(1);opacity:.45}50%{transform:scale(1.25);opacity:.8}}` +
    `@keyframes ash{0%,100%{stroke-opacity:.7}50%{stroke-opacity:.2}}` +
    `@keyframes aro{from{transform:rotate(0)}}` +
    `@keyframes aex{0%,100%{transform:scale(1);opacity:.2}50%{transform:scale(1.08);opacity:.4}}` +
    `@keyframes adf{to{stroke-dashoffset:0}}` +
    `.ae{transform-box:fill-box;transform-origin:center;animation:ab ${dur} ease-in-out infinite}` +
    `.bg{animation:abg 4s ease-in-out infinite}` +
    `.am{transform-box:fill-box;transform-origin:center}` +
    `.ac{transform-box:fill-box;transform-origin:center}` +
    `.ao{transform-box:fill-box;transform-origin:center;animation:aop 4s ease-in-out infinite}` +
    `.ax{transform-box:fill-box;transform-origin:center;animation:ash 6s ease-in-out infinite}` +
    `.aw{stroke-dasharray:8 4;stroke-dashoffset:24;animation:adf 3s linear infinite}` +
    `.ar{transform-box:fill-box;transform-origin:center;animation:aex 5s ease-in-out infinite}` +
    `.at{transform-box:fill-box;transform-origin:center}` +
    (status === 'running'
      ? `.am{animation:ab 1.5s ease-in-out infinite}.ac{animation:abg 2s ease-in-out infinite}.ao{animation-duration:2s}.ax{animation-duration:3s}.aw{animation-duration:1.5s}.ar{animation-duration:2.5s}.at{animation:aro 4s linear infinite}`
      : status === 'paused'
      ? `.am,.ac{opacity:.45}.ao,.ar{animation-play-state:paused}`
      : status === 'error'
      ? `.am{animation:ask .5s ease-in-out infinite}.ac{animation:abg 1s ease-in-out infinite}.bg{animation:abg 2s ease-in-out infinite}.ax{animation-duration:2s}.ao{animation:ask .4s ease-in-out infinite}`
      : status === 'queued'
      ? `.ac{animation:arot 3s linear infinite}.at{animation:aro 5s linear infinite}`
      : `.at{animation:aro 12s linear infinite}`) +
    `</style>`
}

// ── A. Geometric Face ──
// Bold symmetric eyes + mouth, clearly recognizable at 40px

function generateGeometric(name: string, from: string, to: string, status: string): string {
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
      `<circle class="ae" cx="${lx}" cy="${ey}" r="${ER}" fill="white" fill-opacity=".55"/>`,
      `<circle cx="${lx}" cy="${ey}" r="${ER * .45}" fill="white" fill-opacity=".9"/>`,
      `<circle class="ae" cx="${rx}" cy="${ey}" r="${ER}" fill="white" fill-opacity=".55"/>`,
      `<circle cx="${rx}" cy="${ey}" r="${ER * .45}" fill="white" fill-opacity=".9"/>`,
    ].join('')
  } else if (v === 1) {
    // Diamond eyes
    const d = (cx: number, cy: number) =>
      `<polygon class="ae" points="${cx},${cy - ER} ${cx + ER * .75},${cy} ${cx},${cy + ER} ${cx - ER * .75},${cy}" fill="white" fill-opacity=".5"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${ER * .3}" fill="white" fill-opacity=".9"/>`
    eyes = d(lx, ey) + d(rx, ey)
  } else {
    // Wide elliptical eyes
    eyes = [
      `<ellipse class="ae" cx="${lx}" cy="${ey}" rx="${ER * 1.2}" ry="${ER * .6}" fill="white" fill-opacity=".5"/>`,
      `<ellipse class="ae" cx="${rx}" cy="${ey}" rx="${ER * 1.2}" ry="${ER * .6}" fill="white" fill-opacity=".5"/>`,
      `<circle cx="${lx}" cy="${ey}" r="${ER * .3}" fill="white" fill-opacity=".9"/>`,
      `<circle cx="${rx}" cy="${ey}" r="${ER * .3}" fill="white" fill-opacity=".9"/>`,
    ].join('')
  }

  const my = 62 + (h % 4)
  let mouth: string
  if (v === 0) mouth = `<path class="am" d="M32 ${my}Q50 ${my + 16} 68 ${my}" fill="none" stroke="white" stroke-opacity=".6" stroke-width="3.5" stroke-linecap="round"/>`
  else if (v === 1) mouth = `<rect class="am" x="35" y="${my - 2}" width="30" height="8" rx="4" fill="white" fill-opacity=".35"/>`
  else mouth = `<line class="am" x1="34" y1="${my}" x2="66" y2="${my}" stroke="white" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`

  // Nose accent
  const nose = `<circle cx="50" cy="${ey + 12}" r="2.5" fill="white" fill-opacity=".3"/>`

  return `<svg class="${status}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${animCSS(status)}${gradientDef(from, to, `g${h}`)}${eyes}${nose}${mouth}</svg>`
}

// ── B. Organic Cell ──
// Central hub with satellite nodes, thick organic curves

function generateOrganic(name: string, from: string, to: string, status: string): string {
  const h = hashName(name)
  const n = 4 + (h % 3)

  // Central hub
  const hubR = 10 + (h % 3) * 2
  const hub = [
    `<circle class="ac" cx="50" cy="50" r="${hubR}" fill="white" fill-opacity=".2"/>`,
    `<circle class="ac" cx="50" cy="50" r="${hubR * .5}" fill="white" fill-opacity=".6"/>`,
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
    return `<path class="ac" d="M50 50Q${cx.toFixed(1)} ${cy.toFixed(1)} ${s.x.toFixed(1)} ${s.y.toFixed(1)}" fill="none" stroke="white" stroke-opacity=".4" stroke-width="2.5" stroke-linecap="round"/>`
  }).join('')

  // Satellite dots
  const dots = satellites.map((s, i) =>
    `<circle class="ao" cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(1)}" fill="white" fill-opacity=".45" style="animation-delay:${(i * 0.8).toFixed(1)}s"/><circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${(s.r * .4).toFixed(1)}" fill="white" fill-opacity=".85"/>`
  ).join('')

  return `<svg class="${status}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${animCSS(status)}${gradientDef(from, to, `o${h}`)}${curves}${hub}${dots}</svg>`
}

// ── C. Crystal Structure ──
// Bold polygonal gem with strong facet lines

function generateCrystal(name: string, from: string, to: string, status: string): string {
  const h = hashName(name)
  const sides = 5 + (h % 2)
  const rot = (h % 360) * Math.PI / 180
  const cx = 50, cy = 50, R = 36

  // Outer polygon (the gem shape)
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = rot + (2 * Math.PI * i) / sides - Math.PI / 2
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }
  })
  const outer = `<polygon class="ax" points="${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="white" fill-opacity=".12" stroke="white" stroke-opacity=".7" stroke-width="2.5"/>`

  // Inner polygon (rotated)
  const innerR = R * 0.45
  const innerPts = Array.from({ length: sides }, (_, i) => {
    const a = rot + Math.PI / sides + (2 * Math.PI * i) / sides - Math.PI / 2
    return { x: cx + innerR * Math.cos(a), y: cy + innerR * Math.sin(a) }
  })
  const inner = `<polygon class="ac" points="${innerPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="white" fill-opacity=".1" stroke="white" stroke-opacity=".5" stroke-width="1.5"/>`

  // Facet lines: outer vertices → center
  const facets = pts.map(p =>
    `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${cx}" y2="${cy}" stroke="white" stroke-opacity=".3" stroke-width="1.5"/>`
  ).join('')

  // Cross-facets: outer vertices → adjacent inner vertices
  const cross = pts.map((p, i) =>
    `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${innerPts[i].x.toFixed(1)}" y2="${innerPts[i].y.toFixed(1)}" stroke="white" stroke-opacity=".2" stroke-width="1"/>`
  ).join('')

  // Bright center gem
  const core = `<circle class="ac" cx="${cx}" cy="${cy}" r="6" fill="white" fill-opacity=".3"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="white" fill-opacity=".8"/>`

  return `<svg class="${status}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${animCSS(status)}${gradientDef(from, to, `c${h}`)}${outer}${inner}${facets}${cross}${core}</svg>`
}

// ── D. Flowing Energy ──
// Bold sinusoidal ribbons with visible particles

function generateFlowing(name: string, from: string, to: string, status: string): string {
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
    waves += `<path class="aw" d="${d}" fill="none" stroke="white" stroke-opacity="${op}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"/>`
  }

  // Flowing particles
  const dots = Array.from({ length: 6 + (h % 4) }, (_, i) => {
    const x = hrand(h, i + 50) * 80 + 10
    const y = hrand(h, i + 60) * 80 + 10
    const r = 2 + hrand(h, i + 70) * 4
    return `<circle class="ap" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="white" fill-opacity=".4"/>`
  }).join('')

  return `<svg class="${status}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${animCSS(status)}${gradientDef(from, to, `f${h}`)}${waves}${dots}</svg>`
}

// ── E. Aura Totem ──
// Bold concentric rings + radial petals + bright core mandala

function generateAura(name: string, from: string, to: string, status: string): string {
  const h = hashName(name)
  const cx = 50, cy = 50

  // Concentric rings (bold, visible)
  const rn = 3 + (h % 2)
  const rings = Array.from({ length: rn }, (_, i) => {
    const r = 14 + i * (30 / rn)
    const sw = 2 + hrand(h, i) * 1.5
    const op = (0.2 + (rn - i) * 0.12).toFixed(2)
    return `<circle class="ar" cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="white" stroke-opacity="${op}" stroke-width="${sw.toFixed(1)}" style="animation-delay:${(i * 0.7).toFixed(1)}s"/>`
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
    return `<ellipse class="at" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6" ry="3.5" transform="rotate(${(a * 180 / Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="white" fill-opacity=".3"/>`
  }).join('')

  // Bright core
  const core = `<circle class="ac" cx="${cx}" cy="${cy}" r="8" fill="white" fill-opacity=".25"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="white" fill-opacity=".8"/>`

  return `<svg class="${status}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${animCSS(status)}${gradientDef(from, to, `a${h}`)}${rings}${rays}${petals}${core}</svg>`
}

// ── Public API ──

const GENERATORS: Record<Exclude<AvatarStyle, 'fallback'>, (name: string, from: string, to: string, status: string) => string> = {
  geometric: generateGeometric,
  organic: generateOrganic,
  crystal: generateCrystal,
  flowing: generateFlowing,
  aura: generateAura,
}

/** Returns SVG string with status-driven style, or null for fallback (letter+gradient). */
export function generateAvatarSvg(
  name: string,
  from: string,
  to: string,
  status?: string,
): string | null {
  const style = styleForStatus(status)
  if (style === 'fallback') return null
  return GENERATORS[style](name, from, to, status ?? 'idle')
}
