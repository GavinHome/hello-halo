import { beforeEach, describe, expect, it, vi } from 'vitest'

const env = vi.hoisted(() => ({ runner: null as any, target: {} as any, app: {} as any, mobile: false, chat: {} as any, api: {} as any }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: any) => env.runner.state(initial),
  useRef: (initial: any) => env.runner.ref(initial),
  useEffect: () => {},
}))
vi.mock('../../../src/renderer/stores/app.store', () => ({ useAppStore: (select?: any) => select ? select(env.app) : env.app }))
vi.mock('../../../src/renderer/stores/apps.store', () => ({ useAppsStore: (select: any) => select({ apps: [{ id: 'person', userOverrides: {} }] }) }))
vi.mock('../../../src/renderer/stores/chat.store', () => ({ useChatStore: Object.assign((select: any) => select(env.chat), { getState: () => env.chat }) }))
vi.mock('../../../src/renderer/hooks/useActiveModelTarget', () => ({ useActiveModelTarget: () => env.target }))
vi.mock('../../../src/renderer/hooks/useIsMobile', () => ({ useIsMobile: () => env.mobile }))
vi.mock('../../../src/renderer/utils/people-navigation', () => ({ openPersonModelSettings: vi.fn() }))
vi.mock('../../../src/renderer/services/home-telemetry', () => ({ trackHome: vi.fn() }))
vi.mock('../../../src/renderer/components/ai-config/ThinkingLevelControl', () => ({ ThinkingLevelControl: () => null }))
vi.mock('../../../src/renderer/i18n', () => ({ useTranslation: () => ({ t: (text: string) => text }) }))
vi.mock('../../../src/renderer/api', () => ({ api: env.api }))

import { ModelSelector, ModelSelectSheet } from '../../../src/renderer/components/ai-config/ModelSelector'
import { openPersonModelSettings } from '../../../src/renderer/utils/people-navigation'

class Runner {
  values: any[] = []
  index = 0
  state(initial: any) {
    const index = this.index++
    if (!(index in this.values)) this.values[index] = typeof initial === 'function' ? initial() : initial
    return [this.values[index], (value: any) => { this.values[index] = typeof value === 'function' ? value(this.values[index]) : value }]
  }
  ref(initial: any) { const index = this.index++; this.values[index] ??= { current: initial }; return this.values[index] }
  render(component: () => any) { this.index = 0; env.runner = this; return component() }
}
const nodes = (tree: any): any[] => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree)
  ? tree.flatMap(nodes) : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)]
const text = (tree: any): string => typeof tree === 'string' ? tree : !tree || typeof tree !== 'object' ? ''
  : Array.isArray(tree) ? tree.map(text).join(' ') : [tree.props?.children].flat(Infinity).map(text).join(' ')
const button = (tree: any, label: string) => nodes(tree).find(node => node.type === 'button' && text(node).includes(label))
const source = { id: 'b', name: 'Global account B', model: 'b-model', provider: 'custom', availableModels: [{ id: 'b-model', name: 'Global model B', supportsVision: true, capabilities: { contextWindow: 1000000 } }] }

beforeEach(() => {
  env.app = { config: { aiSources: { version: 2, currentId: 'b', sources: [source] } }, navigate: vi.fn(), setConfig: vi.fn() }
  env.target = { kind: 'conversation', conversationId: 'c', conversation: { id: 'c', modelSourceId: 'removed', modelId: 'old-model' } }
  env.chat = { currentSpaceId: 's', setConversationModel: vi.fn().mockResolvedValue(undefined) }
  Object.assign(env.api, { aiSourcesSwitchSource: vi.fn().mockResolvedValue({ success: true, data: env.app.config.aiSources }), aiSourcesSetModel: vi.fn().mockResolvedValue({ success: true, data: env.app.config.aiSources }) })
  env.mobile = false
  vi.mocked(openPersonModelSettings).mockClear()
})

function selector() {
  const runner = new Runner()
  const render = () => runner.render(() => { const outer = ModelSelector(); return (outer.type as any)(outer.props) })
  return { runner, render }
}

