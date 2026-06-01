/**
 * GuidePage — friendly first-run onboarding wizard
 *
 * Shown once on first launch. Walks the user through:
 *   language → appearance → AI model provider → remote access → WeChat
 *
 * The AI-model step embeds the shared LoginSelector and ApiSetup
 * components (the same components SetupPage uses) so we don't fork
 * the provider / OAuth flows. Anything that needs the full SetupPage
 * surface (Claude OAuth browser dance, device-code flow, etc.) is
 * delegated by handing the user off to view='setup' with a return
 * marker, then restoring the wizard on the way back in.
 *
 * The wizard owns its own copy of every text string (see
 * GuidePage.i18n.ts) so it stays decoupled from the global i18n
 * stack and can be evolved independently.
 */
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAppStore } from '../stores/app.store'
import { api } from '../api'
import { HaloLogo } from '../components/brand/HaloLogo'
import { Globe, Sun, Moon, Monitor, Wifi, MessageCircle, Brain, ArrowRight, Check, ChevronLeft, Plus, Key, ChevronRight, Edit2, Trash2, LogOut, Loader2 } from 'lucide-react'
import { useGuideI18n, GUIDE_LANGUAGES } from './GuidePage.i18n'
import { LoginSelector, type AuthProviderConfig } from '../components/setup/LoginSelector'
import { ApiSetup } from '../components/setup/ApiSetup'
import { ProviderSelector } from '../components/settings/ProviderSelector'
import { hasAnyAISource, type AISourcesConfig, type AISource } from '../types'
import { resolveLocalizedText } from '../../shared/types'
import type { AppView } from '../types'

// ── Types ────────────────────────────────────────────────────────

type GuideStep = 'welcome' | 'language' | 'appearance' | 'aiModel' | 'remote' | 'wechat' | 'done'

type Appearance = 'system' | 'light' | 'dark'

/**
 * Sub-state of the AI model step. Mirrors the same branching SetupPage
 * uses so we reuse the same components unchanged.
 */
type AIModelSubStep = 'select' | 'custom' | 'preset'

const APPEARANCES: { value: Appearance; icon: typeof Sun; labelKey: 'appearanceSystem' | 'appearanceLight' | 'appearanceDark' }[] = [
  { value: 'system', icon: Monitor, labelKey: 'appearanceSystem' },
  { value: 'light', icon: Sun, labelKey: 'appearanceLight' },
  { value: 'dark', icon: Moon, labelKey: 'appearanceDark' },
]

// ── Component ────────────────────────────────────────────────────

const STEPS: GuideStep[] = ['welcome', 'language', 'appearance', 'aiModel', 'remote', 'wechat', 'done']

const ICON_MAP: Record<string, typeof Brain> = {
  'log-in': ArrowRight,
  'user': MessageCircle,
  'globe': Globe,
  'key': Brain,
  'key-round': Brain,
  'cloud': Monitor,
  'server': Monitor,
  'shield': Monitor,
  'lock': Monitor,
  'zap': Brain,
  'message-square': MessageCircle,
  'wrench': Sun,
  'github': Monitor,
  'brain': Brain
}

