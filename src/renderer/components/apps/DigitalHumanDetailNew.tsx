/**
 * Standalone digital human detail view.
 * Reuses the same sub-components as AppsPage so changes propagate to both.
 */

import { useEffect, useMemo } from 'react'
import { useAppsStore } from '../../stores/apps.store'
import { useAppsPageStore } from '../../stores/apps-page.store'
import { useSpaceStore } from '../../stores/space.store'
import { resolveSpecI18n } from '../../utils/spec-i18n'
import { getCurrentLanguage, useTranslation } from '../../i18n'
import { Header } from '../layout/Header'
import { AutomationHeader } from './AutomationHeader'
import { LoginNoticeBar } from './LoginNoticeBar'
import { ActivityThread } from './ActivityThread'
import { SessionDetailView } from './SessionDetailView'
import { AppChatContainer } from './AppChatContainer'
import { AppConfigPanel } from './AppConfigPanel'
import { ChevronLeft, Settings } from 'lucide-react'
import { useAppStore } from '../../stores/app.store'
import { api } from '../../api'

interface DigitalHumanDetailNewProps {
  appId: string
  onBack: () => void
}

export function DigitalHumanDetailNew({ appId, onBack }: DigitalHumanDetailNewProps) {
  const { t } = useTranslation()
  const { setView } = useAppStore()
  const { apps, updateAppOverrides } = useAppsStore()
  const { haloSpace, spaces } = useSpaceStore()
  const {
    detailView,
    selectApp,
    clearSelection,
    openActivityThread,
    openAppChat,
  } = useAppsPageStore()

  // Resolve the app and space name
  const app = useMemo(() => apps.find(a => a.id === appId), [apps, appId])

  const spaceMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (haloSpace) map[haloSpace.id] = haloSpace.name
    for (const s of spaces) map[s.id] = s.name
    return map
  }, [spaces, haloSpace])

  const spaceName = app?.spaceId ? spaceMap[app.spaceId] : t('Global')

  // Initialize the page store state for this app
  useEffect(() => {
    if (app) {
      const appType = app.status === 'uninstalled' ? 'uninstalled' : app.spec.type
      // For automation apps with spaceId, always open Native Chat directly
      if (appType === 'automation' && app.spaceId) {
        openAppChat(app.id, app.spaceId)
      } else {
        selectApp(app.id, appType, app.spaceId ?? undefined)
      }
    }
    return () => { clearSelection() }
  }, [app, selectApp, clearSelection, openAppChat])

  // Login notice logic
  const resolvedSpec = useMemo(
    () => app ? resolveSpecI18n(app.spec, getCurrentLanguage()) : undefined,
    [app]
  )
  const showLoginNotice = useMemo(() => {
    if (!app || app.spec.type !== 'automation') return false
    const browserLogin = resolvedSpec?.browser_login
    if (!browserLogin || browserLogin.length === 0) return false
    return !app.userOverrides?.loginNoticeDismissed
  }, [app, resolvedSpec])

  const isSessionDetail = detailView?.type === 'session-detail'
  const isAppChat = detailView?.type === 'app-chat'

  const handleBack = () => {
    clearSelection()
    onBack()
  }

  const renderDetail = () => {
    if (!detailView) return null

    switch (detailView.type) {
      case 'activity-thread':
        return <ActivityThread appId={detailView.appId} />
      case 'session-detail':
        return <SessionDetailView appId={detailView.appId} runId={detailView.runId} />
      case 'app-chat':
        return <AppChatContainer appId={detailView.appId} spaceId={detailView.spaceId} />
      case 'app-config':
        return <AppConfigPanel appId={detailView.appId} spaceName={spaceName} />
      default:
        return null
    }
  }

  if (!app) return null

  return (
    <div className="h-full flex flex-col bg-background">
      <Header
        left={
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('Back')}
          </button>
        }
        right={
          <button
            onClick={() => setView('settings')}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            title={t('Settings')}
          >
            <Settings className="w-5 h-5" />
          </button>
        }
      />

      {/* Session detail breadcrumb */}
      {isSessionDetail && (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-border flex-shrink-0">
          <button
            onClick={() => openActivityThread(app.id)}
            className="text-sm text-primary hover:underline truncate"
          >
            {resolvedSpec?.name ?? app.spec.name}
          </button>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs text-muted-foreground truncate">
            {detailView.runId.slice(0, 8)}
          </span>
        </div>
      )}

      {/* Automation header with activity/chat/config tabs */}
      {!isSessionDetail && app.spec.type === 'automation' && (
        <>
          <AutomationHeader appId={app.id} spaceName={spaceName} />
          {showLoginNotice && resolvedSpec?.browser_login && detailView?.type === 'activity-thread' && (
            <LoginNoticeBar
              browserLogin={resolvedSpec.browser_login}
              onDismiss={() => updateAppOverrides(app.id, { loginNoticeDismissed: true })}
              onOpenBrowser={(url, label) => api.openLoginWindow(url, label)}
            />
          )}
        </>
      )}

      {/* Detail content */}
      <div className={`flex-1 ${isAppChat ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {renderDetail()}
      </div>
    </div>
  )
}
