import { createFileRoute } from '@tanstack/react-router'
import { AdminPanel } from '@/components/admin/admin-panel'

export const Route = createFileRoute('/admin')({ component: AdminRouteComponent })

function AdminRouteComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AdminPanel />
    </div>
  )
}