function AIModelStep({
  t,
  lang,
  aiSubStep,
  presetProvider,
  aiSourceConfigured,
  goBack,
  goNext,
  handleSelectCustom,
  handleSelectPreset,
  handleBackFromCustomOrPreset,
  setView,
  aiSources,
  setAiSourceConfigured,
  refreshConfig,
}: {
  t: ReturnType<typeof useGuideI18n>['t']
  lang: ReturnType<typeof useGuideI18n>['lang']
  aiSubStep: AIModelSubStep
  presetProvider: AuthProviderConfig | null
  aiSourceConfigured: boolean
  goBack: () => void
  goNext: () => void
  handleSelectCustom: () => void
  handleSelectPreset: (provider: AuthProviderConfig) => void
  handleBackFromCustomOrPreset: () => void
  setView: (view: AppView) => void
  aiSources: AISourcesConfig
  setAiSourceConfigured: (configured: boolean) => void
  refreshConfig: () => void
}) {
  const [providers, setProviders] = useState<AuthProviderConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null)
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null)
  const [loggingOutSourceId, setLoggingOutSourceId] = useState<string | null>(null)

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const result = await api.authGetProviders()
        if (result.success && result.data) {
          setProviders(result.data as AuthProviderConfig[])
        }
      } catch {
        // Keep empty or show fallback
      }
      setIsLoading(false)
    }
    fetchProviders()
  }, [])

  const getIcon = (iconName: string) => ICON_MAP[iconName] || Brain

  const handleSelectProviderItem = async (provider: AuthProviderConfig) => {
    if (provider.type === 'custom') {
      handleSelectCustom()
      return
    }
    if (provider.preset) {
      handleSelectPreset(provider)
      return
    }
    try {
      const result = await api.authStartLogin(provider.type)
      if (result.success) {
        try { sessionStorage.setItem('halo-guide-return', '1') } catch { /* ignore */ }
        setView('setup')
      }
    } catch {
      // Stay on the screen
    }
  }

  const handleSwitchSource = async (sourceId: string) => {
    const result = await api.aiSourcesSwitchSource(sourceId)
    if (result.success && result.data) {
      await refreshConfig()
      setAiSourceConfigured(true)
    }
  }

  const handleSaveSource = async (source: AISource) => {
    const existingIndex = aiSources.sources.findIndex(s => s.id === source.id)
    
    const saveResult = existingIndex >= 0
      ? await api.aiSourcesUpdateSource(source.id, source)
      : await api.aiSourcesAddSource(source)

    if (!saveResult.success) {
      console.error('[AIModelStep] Failed to save source:', saveResult.error)
      return
    }

    const switchResult = await api.aiSourcesSwitchSource(source.id)
    if (switchResult.success && switchResult.data) {
      await refreshConfig()
      setAiSourceConfigured(true)
    }

    setShowAddForm(false)
    setEditingSourceId(null)
  }

  const handleDeleteSource = async (sourceId: string) => {
    const result = await api.aiSourcesDeleteSource(sourceId)
    if (result.success && result.data) {
      await refreshConfig()
      const newConfig = result.data as AISourcesConfig
      setAiSourceConfigured(hasAnyAISource(newConfig))
    }
    setDeletingSourceId(null)
    setExpandedSourceId(null)
  }

  const handleOAuthLogout = async (sourceId: string) => {
    setLoggingOutSourceId(sourceId)
    try {
      const result = await api.authLogout(sourceId)
      if (result.success) {
        await handleDeleteSource(sourceId)
      }
    } catch {
      // Stay on screen
    }
    setLoggingOutSourceId(null)
  }

  const isOAuthSource = (source: AISource) => {
    return source.authType === 'oauth'
  }

  const renderSourceCard = (source: AISource) => {
    const isCurrent = source.id === aiSources.currentId
    const isExpanded = expandedSourceId === source.id
    const isOAuth = isOAuthSource(source)

    return (
      <div
        key={source.id}
        className={`border rounded-xl transition-all ${
          isCurrent
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card'
        }`}
      >
        <div
          className="flex items-center gap-3 p-4 cursor-pointer"
          onClick={() => setExpandedSourceId(isExpanded ? null : source.id)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!isCurrent) handleSwitchSource(source.id)
            }}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              isCurrent
                ? 'border-primary bg-primary'
                : 'border-border hover:border-primary'
            }`}
          >
            {isCurrent && <Check className="w-3 h-3 text-white" />}
          </button>

          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isCurrent ? 'bg-primary/20' : 'bg-muted'
          }`}>
            {isOAuth ? (
              <Globe className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Key className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">{source.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {source.model || (lang === 'zh-CN' ? '未选择模型' : 'No model selected')}
            </div>
          </div>

          {isOAuth && source.user?.name && (
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
              {source.user.name}
            </span>
          )}

          <ChevronRight
            className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-border">
            <div className="pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{lang === 'zh-CN' ? '提供商' : 'Provider'}</span>
                <span className="text-foreground">{source.provider}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{lang === 'zh-CN' ? '认证类型' : 'Auth Type'}</span>
                <span className="text-foreground">
                  {isOAuth ? 'OAuth' : (lang === 'zh-CN' ? 'API 密钥' : 'API Key')}
                </span>
              </div>

              {!isOAuth && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{lang === 'zh-CN' ? 'API 地址' : 'API URL'}</span>
                  <span className="text-foreground truncate max-w-[200px]">
                    {source.apiUrl}
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {isOAuth ? (
                  <button
                    onClick={() => handleOAuthLogout(source.id)}
                    disabled={loggingOutSourceId === source.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-500
                             bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors"
                  >
                    {loggingOutSourceId === source.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <LogOut className="w-3 h-3" />
                    )}
                    {lang === 'zh-CN' ? '退出登录' : 'Logout'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingSourceId(source.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground
                               bg-muted hover:bg-muted/80 rounded-md transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      {lang === 'zh-CN' ? '编辑' : 'Edit'}
                    </button>
                    <button
                      onClick={() => setDeletingSourceId(source.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-500
                               bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {lang === 'zh-CN' ? '删除' : 'Delete'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const availablePresetProviders = providers.filter(provider => {
    if (!provider.preset) return false
    return !aiSources.sources.some(
      s => s.isPreset === true && s.apiUrl === provider.preset!.baseUrl
    )
  })

  const availableOAuthProviders = providers.filter(provider => {
    if (provider.preset) return false
    return !aiSources.sources.some(s => s.provider === provider.type)
  })

  const renderProviderButton = (
    provider: AuthProviderConfig,
    onClick: () => void
  ) => {
    const Icon = getIcon(provider.icon)
    const displayName = resolveLocalizedText(provider.displayName, lang)
    const description = resolveLocalizedText(provider.description, lang)
    return (
      <button
        key={provider.type}
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all text-left"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: provider.iconBgColor }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground">{displayName}</div>
          <div className="text-xs text-muted-foreground truncate">{description}</div>
        </div>
      </button>
    )
  }

  if (aiSubStep === 'custom' || showAddForm) {
    return (
      <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)]">
        <div className="shrink-0">
          <Brain className="w-10 h-10 text-primary mb-4" />
          <h2 className="text-2xl font-semibold mb-2">{t.aiModelStepTitle}</h2>
          <p className="text-muted-foreground">{t.aiModelStepSubtitle}</p>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <ProviderSelector
            aiSources={aiSources}
            onSave={handleSaveSource}
            onCancel={() => {
              setShowAddForm(false)
              handleBackFromCustomOrPreset()
            }}
            presetProvider={presetProvider ?? undefined}
          />
        </div>
      </div>
    )
  }

  if (aiSubStep === 'preset' && presetProvider) {
    return (
      <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)]">
        <div className="shrink-0">
          <Brain className="w-10 h-10 text-primary mb-4" />
          <h2 className="text-2xl font-semibold mb-2">{t.aiModelStepTitle}</h2>
          <p className="text-muted-foreground">{t.aiModelStepSubtitle}</p>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <ProviderSelector
            aiSources={aiSources}
            onSave={handleSaveSource}
            onCancel={() => {
              handleBackFromCustomOrPreset()
            }}
            presetProvider={presetProvider}
          />
        </div>
      </div>
    )
  }

  if (editingSourceId) {
    const editingSource = aiSources.sources.find(s => s.id === editingSourceId)
    return (
      <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)]">
        <div className="shrink-0">
          <Brain className="w-10 h-10 text-primary mb-4" />
          <h2 className="text-2xl font-semibold mb-2">{t.aiModelStepTitle}</h2>
          <p className="text-muted-foreground">{t.aiModelStepSubtitle}</p>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <ProviderSelector
            aiSources={aiSources}
            onSave={handleSaveSource}
            onCancel={() => setEditingSourceId(null)}
            editingSourceId={editingSourceId}
          />
        </div>
      </div>
    )
  }

  if (deletingSourceId) {
    const sourceToDelete = aiSources.sources.find(s => s.id === deletingSourceId)
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Brain className="w-10 h-10 text-primary mb-4" />
          <h2 className="text-2xl font-semibold mb-2">{t.aiModelStepTitle}</h2>
          <p className="text-muted-foreground">{t.aiModelStepSubtitle}</p>
        </div>
        <div className="p-4 bg-card rounded-xl border border-border space-y-4">
          <h3 className="font-medium text-foreground">
            {lang === 'zh-CN' ? '确认删除' : 'Confirm Delete'}
          </h3>
          <p className="text-muted-foreground">
            {lang === 'zh-CN' ? '确定要删除' : 'Are you sure you want to delete'} <strong>{sourceToDelete?.name}</strong>?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeletingSourceId(null)}
              className="flex-1 px-4 py-2 text-muted-foreground hover:bg-muted rounded-md"
            >
              {lang === 'zh-CN' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={() => handleDeleteSource(deletingSourceId)}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              {lang === 'zh-CN' ? '删除' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Brain className="w-10 h-10 text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t.aiModelStepTitle}</h2>
        <p className="text-muted-foreground">{t.aiModelStepSubtitle}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {aiSources.sources.length > 0 && (
            <div className="space-y-2">
              {aiSources.sources.map(renderSourceCard)}
            </div>
          )}

          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed
                     border-border hover:border-primary text-muted-foreground hover:text-primary
                     rounded-xl transition-colors"
          >
            <Plus size={18} />
            {lang === 'zh-CN' ? '添加 AI 提供商' : 'Add AI Provider'}
          </button>

          {(availablePresetProviders.length > 0 || availableOAuthProviders.length > 0) && (
            <div className="pt-4 border-t border-border space-y-4">
              {availablePresetProviders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    {lang === 'zh-CN' ? '预设 API' : 'Preset API'}
                  </h4>
                  <div className="space-y-2">
                    {availablePresetProviders.map(provider =>
                      renderProviderButton(provider, () => handleSelectPreset(provider))
                    )}
                  </div>
                </div>
              )}
              {availableOAuthProviders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    {lang === 'zh-CN' ? 'OAuth 登录' : 'OAuth Login'}
                  </h4>
                  <div className="space-y-2">
                    {availableOAuthProviders.map(provider =>
                      renderProviderButton(provider, () => handleSelectProviderItem(provider))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <button
              onClick={goBack}
              className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> {t.back}
            </button>
            <button
              onClick={goNext}
              disabled={!aiSourceConfigured}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium ml-auto hover:opacity-90 disabled:opacity-50"
            >
              {t.next} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function GuidePage() {
  const { setView, updateConfig, config } = useAppStore()
  const { t, lang, setLang } = useGuideI18n()
  const [step, setStep] = useState<GuideStep>('welcome')
  const [appearance, setAppearance] = useState<Appearance>('system')
  const [remoteEnabled, setRemoteEnabled] = useState(false)
  const [wechatEnabled, setWechatEnabled] = useState(false)
  const [saving, setSaving] = useState(false)

  // AI model sub-state. We mirror the same shape as SetupPage so the
  // shared LoginSelector / ApiSetup components can be embedded directly.
  const [aiSubStep, setAiSubStep] = useState<AIModelSubStep>('select')
  const [presetProvider, setPresetProvider] = useState<AuthProviderConfig | null>(null)
  // True once the user has wired up at least one AI source during this
  // wizard run. Decides whether the "Next" button on the aiModel step
  // is enabled.
  const aiSourceConfigured = useMemo(() => {
    return config?.aiSources ? hasAnyAISource(config.aiSources) : false
  }, [config?.aiSources])
  const [, setAiSourceConfigured] = useState(false) // 保留以便后面调用更新

  const handleSetAppearance = useCallback((value: Appearance) => {
    setAppearance(value)
    updateConfig({ appearance: { theme: value } })
  }, [])

  const goNext = useCallback(() => {
    setStep(prev => {
      const idx = STEPS.indexOf(prev)
      return STEPS[Math.min(idx + 1, STEPS.length - 1)]
    })
  }, [])

  const goBack = useCallback(() => {
    setStep(prev => {
      const idx = STEPS.indexOf(prev)
      // Don't step back into aiModel sub-flows; collapse them onto aiModel.
      if (aiSubStep !== 'select' && prev === 'aiModel') {
        setAiSubStep('select')
        return 'aiModel'
      }
      return STEPS[Math.max(idx - 1, 0)]
    })
  }, [aiSubStep])

  const handleSelectProvider = useCallback(async (providerType: string) => {
    // OAuth providers (e.g. claude) require the full SetupPage flow with
    // its browser window + polling logic. Hand off there, then resume the
    // wizard on the way back in.
    try {
      const result = await api.authStartLogin(providerType)
      if (result.success) {
        // Mark we left mid-wizard so we can come back here.
        try { sessionStorage.setItem('halo-guide-return', '1') } catch { /* ignore */ }
        setView('setup')
      }
    } catch {
      // Stay on the screen; the user can retry.
    }
  }, [setView])

  const handleSelectCustom = useCallback(() => {
    setAiSubStep('custom')
  }, [])

  const handleSelectPreset = useCallback((provider: AuthProviderConfig) => {
    setPresetProvider(provider)
    setAiSubStep('preset')
  }, [])

  const handleBackFromCustomOrPreset = useCallback(() => {
    setAiSubStep('select')
    setPresetProvider(null)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await api.setConfig({
        appearance: { theme: appearance },
        isFirstLaunch: false,
      })

      // Sync store so App.tsx early return stops intercepting
      updateConfig({ isFirstLaunch: false })
    } catch {
      // Continue even if save fails — user can configure later
    }
    setSaving(false)

    // Stay on done step so user sees the success message
    // The "Get Started" button on done step advances to home
    setStep('done')
  }, [appearance])

  const handleGetStarted = () => {
    setView('setup')
  }

  // ── Step renderers ────────────────────────────────────────────

  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <HaloLogo size={80} />
      <div>
        <h1 className="text-3xl font-bold mb-2">{t.welcomeTitle}</h1>
        <p className="text-muted-foreground text-lg">{t.welcomeSubtitle}</p>
      </div>
      <button
        onClick={goNext}
        className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
      >
        {t.welcomeButton} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )

  const renderLanguage = () => (
    <div className="flex flex-col gap-8">
      <div>
        <Globe className="w-10 h-10 text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t.languageStepTitle}</h2>
        <p className="text-muted-foreground">{t.languageStepSubtitle}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {GUIDE_LANGUAGES.map(l => (
          <button
            key={l.value}
            onClick={() => setLang(l.value)}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left
              ${lang === l.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30 bg-card'}`}
          >
            <span className="font-medium">{l.native}</span>
            {lang === l.value && <Check className="w-4 h-4 text-primary" />}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={goBack} className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> {t.back}
        </button>
        <button onClick={goNext} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium ml-auto hover:opacity-90">
          {t.next} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  const renderAppearance = () => (
    <div className="flex flex-col gap-8">
      <div>
        <Sun className="w-10 h-10 text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t.appearanceStepTitle}</h2>
        <p className="text-muted-foreground">{t.appearanceStepSubtitle}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {APPEARANCES.map(a => {
          const Icon = a.icon
          return (
            <button
              key={a.value}
              onClick={() => handleSetAppearance(a.value)}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all
                ${appearance === a.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30 bg-card'}`}
            >
              <Icon className={`w-8 h-8 ${appearance === a.value ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="font-medium text-sm">{t[a.labelKey]}</span>
              {appearance === a.value && <Check className="w-4 h-4 text-primary" />}
            </button>
          )
        })}
      </div>
      <div className="flex gap-3">
        <button onClick={goBack} className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> {t.back}
        </button>
        <button onClick={goNext} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium ml-auto hover:opacity-90">
          {t.next} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  const aiSources = config?.aiSources || {
    version: 2,
    currentId: null,
    sources: []
  }

  const refreshConfig = useCallback(async () => {
    const result = await api.getConfig()
    if (result.success && result.data) {
      updateConfig(result.data)
    }
  }, [updateConfig])

  const renderAIModel = () => (
    <AIModelStep
      t={t}
      lang={lang}
      aiSubStep={aiSubStep}
      presetProvider={presetProvider}
      aiSourceConfigured={aiSourceConfigured}
      goBack={goBack}
      goNext={goNext}
      handleSelectCustom={handleSelectCustom}
      handleSelectPreset={handleSelectPreset}
      handleBackFromCustomOrPreset={handleBackFromCustomOrPreset}
      setView={setView}
      aiSources={aiSources}
      setAiSourceConfigured={setAiSourceConfigured}
      refreshConfig={refreshConfig}
    />
  )

  const renderRemote = () => (
    <div className="flex flex-col gap-8">
      <div>
        <Wifi className="w-10 h-10 text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t.remoteStepTitle}</h2>
        <p className="text-muted-foreground">{t.remoteStepSubtitle}</p>
      </div>
      <div className="space-y-3">
        <button
          onClick={() => setRemoteEnabled(true)}
          className={`w-full flex items-center justify-between p-5 rounded-xl border-2 transition-all text-left
            ${remoteEnabled ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 bg-card'}`}
        >
          <div>
            <div className="font-medium mb-1">{t.remoteEnableTitle}</div>
            <div className="text-sm text-muted-foreground">{t.remoteEnableDescription}</div>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${remoteEnabled ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
            {remoteEnabled && <Check className="w-3 h-3 text-primary-foreground" />}
          </div>
        </button>
        <button
          onClick={() => setRemoteEnabled(false)}
          className={`w-full flex items-center p-5 rounded-xl border-2 transition-all text-left
            ${!remoteEnabled ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 bg-card'}`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!remoteEnabled ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
              {!remoteEnabled && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            <span className="font-medium">{t.remoteSkipOption}</span>
          </div>
        </button>
      </div>
      <div className="flex gap-3">
        <button onClick={goBack} className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> {t.back}
        </button>
        <button onClick={goNext} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium ml-auto hover:opacity-90">
          {t.next} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  const renderWechat = () => (
    <div className="flex flex-col gap-8">
      <div>
        <MessageCircle className="w-10 h-10 text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t.wechatStepTitle}</h2>
        <p className="text-muted-foreground">{t.wechatStepSubtitle}</p>
      </div>
      <div className="space-y-3">
        <button
          onClick={() => setWechatEnabled(true)}
          className={`w-full flex items-center justify-between p-5 rounded-xl border-2 transition-all text-left
            ${wechatEnabled ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 bg-card'}`}
        >
          <div>
            <div className="font-medium mb-1">{t.wechatEnableTitle}</div>
            <div className="text-sm text-muted-foreground">{t.wechatEnableDescription}</div>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${wechatEnabled ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
            {wechatEnabled && <Check className="w-3 h-3 text-primary-foreground" />}
          </div>
        </button>
        <button
          onClick={() => setWechatEnabled(false)}
          className={`w-full flex items-center p-5 rounded-xl border-2 transition-all text-left
            ${!wechatEnabled ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 bg-card'}`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!wechatEnabled ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
              {!wechatEnabled && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            <span className="font-medium">{t.wechatSkipOption}</span>
          </div>
        </button>
      </div>
      <div className="flex gap-3">
        <button onClick={goBack} className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> {t.back}
        </button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium ml-auto hover:opacity-90 disabled:opacity-50">
          {saving ? t.wechatSaving : t.wechatSaveButton} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  const renderDone = () => (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Check className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.doneTitle}</h2>
        <p className="text-muted-foreground text-lg">{t.doneSubtitle}</p>
      </div>
      <button
        onClick={handleGetStarted}
        className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
      >
        {t.doneButton} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )

  // ── Step content ──────────────────────────────────────────────

  const stepContent: Record<GuideStep, () => JSX.Element> = {
    welcome: renderWelcome,
    language: renderLanguage,
    appearance: renderAppearance,
    aiModel: renderAIModel,
    remote: renderRemote,
    wechat: renderWechat,
    done: renderDone,
  }

  // ── Progress dots ─────────────────────────────────────────────

  return (
    <div className="h-full w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-lg px-6 py-12">
        {/* Progress */}
        {step !== 'welcome' && step !== 'done' && (
          <div className="flex items-center justify-center gap-1.5 mb-12">
            {STEPS.slice(1, -1).map(s => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all ${
                  step === s ? 'w-6 bg-primary' :
                  STEPS.indexOf(step) > STEPS.indexOf(s) ? 'w-3 bg-primary/40' :
                  'w-3 bg-muted'
                }`}
              />
            ))}
          </div>
        )}

        {stepContent[step]()}
      </div>
    </div>
  )
}
