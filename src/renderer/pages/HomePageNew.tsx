/**
 * Home Page - Space list view
 */

import React, { useEffect, useState, useRef } from 'react'
import { useAppStore } from '../stores/app.store'
import { useSpaceStore } from '../stores/space.store'
import { SPACE_ICONS, DEFAULT_SPACE_ICON } from '../types'
import type { Space, SpaceIconId } from '../types'
import {
  SpaceIcon,
  Sparkles,
  Settings,
  Plus,
  Trash2,
  Pencil
} from '../components/icons/ToolIcons'
import { Header } from '../components/layout/Header'
import { SpaceGuide } from '../components/space/SpaceGuide'
import { CreateSpaceDialog } from '../components/space/CreateSpaceDialog'
import { Blocks, ArrowRight, AlertCircle, SendHorizontal, Unplug, Bot, LayoutGrid, List, Play, Pause, ChevronDown } from 'lucide-react'
import Avatar from 'boring-avatars'
import { useIsMobile } from '../hooks/useIsMobile'

const AVATAR_COLORS = ['#84B9EF', '#6C8EBF', '#3D5A80', '#98C1D9', '#E0FBFC']
import { api } from '../api'
import { useTranslation } from '../i18n'
import { useAppsStore } from '../stores/apps.store'
import { useAppsPageStore } from '../stores/apps-page.store'
import type { InstalledApp } from '../../shared/apps/app-types'
import type { AppType } from '../../shared/apps/spec-types'
import { DigitalHumanDetailNew } from '../components/apps/DigitalHumanDetailNew'
import { AppInstallDialog } from '../components/apps/AppInstallDialog'

