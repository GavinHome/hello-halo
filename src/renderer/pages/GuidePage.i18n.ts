/**
 * GuidePage — Independent i18n Module
 *
 * A self-contained, lightweight translation system for the first-run
 * onboarding wizard. Deliberately decoupled from the project's global
 * i18next stack so the wizard owns its own copy and lifecycle.
 *
 * Scope:
 * - Supports all 7 languages same as the main app.
 * - Exposes a tiny React hook (useGuideI18n) used only inside GuidePage.
 * - Persists the chosen language in its own localStorage key so the
 *   wizard is fully self-contained.
 * - Language changes are also propagated to the global i18n so the
 *   rest of the app stays in sync during the wizard flow.
 */

import { useCallback, useEffect, useState } from 'react'
import { setLanguage as setGlobalLanguage, type LocaleCode } from '../i18n'

type GuideLanguage = LocaleCode

interface GuideTranslations {
  welcomeTitle: string
  welcomeSubtitle: string
  welcomeButton: string
  languageStepTitle: string
  languageStepSubtitle: string
  appearanceStepTitle: string
  appearanceStepSubtitle: string
  appearanceSystem: string
  appearanceLight: string
  appearanceDark: string
  aiModelStepTitle: string
  aiModelStepSubtitle: string
  remoteStepTitle: string
  remoteStepSubtitle: string
  remoteEnableTitle: string
  remoteEnableDescription: string
  remoteSkipOption: string
  wechatStepTitle: string
  wechatStepSubtitle: string
  wechatEnableTitle: string
  wechatEnableDescription: string
  wechatSkipOption: string
  wechatSaveButton: string
  wechatSaving: string
  doneTitle: string
  doneSubtitle: string
  doneButton: string
  back: string
  next: string
  skip: string
}

const EN: GuideTranslations = {
  welcomeTitle: 'Welcome to Halo',
  welcomeSubtitle: 'Your AI assistant. Let us take a minute to set things up.',
  welcomeButton: 'Get Started',
  languageStepTitle: 'Choose your language',
  languageStepSubtitle: 'Choose your preferred language',
  appearanceStepTitle: 'Choose your appearance',
  appearanceStepSubtitle: 'Select your preferred display theme',
  appearanceSystem: 'System',
  appearanceLight: 'Light',
  appearanceDark: 'Dark',
  aiModelStepTitle: 'Set up your AI',
  aiModelStepSubtitle: 'Pick a model provider. You can change it anytime in Settings.',
  remoteStepTitle: 'Enable Remote Access',
  remoteStepSubtitle: 'Connect to Halo from your phone anytime, anywhere',
  remoteEnableTitle: 'Enable remote access',
  remoteEnableDescription: 'Using Cloudflare tunnel or local network connection',
  remoteSkipOption: 'Not now, maybe later',
  wechatStepTitle: 'Connect WeChat',
  wechatStepSubtitle: 'Send messages to Halo in WeChat and assign tasks from your phone',
  wechatEnableTitle: 'Connect WeCom bot',
  wechatEnableDescription: 'Scan to connect, then chat directly with Halo in WeChat',
  wechatSkipOption: 'Not now, maybe later',
  wechatSaveButton: 'Finish Setup',
  wechatSaving: 'Saving...',
  doneTitle: 'All set',
  doneSubtitle: 'Next, configure your AI model and start using Halo right away',
  doneButton: 'Start Using',
  back: 'Back',
  next: 'Next',
  skip: 'Skip for now',
}

