/**
 * Scrollbars are hidden until the pointer is over their scroller (see the
 * `:hover` rules in globals.css), but the browser re-evaluates hover only when
 * the pointer moves, so scrolling with the wheel or trackpad under a still
 * pointer would leave the scrollbar hidden. This marks whatever the user
 * scrolls with `data-scrolling` for a moment after each scroll, which the
 * stylesheet treats like hover. Scrolls the app makes on its own (a chat
 * following a streamed reply) do not start a reveal.
 */

const VISIBLE_AFTER_SCROLL_MS = 1000
/** How long after wheel, touch or key input a scroll still counts as the user's. */
const USER_INPUT_WINDOW_MS = 300
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '])

export function initScrollbarReveal(): void {
  const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()
  let lastUserInput = -Infinity
  const noteUserInput = () => { lastUserInput = performance.now() }
  const options = { capture: true, passive: true }

  document.addEventListener('wheel', noteUserInput, options)
  document.addEventListener('touchmove', noteUserInput, options)
  document.addEventListener('keydown', (event) => {
    if (!SCROLL_KEYS.has(event.key)) return
    // Typing a space or moving the caret is not scrolling.
    const target = event.target
    if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select'))) return
    noteUserInput()
  }, options)

  document.addEventListener('scroll', (event) => {
    const el = event.target instanceof Element ? event.target : document.scrollingElement
    if (!el) return
    // A scroll already shown keeps showing through its momentum.
    const shown = el.hasAttribute('data-scrolling')
    if (!shown && performance.now() - lastUserInput > USER_INPUT_WINDOW_MS) return
    clearTimeout(timers.get(el))
    if (!shown) el.setAttribute('data-scrolling', '')
    timers.set(el, setTimeout(() => el.removeAttribute('data-scrolling'), VISIBLE_AFTER_SCROLL_MS))
  }, options)
}
