/**
 * GuidePage — friendly first-run onboarding wizard
 *
 * Shown once on first launch, BEFORE the AI source setup.
 * Walk the user through simple choices: language, appearance, remote access, WeChat.
 * No technical jargon. Pure conversation-like flow.
 */
import { useState, useCallback } from 'react'
import { useAppStore } from '../stores/app.store'
import { api } from '../api'
import { HaloLogo } from '../components/brand/HaloLogo'
import { Globe, Sun, Moon, Monitor, Wifi, MessageCircle, ArrowRight, Check, ChevronLeft } from 'lucide-react'
import { useGuideI18n, GUIDE_LANGUAGES } from './GuidePage.i18n'

// ── Types ────────────────────────────────────────────────────────

type GuideStep = 'welcome' | 'language' | 'appearance' | 'remote' | 'wechat' | 'done'

type Appearance = 'system' | 'light' | 'dark'

const APPEARANCES: { value: Appearance; icon: typeof Sun; labelKey: 'appearanceSystem' | 'appearanceLight' | 'appearanceDark' }[] = [
  { value: 'system', icon: Monitor, labelKey: 'appearanceSystem' },
  { value: 'light', icon: Sun, labelKey: 'appearanceLight' },
  { value: 'dark', icon: Moon, labelKey: 'appearanceDark' },
]

// ── Component ────────────────────────────────────────────────────

export function GuidePage() {
  const { setView, updateConfig } = useAppStore()
  const { t, lang, setLang } = useGuideI18n()
  const [step, setStep] = useState<GuideStep>('welcome')
  const [appearance, setAppearance] = useState<Appearance>('system')
  const [remoteEnabled, setRemoteEnabled] = useState(false)
  const [wechatEnabled, setWechatEnabled] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSetAppearance = useCallback((value: Appearance) => {
    setAppearance(value)
    updateConfig({ appearance: { theme: value } })
  }, [])

  const goNext = useCallback(() => {
    setStep(prev => {
      const order: GuideStep[] = ['welcome', 'language', 'appearance', 'remote', 'wechat', 'done']
      const idx = order.indexOf(prev)
      return order[Math.min(idx + 1, order.length - 1)]
    })
  }, [])

  const goBack = useCallback(() => {
    setStep(prev => {
      const order: GuideStep[] = ['welcome', 'language', 'appearance', 'remote', 'wechat', 'done']
      const idx = order.indexOf(prev)
      return order[Math.max(idx - 1, 0)]
    })
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
    // The "Get Started" button on done step advances to setup
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
    remote: renderRemote,
    wechat: renderWechat,
    done: renderDone,
  }

  // ── Progress dots ─────────────────────────────────────────────

  const steps: GuideStep[] = ['welcome', 'language', 'appearance', 'remote', 'wechat', 'done']

  return (
    <div className="h-full w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-lg px-6 py-12">
        {/* Progress */}
        {step !== 'welcome' && step !== 'done' && (
          <div className="flex items-center justify-center gap-1.5 mb-12">
            {steps.slice(1, -1).map(s => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all ${
                  step === s ? 'w-6 bg-primary' :
                  steps.indexOf(step) > steps.indexOf(s) ? 'w-3 bg-primary/40' :
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