const ZH_CN: GuideTranslations = {
  welcomeTitle: '欢迎使用 Halo',
  welcomeSubtitle: '您的智能助手,花一分钟完成初始设置',
  welcomeButton: '开始',
  languageStepTitle: '选择语言',
  languageStepSubtitle: '选择您偏好的语言',
  appearanceStepTitle: '选择外观',
  appearanceStepSubtitle: '选择您偏好的显示主题',
  appearanceSystem: '跟随系统',
  appearanceLight: '浅色',
  appearanceDark: '深色',
  aiModelStepTitle: '配置 AI 模型',
  aiModelStepSubtitle: '选择一个模型服务商,稍后可以在设置中修改。',
  remoteStepTitle: '开启远程访问',
  remoteStepSubtitle: '随时随地用手机连接 Halo',
  remoteEnableTitle: '开启远程访问',
  remoteEnableDescription: '通过 Cloudflare 隧道或局域网连接',
  remoteSkipOption: '暂不开启,稍后再说',
  wechatStepTitle: '连接微信',
  wechatStepSubtitle: '在微信中给 Halo 发消息,随时在手机上派发任务',
  wechatEnableTitle: '连接企业微信机器人',
  wechatEnableDescription: '扫码连接,即可在微信中与 Halo 对话',
  wechatSkipOption: '暂不开启,稍后再说',
  wechatSaveButton: '完成设置',
  wechatSaving: '保存中...',
  doneTitle: '一切就绪',
  doneSubtitle: '接下来配置您的 AI 模型,即可开始使用 Halo',
  doneButton: '开始使用',
  back: '上一步',
  next: '下一步',
  skip: '暂时跳过',
}

const ZH_TW: GuideTranslations = {
  welcomeTitle: '歡迎使用 Halo',
  welcomeSubtitle: '您的智慧助手,花一分鐘完成初始設定',
  welcomeButton: '開始',
  languageStepTitle: '選擇語言',
  languageStepSubtitle: '選擇您偏好的語言',
  appearanceStepTitle: '選擇外觀',
  appearanceStepSubtitle: '選擇您偏好的顯示主題',
  appearanceSystem: '跟隨系統',
  appearanceLight: '淺色',
  appearanceDark: '深色',
  aiModelStepTitle: '設定 AI 模型',
  aiModelStepSubtitle: '選擇一個模型服務商,稍後可以在設定中修改。',
  remoteStepTitle: '開啟遠端存取',
  remoteStepSubtitle: '隨時隨地用手機連接 Halo',
  remoteEnableTitle: '開啟遠端存取',
  remoteEnableDescription: '透過 Cloudflare 隧道或區域網路連線',
  remoteSkipOption: '暫不開啟,稍後再說',
  wechatStepTitle: '連接微信',
  wechatStepSubtitle: '在微信中給 Halo 發送訊息,隨時在手機上派發任務',
  wechatEnableTitle: '連接企業微信機器人',
  wechatEnableDescription: '掃碼連接,即可在微信中與 Halo 對話',
  wechatSkipOption: '暫不開啟,稍後再說',
  wechatSaveButton: '完成設定',
  wechatSaving: '儲存中...',
  doneTitle: '一切就緒',
  doneSubtitle: '接下來設定您的 AI 模型,即可開始使用 Halo',
  doneButton: '開始使用',
  back: '上一步',
  next: '下一步',
  skip: '暫時跳過',
}

const JA: GuideTranslations = {
  welcomeTitle: 'Haloへようこそ',
  welcomeSubtitle: 'AIアシスタントです。初期設定を始めましょう。',
  welcomeButton: '始める',
  languageStepTitle: '言語を選択',
  languageStepSubtitle: 'お好みの言語を選択してください',
  appearanceStepTitle: '外観を選択',
  appearanceStepSubtitle: 'お好みの表示テーマを選択してください',
  appearanceSystem: 'システム',
  appearanceLight: 'ライト',
  appearanceDark: 'ダーク',
  aiModelStepTitle: 'AIモデルを設定',
  aiModelStepSubtitle: 'モデルプロバイダーを選択してください。設定でいつでも変更できます。',
  remoteStepTitle: 'リモートアクセスを有効化',
  remoteStepSubtitle: 'いつでもどこからでもスマホでHaloに接続',
  remoteEnableTitle: 'リモートアクセスを有効化',
  remoteEnableDescription: 'Cloudflareトンネルまたはローカルネットワーク接続を使用',
  remoteSkipOption: '今はしない,また後で',
  wechatStepTitle: 'WeChatを接続',
  wechatStepSubtitle: 'WeChatでHaloにメッセージを送信,スマホでタスクを割り当て',
  wechatEnableTitle: 'WeComボットを接続',
  wechatEnableDescription: 'スキャンして接続,WeChatで直接Haloとチャット',
  wechatSkipOption: '今はしない,また後で',
  wechatSaveButton: '設定完了',
  wechatSaving: '保存中...',
  doneTitle: '準備完了',
  doneSubtitle: '次にAIモデルを設定して,Haloを使い始めましょう',
  doneButton: '使い始める',
  back: '戻る',
  next: '次へ',
  skip: '今はスキップ',
}

