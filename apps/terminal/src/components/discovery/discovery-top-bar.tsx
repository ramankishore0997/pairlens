// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, Sparkles, UserRound, LogOut } from 'lucide-react'

import type {
  DiscoverySection,
  DiscoverySectionId,
} from '@/lib/layout/workspaces/discovery-sections'
import { HEADER_GROUP } from '@/components/chrome/header-chrome'
import { LayoutToolbar } from '@/components/layout/layout-toolbar'
import { PageHeader } from '@/components/page-header'
import { PairlensLogo } from '@/components/pairlens-logo'
import { DiscoverySectionTabs } from '@/components/discovery/discovery-section-tabs'
import { DiscoveryVenuePicker } from '@/components/discovery/discovery-venue-picker'
import { Button } from '@pairlens/ui/components/ui/button'
import { Badge } from '@pairlens/ui/components/ui/badge'
import { Dialog, DialogContent } from '@pairlens/ui/components/ui/dialog'
import { AuthModal } from '@/components/auth/auth-modal'
import { AdminPanel } from '@/components/admin/admin-panel'
import { CryptoCheckoutModal, SubscriptionPlan } from '@/components/subscription/crypto-checkout-modal'
import { SupabaseDataService, DbUser } from '@/lib/services/supabase-service'

type DiscoveryTopBarProps = {
  sections: Array<DiscoverySection>
  activeSection: DiscoverySectionId
  onSelectSection: (id: DiscoverySectionId) => void
  onReorderSections: (fromId: string, toId: string) => void
}

export function DiscoveryTopBar({
  sections,
  activeSection,
  onSelectSection,
  onReorderSections,
}: DiscoveryTopBarProps) {
  const { t } = useTranslation()
  const [workspacesOpen, setWorkspacesOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null)

  useEffect(() => {
    const user = SupabaseDataService.getCurrentUser()
    setCurrentUser(user)

    // If user is not logged in, trigger auth modal on startup
    if (!user) {
      const timer = setTimeout(() => {
        setAuthOpen(true)
      }, 600)
      return () => clearTimeout(timer)
    }

    const handleAuthChange = () => {
      setCurrentUser(SupabaseDataService.getCurrentUser())
    }
    window.addEventListener('stac:auth:changed', handleAuthChange)
    return () => window.removeEventListener('stac:auth:changed', handleAuthChange)
  }, [])

  return (
    <>
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-card/80 border border-border/80 px-2.5 py-1 rounded-md text-xs">
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-cyan-500/40 text-cyan-400 uppercase py-0 px-1.5 h-4"
                >
                  {currentUser.plan || 'Free'}
                </Badge>
                <span className="font-mono text-muted-foreground text-[11px] max-w-[120px] truncate">
                  {currentUser.email}
                </span>
                <button
                  type="button"
                  title="Logout"
                  onClick={() => SupabaseDataService.signOut()}
                  className="text-muted-foreground hover:text-rose-400 ml-1 transition-colors"
                >
                  <LogOut className="size-3" />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAuthOpen(true)}
                className="h-7 text-xs font-mono border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 gap-1.5 px-2.5 shadow-sm shadow-cyan-500/10"
              >
                <UserRound className="size-3.5" /> Sign In / Sign Up
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setCheckoutOpen(true)}
              className="h-7 text-xs font-mono border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1 px-2.5"
            >
              <Sparkles className="size-3" /> VIP
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdminOpen(true)}
              className="h-7 text-xs font-mono border-border/60 hover:text-cyan-400 gap-1 px-2.5"
            >
              <Lock className="size-3 text-cyan-400" /> Admin
            </Button>

            <DiscoveryVenuePicker section={activeSection} />
            <LayoutToolbar
              open={workspacesOpen}
              onOpenChange={setWorkspacesOpen}
            />
          </div>
        }
      >
        <h1 aria-label={t('discovery.title')} className="shrink-0 leading-none">
          <PairlensLogo
            alt=""
            width={3264}
            height={630}
            className="block h-[17px] w-auto select-none"
          />
        </h1>
        <div className={HEADER_GROUP}>
          <DiscoverySectionTabs
            sections={sections}
            active={activeSection}
            onSelect={onSelectSection}
            onReorder={onReorderSections}
          />
        </div>
      </PageHeader>

      {/* User Auth Modal */}
      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => setAuthOpen(false)}
      />

      {/* Admin Panel Dialog */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-background">
          <AdminPanel onClose={() => setAdminOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* VIP Crypto Checkout Modal */}
      <CryptoCheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        initialPlan="monthly"
      />
    </>
  )
}