function child(tree: any, name: string) {
  const element = nodes(tree).find(node => typeof node.type === 'function' && node.type.name === name)
  return new Runner().render(() => element.type(element.props))
}

/** The checked model row of a rendered ModelList. */
const checkedRow = (list: any) => nodes(list).find(node => node.type === 'button' && nodes(node).some(child => child.type?.displayName === 'Check'))

describe('model selector for a conversation whose pinned account was removed', () => {
  it.each([false, true])('shows the global account and model the conversation now runs on (mobile=%s)', mobile => {
    env.mobile = mobile
    const { render } = selector()
    let tree = render()
    expect(nodes(tree).find(node => node.type === 'button')?.props['aria-label']).toBe('Global model B')
    nodes(tree).find(node => node.type === 'button').props.onClick()
    tree = render()
    if (mobile) {
      const sheet = child(tree, 'ModelSelectSheet')
      expect(text(sheet)).toContain('Global model B')
      expect(text(checkedRow(child(sheet, 'ModelList')))).toContain('Global model B')
    } else {
      const card = child(tree, 'CurrentModelCard')
      expect(text(card)).toContain('Global model B')
      expect(text(card)).toContain('Global account B')
      expect(text(card)).toContain('Context window')
    }
    expect(text(tree)).not.toContain('Account removed')
    expect(text(tree)).not.toContain('old-model')
    expect(env.chat.setConversationModel).not.toHaveBeenCalled()
  })

  it('checks the global model in the list and pins a chosen model to the conversation', async () => {
    const { render } = selector()
    nodes(render()).find(node => node.type === 'button').props.onClick()
    button(child(render(), 'CurrentModelCard'), 'Global model B').props.onClick()
    const list = child(render(), 'ModelList')
    expect(text(checkedRow(list))).toContain('Global model B')
    await button(list, 'Global model B').props.onClick()
    expect(env.chat.setConversationModel).toHaveBeenCalledWith('s', 'c', 'b', 'b-model')
  })

  it('offers configuration after the last source is removed', () => {
    env.app.config.aiSources = { version: 2, currentId: null, sources: [] }
    const { render } = selector()
    nodes(render()).find(node => node.type === 'button').props.onClick()
    const card = child(render(), 'CurrentModelCard')
    expect(text(card)).toContain('No AI sources configured')
    button(card, 'Configure AI Source').props.onClick()
    expect(env.app.navigate).toHaveBeenCalledWith('settings')
    const sheet = new Runner().render(() => ModelSelectSheet({ onClose: vi.fn() }))
    expect(text(child(sheet, 'ModelList'))).toContain('Configure AI Source')
  })

  it('shows a digital human the global model it now runs on and directs changes to its settings', () => {
    env.target = { kind: 'digital-human', appId: 'person', appName: 'Person', modelSourceId: 'removed', modelId: 'old-model' }
    const { render } = selector()
    nodes(render()).find(node => node.type === 'button').props.onClick()
    const tree = render()
    expect(text(tree)).toContain('Global model B')
    expect(text(tree)).not.toContain('Account removed')
    button(tree, 'Change in its settings').props.onClick()
    expect(openPersonModelSettings).toHaveBeenCalledWith('person')
  })
})

describe('current-model card with per-model settings', () => {
  it('shows the user\'s per-model settings over the catalog, and ignores a malformed one', () => {
    env.target = { kind: 'conversation', conversationId: 'c', conversation: { id: 'c' } }
    env.app.config.aiSources.sources = [{ ...source, modelOverrides: { 'b-model': { contextWindow: 870000, vision: false } } }]
    const { render } = selector()
    nodes(render()).find(node => node.type === 'button').props.onClick()
    let card = text(child(render(), 'CurrentModelCard'))
    expect(card).toContain('870K')
    expect(card).toContain('Not supported')
    env.app.config.aiSources.sources = [{ ...source, modelOverrides: { 'b-model': { contextWindow: -1 } } }]
    card = text(child(render(), 'CurrentModelCard'))
    expect(card).toContain('1M')
    expect(card).toContain('Supported')
  })
})