export function HomePageNew() {
  const { t } = useTranslation()
  const { setView: setViewRaw } = useAppStore()
  const { haloSpace, spaces, loadSpaces, setCurrentSpace, refreshCurrentSpace, updateSpace, deleteSpace } = useSpaceStore()
  const { apps, loadApps } = useAppsStore()
  const { setCurrentTab, openMarketplaceFilteredBy } = useAppsPageStore()

  // Wrapper for setView that saves scroll position before navigating away
  const scrollRef = useRef<HTMLElement>(null)
  const setView = (view: Parameters<typeof setViewRaw>[0]) => {
    if (scrollRef.current) {
      sessionStorage.setItem('halo-home-scroll-pos', String(scrollRef.current.scrollTop))
    }
    setViewRaw(view)
  }

  // Load apps on mount for the Apps card
  useEffect(() => {
    loadApps()
  }, [loadApps])

  // View mode: 'classic' (Halo+Studio side by side) or 'unified' (stacked sections)
  const [viewMode, setViewMode] = useState<'classic' | 'unified'>('unified')
  const isMobile = useIsMobile()
  // Digital humans layout: 'list' (1 col) or 'grid' (2 col). Mobile defaults to list, desktop to grid.
  const [dhLayout, setDhLayout] = useState<'list' | 'grid'>(() => isMobile ? 'list' : 'grid')
  // Spaces layout: same toggle as digital humans
  const [spaceLayout, setSpaceLayout] = useState<'list' | 'grid'>(() => isMobile ? 'list' : 'grid')
  // Classic mode: always grid. Unified mode: respects spaceLayout state.
  const effectiveSpaceLayout = viewMode === 'classic' ? 'grid' : spaceLayout

  // Restore scroll position on mount (from sessionStorage, for returning from space/settings)
  useEffect(() => {
    const saved = sessionStorage.getItem('halo-home-scroll-pos')
    if (saved && scrollRef.current) {
      const pos = parseInt(saved, 10)
      if (pos > 0) {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = pos
          }
        })
      }
      sessionStorage.removeItem('halo-home-scroll-pos')
    }
  }, [])

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showInstallDialog, setShowInstallDialog] = useState(false)
  // Edit dialog state
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)
  const [editSpaceName, setEditSpaceName] = useState('')
  const [editSpaceIcon, setEditSpaceIcon] = useState<SpaceIconId>(DEFAULT_SPACE_ICON)

  // Direct digital human detail view (replaces home content when set)
  const [detailAppId, setDetailAppId] = useState<string | null>(null)

  // Save scroll position before navigating to detail view (keeps component mounted)
  const savedScrollPos = useRef(0)
  const navigateToDetail = (appId: string) => {
    if (scrollRef.current) {
      savedScrollPos.current = scrollRef.current.scrollTop
    }
    setDetailAppId(appId)
  }

  // Restore scroll position when returning from detail view
  useEffect(() => {
    if (detailAppId === null && scrollRef.current && savedScrollPos.current > 0) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = savedScrollPos.current
        }
      })
    }
  }, [detailAppId])

  // Filter automation apps for digital humans section
  const automationApps = apps.filter(a => a.spec.type === 'automation' && a.status !== 'uninstalled')

  // Studio section: collapsed by default, persisted to localStorage
  const [studioExpanded, setStudioExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('halo-studio-expanded') === 'true'
    }
    return false
  })
  useEffect(() => {
    localStorage.setItem('halo-studio-expanded', String(studioExpanded))
  }, [studioExpanded])

  // Load spaces on mount
  useEffect(() => {
    loadSpaces()
  }, [loadSpaces])

  // Handle space click - no reset needed, SpacePage handles its own state
  const handleSpaceClick = (space: Space) => {
    if (space.isMissing) return
    setCurrentSpace(space)
    refreshCurrentSpace()  // Load full space data (preferences) from backend
    setView('space')
  }

  // Handle delete space
  const handleDeleteSpace = async (e: React.MouseEvent, spaceId: string) => {
    e.stopPropagation()

    // Find the space to check if it's a custom path
    const space = spaces.find(s => s.id === spaceId)
    if (!space) return

    // Check if it's a project-linked space:
    // - New centralized spaces with project: have workingDir
    // - Legacy custom spaces: path doesn't end with /spaces/{uuid}
    //   (centralized paths are always {haloDir}/spaces/{uuid-v4}, uuid is 36 chars)
    const lastSegment = space.path.split(/[/\\]/).pop() ?? ''
    const isCentralizedSpace = space.path.includes('/spaces/') && lastSegment.length === 36
    const isProjectSpace = !!space.workingDir || !isCentralizedSpace

    const message = isProjectSpace
      ? t('Are you sure you want to delete this space?\n\nOnly Halo data (conversation history) will be deleted, your project files will be kept.')
      : t('Are you sure you want to delete this space?\n\nAll conversations and files in the space will be deleted.')

    if (confirm(message)) {
      await deleteSpace(spaceId)
    }
  }

  // Handle edit space - open dialog
  const handleEditSpace = (e: React.MouseEvent, space: Space) => {
    e.stopPropagation()
    setEditingSpace(space)
    setEditSpaceName(space.name)
    setEditSpaceIcon(space.icon as SpaceIconId)
  }

  // Handle save space edit
  const handleSaveEdit = async () => {
    if (!editingSpace || !editSpaceName.trim()) return

    await updateSpace(editingSpace.id, {
      name: editSpaceName.trim(),
      icon: editSpaceIcon
    })

    setEditingSpace(null)
    setEditSpaceName('')
    setEditSpaceIcon(DEFAULT_SPACE_ICON)
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingSpace(null)
    setEditSpaceName('')
    setEditSpaceIcon(DEFAULT_SPACE_ICON)
  }

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return t('Today')
    if (diffDays === 1) return t('Yesterday')
    if (diffDays < 7) return t('{{count}} days ago', { count: diffDays })
    if (diffDays < 30) return t('{{count}} weeks ago', { count: Math.floor(diffDays / 7) })
    return t('{{count}} months ago', { count: Math.floor(diffDays / 30) })
  }

  // Direct digital human detail view
  if (detailAppId) {
    return <DigitalHumanDetailNew appId={detailAppId} onBack={() => setDetailAppId(null)} />
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header - cross-platform support */}
      <Header
        left={
          <>
            <div className="w-[22px] h-[22px] rounded-full border-2 border-primary/60 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary/30 to-transparent" />
            </div>
            <span className="text-sm font-medium">Halo</span>
          </>
        }
        right={
          <>
            <button
              onClick={() => setViewMode(v => v === 'classic' ? 'unified' : 'classic')}
              className={`p-1.5 hover:bg-secondary rounded-lg transition-colors ${viewMode === 'unified' ? 'bg-primary/10 text-primary' : ''}`}
              title={t('Toggle layout')}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setCurrentTab('my-digital-humans')
                setView('apps')
              }}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              title={t('Digital Humans')}
            >
              <Bot className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('settings')}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </>
        }
      />

      {/* Content */}
      <main ref={scrollRef} className="flex-1 overflow-auto p-6">
        {viewMode === 'classic' ? (
          <>
            {/* Classic Layout: Halo Space + Studio side by side */}
            <div className="grid grid-cols-2 gap-4 mb-8 animate-fade-in">
              {/* Halo Space card */}
              {haloSpace && (
                <div
                  data-onboarding="halo-space"
                  onClick={() => handleSpaceClick(haloSpace)}
                  className="halo-space-card p-5 rounded-xl cursor-pointer flex flex-col justify-between min-h-[160px]"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-semibold">{t('Halo')}</h2>
                  </div>
                  <div className="flex flex-col gap-2 px-3 pt-3 pb-2 rounded-xl bg-background/60 border border-primary/20 min-h-[72px]">
                    <span className="text-xs text-muted-foreground flex-1">
                      {t('Ask me anything...')}
                    </span>
                    <div className="flex justify-end">
                      <SendHorizontal className="w-4 h-4 text-primary/50" />
                    </div>
                  </div>
                </div>
              )}

              {/* Studio card */}
              <StudioCard
                apps={apps}
                onOpenAutomationList={() => {
                  setCurrentTab('my-digital-humans')
                  setView('apps')
                }}
                onOpenSkillsList={() => {
                  setCurrentTab('my-skills')
                  setView('apps')
                }}
                onOpenMcpList={() => {
                  setCurrentTab('my-mcp')
                  setView('apps')
                }}
                onSelectApp={(appId) => {
                  navigateToDetail(appId)
                }}
                onCreateAutomation={() => setShowInstallDialog(true)}
                onBrowseSkillsMarket={() => {
                  setView('apps')
                  void openMarketplaceFilteredBy('skill')
                }}
                onBrowseMcpMarket={() => {
                  setView('apps')
                  void openMarketplaceFilteredBy('mcp')
                }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Unified Layout: stacked sections */}
            {/* Halo Space Section */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{t('Halo')}</h3>
            </div>
            {haloSpace && (
              <div
                data-onboarding="halo-space"
                onClick={() => handleSpaceClick(haloSpace)}
                className="halo-space-card p-5 rounded-xl cursor-pointer flex flex-col justify-between min-h-[120px] mb-8 animate-fade-in"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-semibold">{t('Halo')}</h2>
                </div>
                <div className="flex flex-col gap-2 px-3 pt-3 pb-2 rounded-xl bg-background/60 border border-primary/20 min-h-[60px]">
                  <span className="text-xs text-muted-foreground flex-1">
                    {t('Ask me anything...')}
                  </span>
                  <div className="flex justify-end">
                    <SendHorizontal className="w-4 h-4 text-primary/50" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Spaces Section */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">{t('Dedicated Spaces')}</h3>
          <div className="flex items-center gap-1">
            {viewMode === 'unified' && (
              <LayoutToggle value={spaceLayout} onChange={setSpaceLayout} />
            )}
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-1 px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('New')}
            </button>
          </div>
        </div>

        {/* Space Guide - always visible */}
        <SpaceGuide />

        {spaces.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{t('No dedicated spaces yet')}</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${effectiveSpaceLayout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {spaces.map((space, i) => (
              <SpaceCard
                key={`${space.id}-${i}`}
                space={space}
                layout={effectiveSpaceLayout}
                onClick={() => handleSpaceClick(space)}
                onEdit={(e) => handleEditSpace(e, space)}
                onDelete={(e) => handleDeleteSpace(e, space.id)}
                formatTimeAgo={formatTimeAgo}
              />
            ))}
          </div>
        )}

        {/* Digital Humans Section — only in unified mode */}
        {viewMode === 'unified' && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{t('Digital Humans')}</h3>
              <div className="flex items-center gap-1">
                <LayoutToggle value={dhLayout} onChange={setDhLayout} />
                {/* Create button */}
                <button
                  onClick={() => setShowInstallDialog(true)}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('Create')}
                </button>
              </div>
            </div>

            {automationApps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">{t('No digital humans yet')}</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${dhLayout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {automationApps.map((app) => (
                  <DigitalHumanCard
                    key={app.id}
                    app={app}
                    onClick={() => {
                      navigateToDetail(app.id)
                    }}
                    onTogglePause={() => {
                      const store = useAppsStore.getState()
                      if (app.status === 'paused') {
                        store.resumeApp(app.id)
                      } else {
                        store.pauseApp(app.id)
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Studio Section — collapsible, only in unified mode */}
        {viewMode === 'unified' && (
          <StudioSection
            apps={apps}
            expanded={studioExpanded}
            onToggle={() => setStudioExpanded(v => !v)}
            onOpenTab={(tab) => {
              setCurrentTab(tab)
              setView('apps')
            }}
            onSelectApp={(appId) => navigateToDetail(appId)}
            onCreateAutomation={() => setShowInstallDialog(true)}
            onBrowseSkillsMarket={() => {
              setView('apps')
              void openMarketplaceFilteredBy('skill')
            }}
            onBrowseMcpMarket={() => {
              setView('apps')
              void openMarketplaceFilteredBy('mcp')
            }}
          />
        )}
      </main>

      {showCreateDialog && (
        <CreateSpaceDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => setShowCreateDialog(false)}
        />
      )}

      {showInstallDialog && (
        <AppInstallDialog onClose={() => setShowInstallDialog(false)} />
      )}

      {/* Edit Space Dialog */}
      {editingSpace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-fade-in">
            <h2 className="text-lg font-medium mb-4">{t('Edit Space')}</h2>

            {/* Space name */}
            <div className="mb-4">
              <label className="block text-sm text-muted-foreground mb-2">{t('Space Name')}</label>
              <input
                type="text"
                value={editSpaceName}
                onChange={(e) => setEditSpaceName(e.target.value)}
                placeholder={t('My Project')}
                className="w-full px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Icon select */}
            <div className="mb-6">
              <label className="block text-sm text-muted-foreground mb-2">{t('Icon')}</label>
              <div className="flex flex-wrap gap-2">
                {SPACE_ICONS.map((iconId) => (
                  <button
                    key={iconId}
                    onClick={() => setEditSpaceIcon(iconId)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                      editSpaceIcon === iconId
                        ? 'bg-primary/20 border-2 border-primary'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <SpaceIcon iconId={iconId} size={20} />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editSpaceName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Studio card — three categorized rows on the home page
// ──────────────────────────────────────────────

interface StudioCardProps {
  apps: InstalledApp[]
  onOpenAutomationList: () => void
  onOpenSkillsList: () => void
  onOpenMcpList: () => void
  /** Open AppsPage with a specific app pre-selected */
  onSelectApp: (appId: string) => void
  onCreateAutomation: () => void
  onBrowseSkillsMarket: () => void
  onBrowseMcpMarket: () => void
}

function StudioCard({
  apps,
  onOpenAutomationList,
  onOpenSkillsList,
  onOpenMcpList,
  onSelectApp,
  onCreateAutomation,
  onBrowseSkillsMarket,
  onBrowseMcpMarket,
}: StudioCardProps) {
  const { t } = useTranslation()

  const automationApps = apps.filter(a => a.spec.type === 'automation' && a.status !== 'uninstalled')
  const skillApps = apps.filter(a => a.spec.type === 'skill' && a.status !== 'uninstalled')
  const mcpApps = apps.filter(a => a.spec.type === 'mcp' && a.status !== 'uninstalled')

  return (
    <div
      onClick={onOpenAutomationList}
      className="p-5 rounded-xl cursor-pointer border border-border sm:hover:border-primary/40 sm:hover:bg-secondary/50 transition-colors flex flex-col gap-3 min-h-[160px]"
    >
      <div className="flex items-center gap-2">
        <Blocks className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{t('Studio')}</h2>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <StudioRow
          label={t('Digital Humans')}
          type="automation"
          apps={automationApps}
          onOpenList={onOpenAutomationList}
          onSelectApp={onSelectApp}
          emptyAction={{ label: t('Create'), onAction: onCreateAutomation }}
          createAction={onCreateAutomation}
        />
        <StudioRow
          label={t('Skills')}
          type="skill"
          apps={skillApps}
          onOpenList={onOpenSkillsList}
          onSelectApp={onSelectApp}
          emptyAction={{ label: t('Add from marketplace'), onAction: onBrowseSkillsMarket }}
        />
        <StudioRow
          label={t('MCP')}
          type="mcp"
          apps={mcpApps}
          onOpenList={onOpenMcpList}
          onSelectApp={onSelectApp}
          emptyAction={{ label: t('Add from marketplace'), onAction: onBrowseMcpMarket }}
        />
      </div>

      <div className="flex justify-end">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {t('Open')} <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  )
}

interface StudioRowProps {
  label: string
  type: AppType
  apps: InstalledApp[]
  onOpenList: () => void
  onSelectApp: (appId: string) => void
  emptyAction: { label: string; onAction: () => void }
  createAction?: () => void
}

const PREVIEW_COUNT = 3

function StudioRow({ label, type, apps, onOpenList, onSelectApp, emptyAction, createAction }: StudioRowProps) {
  const isEmpty = apps.length === 0
  const previewApps = apps.slice(0, PREVIEW_COUNT)
  const extraCount = Math.max(0, apps.length - PREVIEW_COUNT)
  // Only automation apps have meaningful runtime status worth surfacing inline
  const showStatusDot = type === 'automation'

  return (
    <div className="flex items-center gap-2 py-1 px-1 -mx-1 rounded">
      <div
        onClick={e => {
          e.stopPropagation()
          if (isEmpty) emptyAction.onAction()
          else onOpenList()
        }}
        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-secondary/60 transition-colors rounded px-1"
      >
        <span className="text-xs font-medium text-foreground flex-shrink-0">{label}</span>
        <span className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums">{apps.length}</span>

        {isEmpty ? (
          <span className="text-xs text-muted-foreground/80 truncate flex-1 min-w-0">
            {emptyAction.label}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
            {previewApps.map(app => (
              <AppPreviewChip
                key={app.id}
                app={app}
                showStatusDot={showStatusDot}
                onSelect={() => onSelectApp(app.id)}
              />
            ))}
            {extraCount > 0 && (
              <span className="text-[11px] text-muted-foreground flex-shrink-0">+{extraCount}</span>
            )}
          </span>
        )}
      </div>

      {/* Create button - always visible for automation type */}
      {createAction && (
        <button
          onClick={e => {
            e.stopPropagation()
            createAction()
          }}
          className="p-1 rounded sm:hover:bg-secondary/60 transition-colors flex-shrink-0"
          title="Create"
        >
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

interface AppPreviewChipProps {
  app: InstalledApp
  showStatusDot: boolean
  onSelect: () => void
}

function AppPreviewChip({ app, showStatusDot, onSelect }: AppPreviewChipProps) {
  const isWaiting = app.status === 'waiting_user'
  return (
    <button
      onClick={e => {
        e.stopPropagation()
        onSelect()
      }}
      className="flex items-center gap-1 max-w-[140px] hover:opacity-80 transition-opacity min-w-0"
    >
      {showStatusDot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isWaiting ? 'bg-orange-400' :
          app.status === 'active' ? 'bg-green-500/70' :
          app.status === 'error' ? 'bg-red-500' : 'border border-muted-foreground/40'
        }`} />
      )}
      <span className="text-xs text-foreground truncate">{app.spec.name}</span>
      {showStatusDot && isWaiting && (
        <AlertCircle className="w-3 h-3 text-orange-400 flex-shrink-0" />
      )}
    </button>
  )
}

// ──────────────────────────────────────────────
// Digital Human Card — card-style display for unified layout
// ──────────────────────────────────────────────

interface DigitalHumanCardProps {
  app: InstalledApp
  onClick: () => void
  onTogglePause: () => void
}

const STATUS_CONFIG = {
  active: { dot: 'bg-green-500/70', label: 'Running' },
  paused: { dot: 'bg-orange-400', label: 'Paused' },
  error: { dot: 'bg-red-500', label: 'Error' },
  waiting_user: { dot: 'bg-orange-400', label: 'Waiting' },
  needs_login: { dot: 'bg-yellow-500', label: 'Login required' },
  uninstalled: { dot: 'border border-muted-foreground/40', label: 'Uninstalled' },
} as const

function DigitalHumanCard({ app, onClick, onTogglePause }: DigitalHumanCardProps) {
  const { t } = useTranslation()
  const statusInfo = STATUS_CONFIG[app.status] || STATUS_CONFIG.active

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-xl border border-border sm:hover:border-primary/40 sm:hover:bg-secondary/50 transition-all cursor-pointer group animate-fade-in"
    >
      <div className="flex items-start gap-3">
        {/* Avatar/Icon */}
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
          <Avatar size={40} name={app.spec.name || app.id} variant="beam" colors={AVATAR_COLORS} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusInfo.dot}`} />
            <span className="font-medium text-sm truncate">{app.spec.name}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {app.spec.description || t('No description')}
          </p>
        </div>

        {/* Actions */}
        {(app.status === 'active' || app.status === 'paused') && (
          <button
            onClick={e => {
              e.stopPropagation()
              onTogglePause()
            }}
            className="p-1.5 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:hover:bg-secondary transition-all"
            title={app.status === 'active' ? t('Pause') : t('Resume')}
          >
            {app.status === 'active' ? (
              <Pause className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Play className="w-4 h-4 text-primary" />
            )}
          </button>
        )}
      </div>

      {/* Footer: status label */}
      <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{t(statusInfo.label)}</span>
        {app.lastRunAt && (
          <span className="text-[11px] text-muted-foreground/70">
            {t('Last run')}: {new Date(app.lastRunAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Studio Section — collapsible summary for unified layout
// ──────────────────────────────────────────────

interface StudioSectionProps {
  apps: InstalledApp[]
  expanded: boolean
  onToggle: () => void
  onOpenTab: (tab: 'my-digital-humans' | 'my-skills' | 'my-mcp') => void
  onSelectApp: (appId: string) => void
  onCreateAutomation: () => void
  onBrowseSkillsMarket: () => void
  onBrowseMcpMarket: () => void
}

function StudioSection({
  apps,
  expanded,
  onToggle,
  onOpenTab,
  onSelectApp,
  onCreateAutomation,
  onBrowseSkillsMarket,
  onBrowseMcpMarket,
}: StudioSectionProps) {
  const { t } = useTranslation()

  const automationApps = apps.filter(a => a.spec.type === 'automation' && a.status !== 'uninstalled')
  const skillApps = apps.filter(a => a.spec.type === 'skill' && a.status !== 'uninstalled')
  const mcpApps = apps.filter(a => a.spec.type === 'mcp' && a.status !== 'uninstalled')

  // Build summary string: "3 Digital Humans · 2 Skills · 1 MCP"
  const parts: string[] = []
  if (automationApps.length > 0) parts.push(`${automationApps.length} ${t('Digital Humans')}`)
  if (skillApps.length > 0) parts.push(`${skillApps.length} ${t('Skills')}`)
  if (mcpApps.length > 0) parts.push(`${mcpApps.length} ${t('MCP')}`)
  const summary = parts.length > 0 ? parts.join(' · ') : t('No apps yet')

  return (
    <div className="mt-8 animate-fade-in">
      {/* Collapsed title bar */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 sm:px-4 rounded-lg bg-card border border-border sm:hover:border-primary/30 transition-all group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Blocks className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium flex-shrink-0">{t('Studio')}</span>
          <span className="text-xs text-muted-foreground truncate">{summary}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
            expanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 rounded-lg bg-card border border-border overflow-hidden animate-slide-down">
          <div className="p-3 sm:p-4 space-y-1">
            <StudioRow
              label={t('Digital Humans')}
              type="automation"
              apps={automationApps}
              onOpenList={() => onOpenTab('my-digital-humans')}
              onSelectApp={onSelectApp}
              emptyAction={{ label: t('Create'), onAction: onCreateAutomation }}
              createAction={onCreateAutomation}
            />
            <StudioRow
              label={t('Skills')}
              type="skill"
              apps={skillApps}
              onOpenList={() => onOpenTab('my-skills')}
              onSelectApp={onSelectApp}
              emptyAction={{ label: t('Add from marketplace'), onAction: onBrowseSkillsMarket }}
            />
            <StudioRow
              label={t('MCP')}
              type="mcp"
              apps={mcpApps}
              onOpenList={() => onOpenTab('my-mcp')}
              onSelectApp={onSelectApp}
              emptyAction={{ label: t('Add from marketplace'), onAction: onBrowseMcpMarket }}
            />
          </div>
          <div className="px-3 py-2 border-t border-border/50 flex justify-end">
            <button
              onClick={() => onOpenTab('my-digital-humans')}
              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
            >
              {t('Open')} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Layout Toggle — single button to switch list/grid
// ──────────────────────────────────────────────

interface LayoutToggleProps {
  value: 'list' | 'grid'
  onChange: (mode: 'list' | 'grid') => void
}

function LayoutToggle({ value, onChange }: LayoutToggleProps) {
  const { t } = useTranslation()
  const isList = value === 'list'
  return (
    <button
      onClick={() => onChange(isList ? 'grid' : 'list')}
      className="p-1.5 rounded-lg text-muted-foreground sm:hover:bg-secondary/50 transition-colors"
      title={isList ? t('Grid view') : t('List view')}
    >
      {isList ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
    </button>
  )
}

// ──────────────────────────────────────────────
// Space Card — supports list and grid layouts
// ──────────────────────────────────────────────

interface SpaceCardProps {
  space: Space
  layout: 'list' | 'grid'
  onClick: () => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  formatTimeAgo: (dateStr: string) => string
}

function SpaceCard({ space, layout, onClick, onEdit, onDelete, formatTimeAgo }: SpaceCardProps) {
  const { t } = useTranslation()
  const isMissing = space.isMissing

  if (layout === 'list') {
    return (
      <div
        onClick={onClick}
        className={`px-4 py-3 rounded-xl border border-border sm:hover:border-primary/40 sm:hover:bg-secondary/50 transition-all cursor-pointer group animate-fade-in ${
          isMissing ? 'opacity-70 border-dashed' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <SpaceIcon iconId={space.icon} size={20} />
            <span className="font-medium truncate">{space.name}</span>
            {isMissing && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <Unplug className="w-3 h-3" />
                {t('Unavailable')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(e) }}
              className="p-1 sm:hover:bg-secondary rounded transition-all"
              title={t('Edit Space')}
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(e) }}
              className="p-1 sm:hover:bg-destructive/20 rounded transition-all"
              title={t('Delete space')}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {isMissing
            ? t('Path unavailable. Reconnect the drive to open this space.')
            : `${formatTimeAgo(space.lastActiveAt || space.updatedAt)}${t('active')}`}
        </p>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border border-border sm:hover:border-primary/40 sm:hover:bg-secondary/50 transition-all cursor-pointer group animate-fade-in ${
        isMissing ? 'opacity-70 border-dashed' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <SpaceIcon iconId={space.icon} size={20} />
          <span className="font-medium truncate">{space.name}</span>
          {isMissing && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Unplug className="w-3 h-3" />
              {t('Unavailable')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(e) }}
            className="p-1 hover:bg-secondary rounded transition-all"
            title={t('Edit Space')}
          >
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(e) }}
            className="p-1 hover:bg-destructive/20 rounded transition-all"
            title={t('Delete space')}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {isMissing
          ? t('Path unavailable. Reconnect the drive to open this space.')
          : `${formatTimeAgo(space.lastActiveAt || space.updatedAt)}${t('active')}`}
      </p>
    </div>
  )
}