const DE: GuideTranslations = {
  welcomeTitle: 'Willkommen bei Halo',
  welcomeSubtitle: 'Ihr KI-Assistent. Lassen Sie uns kurz alles einrichten.',
  welcomeButton: 'Los geht\'s',
  languageStepTitle: 'Sprache wählen',
  languageStepSubtitle: 'Wählen Sie Ihre bevorzugte Sprache',
  appearanceStepTitle: 'Erscheinungsbild wählen',
  appearanceStepSubtitle: 'Wählen Sie Ihr bevorzugtes Anzeigethema',
  appearanceSystem: 'System',
  appearanceLight: 'Hell',
  appearanceDark: 'Dunkel',
  aiModelStepTitle: 'KI-Modell einrichten',
  aiModelStepSubtitle: 'Wählen Sie einen Modellanbieter. Sie können ihn jederzeit in den Einstellungen ändern.',
  remoteStepTitle: 'Fernzugriff aktivieren',
  remoteStepSubtitle: 'Verbinden Sie sich jederzeit und überall mit Halo von Ihrem Telefon',
  remoteEnableTitle: 'Fernzugriff aktivieren',
  remoteEnableDescription: 'Mit Cloudflare-Tunnel oder lokaler Netzwerkverbindung',
  remoteSkipOption: 'Nicht jetzt, vielleicht später',
  wechatStepTitle: 'WeChat verbinden',
  wechatStepSubtitle: 'Senden Sie Nachrichten an Halo in WeChat und weisen Sie Aufgaben von Ihrem Telefon zu',
  wechatEnableTitle: 'WeCom-Bot verbinden',
  wechatEnableDescription: 'Scannen zum Verbinden, dann direkt mit Halo in WeChat chatten',
  wechatSkipOption: 'Nicht jetzt, vielleicht später',
  wechatSaveButton: 'Einrichtung abschließen',
  wechatSaving: 'Speichern...',
  doneTitle: 'Alles fertig',
  doneSubtitle: 'Konfigurieren Sie als Nächstes Ihr KI-Modell und beginnen Sie mit der Nutzung von Halo',
  doneButton: 'Jetzt starten',
  back: 'Zurück',
  next: 'Weiter',
  skip: 'Vorerst überspringen',
}

const ES: GuideTranslations = {
  welcomeTitle: 'Bienvenido a Halo',
  welcomeSubtitle: 'Tu asistente de IA. Dediquemos un minuto a configurar todo.',
  welcomeButton: 'Comenzar',
  languageStepTitle: 'Elige tu idioma',
  languageStepSubtitle: 'Elige tu idioma preferido',
  appearanceStepTitle: 'Elige tu apariencia',
  appearanceStepSubtitle: 'Selecciona tu tema de visualización preferido',
  appearanceSystem: 'Sistema',
  appearanceLight: 'Claro',
  appearanceDark: 'Oscuro',
  aiModelStepTitle: 'Configurar tu IA',
  aiModelStepSubtitle: 'Elige un proveedor de modelos. Puedes cambiarlo en cualquier momento en Ajustes.',
  remoteStepTitle: 'Habilitar acceso remoto',
  remoteStepSubtitle: 'Conéctate a Halo desde tu teléfono en cualquier momento y lugar',
  remoteEnableTitle: 'Habilitar acceso remoto',
  remoteEnableDescription: 'Usando túnel de Cloudflare o conexión de red local',
  remoteSkipOption: 'Ahora no, quizás después',
  wechatStepTitle: 'Conectar WeChat',
  wechatStepSubtitle: 'Envía mensajes a Halo en WeChat y asigna tareas desde tu teléfono',
  wechatEnableTitle: 'Conectar bot de WeCom',
  wechatEnableDescription: 'Escanea para conectar, luego chatea directamente con Halo en WeChat',
  wechatSkipOption: 'Ahora no, quizás después',
  wechatSaveButton: 'Finalizar configuración',
  wechatSaving: 'Guardando...',
  doneTitle: 'Todo listo',
  doneSubtitle: 'A continuación, configura tu modelo de IA y comienza a usar Halo',
  doneButton: 'Empezar a usar',
  back: 'Atrás',
  next: 'Siguiente',
  skip: 'Omitir por ahora',
}

