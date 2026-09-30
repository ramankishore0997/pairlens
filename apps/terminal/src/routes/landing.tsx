import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LandingPage } from '@/components/landing/landing-page'

export const Route = createFileRoute('/landing')({ component: LandingRouteComponent })

function LandingRouteComponent() {
  const navigate = useNavigate()

  return (
    <LandingPage
      onLaunchTerminal={() => {
        void navigate({ to: '/' })
      }}
    />
  )
}