const FR: GuideTranslations = {
  welcomeTitle: 'Bienvenue dans Halo',
  welcomeSubtitle: 'Votre assistant IA. Prenons une minute pour tout configurer.',
  welcomeButton: 'Commencer',
  languageStepTitle: 'Choisissez votre langue',
  languageStepSubtitle: 'Choisissez votre langue préférée',
  appearanceStepTitle: 'Choisissez votre apparence',
  appearanceStepSubtitle: 'Sélectionnez votre thème d\'affichage préféré',
  appearanceSystem: 'Système',
  appearanceLight: 'Clair',
  appearanceDark: 'Sombre',
  aiModelStepTitle: 'Configurer votre IA',
  aiModelStepSubtitle: 'Choisissez un fournisseur de modèles. Vous pouvez le modifier à tout moment dans les paramètres.',
  remoteStepTitle: 'Activer l\'accès à distance',
  remoteStepSubtitle: 'Connectez-vous à Halo depuis votre téléphone à tout moment et partout',
  remoteEnableTitle: 'Activer l\'accès à distance',
  remoteEnableDescription: 'Utilisant le tunnel Cloudflare ou la connexion réseau local',
  remoteSkipOption: 'Pas maintenant, peut-être plus tard',
  wechatStepTitle: 'Connecter WeChat',
  wechatStepSubtitle: 'Envoyez des messages à Halo dans WeChat et assignez des tâches depuis votre téléphone',
  wechatEnableTitle: 'Connecter le bot WeCom',
  wechatEnableDescription: 'Scannez pour vous connecter, puis discutez directement avec Halo dans WeChat',
  wechatSkipOption: 'Pas maintenant, peut-être plus tard',
  wechatSaveButton: 'Terminer la configuration',
  wechatSaving: 'Enregistrement...',
  doneTitle: 'Tout est prêt',
  doneSubtitle: 'Ensuite, configurez votre modèle IA et commencez à utiliser Halo',
  doneButton: 'Commencer à utiliser',
  back: 'Retour',
  next: 'Suivant',
  skip: 'Ignorer pour l\'instant',
}

const TRANSLATIONS: Record<GuideLanguage, GuideTranslations> = {
  'en': EN,
  'zh-CN': ZH_CN,
  'zh-TW': ZH_TW,
  'ja': JA,
  'de': DE,
  'es': ES,
  'fr': FR,
}

/** Languages the wizard itself lets the user pick from. */
export const GUIDE_LANGUAGES: { value: GuideLanguage; native: string }[] = [
  { value: 'zh-CN', native: '简体中文' },
  { value: 'zh-TW', native: '繁體中文' },
  { value: 'en', native: 'English' },
  { value: 'ja', native: '日本語' },
  { value: 'de', native: 'Deutsch' },
  { value: 'fr', native: 'Français' },
  { value: 'es', native: 'Español' },
]

const GUIDE_LANG_STORAGE_KEY = 'halo-guide-language'

function readPersistedGuideLanguage(): GuideLanguage | null {
  try {
    const v = localStorage.getItem(GUIDE_LANG_STORAGE_KEY)
    if (v && v in TRANSLATIONS) return v as GuideLanguage
  } catch {
    // ignore
  }
  return null
}

function persistGuideLanguage(lang: GuideLanguage): void {
  try {
    localStorage.setItem(GUIDE_LANG_STORAGE_KEY, lang)
  } catch {
    // ignore
  }
}

/**
 * Hook used inside GuidePage only. Returns the current translation bundle
 * plus a setter. Setting a new language updates both the local wizard
 * state AND propagates the choice to the global i18n so the rest of
 * the app stays in sync during the flow.
 */
export function useGuideI18n(): {
  t: GuideTranslations
  lang: GuideLanguage
  setLang: (lang: GuideLanguage) => void
} {
  const [lang, setLangState] = useState<GuideLanguage>(() => {
    return readPersistedGuideLanguage() ?? 'en'
  })

  useEffect(() => {
    persistGuideLanguage(lang)
  }, [lang])

  const setLang = useCallback((next: GuideLanguage) => {
    setLangState(next)
    setGlobalLanguage(next)
  }, [])

  return {
    t: TRANSLATIONS[lang],
    lang,
    setLang,
  }
}

export type { GuideLanguage }
