'use client'

/**
 * Team Management Page
 *
 * Dashboard page for managing team members in the organization.
 * Features:
 * - List all team members with their roles
 * - Invite new members by email
 * - Update member roles
 * - Remove members
 * - Role-based permissions
 *
 * @route /dashboard/settings/team
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useOrganization } from '@/lib/hooks/use-organization'
import { getTeamMembersAction, inviteTeamMemberAction, addTeamMemberManuallyAction, updateTeamMemberRoleAction, removeTeamMemberAction } from '@/lib/actions/team'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { TeamMember } from '@/lib/dal/team'
import type { OrganizationRole } from '@/types/database'

// =============================================================================
// ICONS
// =============================================================================

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}

function MoreVerticalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

// =============================================================================
// ROLE LABELS
// =============================================================================

const roleLabels: Record<OrganizationRole, string> = {
  owner: 'Sahip',
  admin: 'Yönetici',
  manager: 'Müdür',
  staff: 'Personel',
  kitchen: 'Mutfak',
  viewer: 'Görüntüleyici',
}

const rolePermissions: Record<OrganizationRole, string[]> = {
  owner: [
    'Tüm sayfalara erişim',
    'Organizasyon ayarlarını yönetme',
    'Ekip üyelerini ekleme/çıkarma',
    'Rol değiştirme',
    'Abonelik yönetimi',
    'Faturalama',
    'Tüm siparişleri görüntüleme',
    'Menü yönetimi',
    'Raporları görüntüleme',
  ],
  admin: [
    'Tüm sayfalara erişim',
    'Ekip üyelerini ekleme/çıkarma',
    'Rol değiştirme (owner hariç)',
    'Menü yönetimi',
    'Sipariş yönetimi',
    'Masa yönetimi',
    'Raporları görüntüleme',
    'Ayarları görüntüleme',
  ],
  manager: [
    'Siparişleri görüntüleme ve yönetme',
    'Menüyü görüntüleme ve düzenleme',
    'Masaları görüntüleme',
    'Raporları görüntüleme',
    'Ekip üyelerini görüntüleme',
  ],
  staff: [
    'Siparişleri görüntüleme',
    'Menüyü görüntüleme',
    'Masaları görüntüleme',
    'Müşteri hizmetleri',
  ],
  kitchen: [
    'Siparişleri görüntüleme',
    'Sipariş durumunu güncelleme',
    'Menüyü görüntüleme',
  ],
  viewer: [
    'Sadece görüntüleme',
    'Raporları görüntüleme',
    'Menüyü görüntüleme',
  ],
}

const roleColors: Record<OrganizationRole, string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  staff: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  kitchen: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  viewer: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
}

// =============================================================================
// INVITE DIALOG COMPONENT
// =============================================================================

interface InviteDialogProps {
  organizationId: string
  onSuccess: () => void
}

function InviteDialog({ organizationId, onSuccess }: InviteDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganizationRole>('staff')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await inviteTeamMemberAction(organizationId, email, role)
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setEmail('')
        setRole('staff')
        onSuccess()
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon className="h-4 w-4" />
          Üye Davet Et
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Üye Davet Et</DialogTitle>
          <DialogDescription>
            E-posta adresine göre bir kullanıcıyı ekibe davet edin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta Adresi</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as OrganizationRole)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Davet Ediliyor...' : 'Davet Et'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// MANUAL ADD DIALOG COMPONENT
// =============================================================================

interface ManualAddDialogProps {
  organizationId: string
  onSuccess: () => void
}

function ManualAddDialog({ organizationId, onSuccess }: ManualAddDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<OrganizationRole>('staff')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await addTeamMemberManuallyAction(
        organizationId,
        email,
        fullName,
        phone || null,
        role
      )
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setEmail('')
        setFullName('')
        setPhone('')
        setRole('staff')
        onSuccess()
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlusIcon className="h-4 w-4" />
          Manuel Ekle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manuel Üye Ekle</DialogTitle>
          <DialogDescription>
            Yeni bir kullanıcı oluşturarak ekibe ekleyin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manual-email">E-posta Adresi *</Label>
              <Input
                id="manual-email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Ad Soyad *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Ahmet Yılmaz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+90 555 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-role">Rol</Label>
              <select
                id="manual-role"
                value={role}
                onChange={(e) => setRole(e.target.value as OrganizationRole)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Ekleniyor...' : 'Ekle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// MEMBER CARD COMPONENT
// =============================================================================

interface MemberCardProps {
  member: TeamMember
  currentRole: OrganizationRole | null
  onRoleUpdate: (membershipId: string, role: OrganizationRole) => void
  onRemove: (membershipId: string) => void
}

function MemberCard({ member, currentRole, onRoleUpdate, onRemove }: MemberCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const canEdit = currentRole === 'owner' || currentRole === 'admin'
  const isOwner = member.membership.role === 'owner'
  const isCurrentUser = false // TODO: Check if this is the current user

  const handleRoleChange = async (newRole: OrganizationRole) => {
    if (newRole === member.membership.role) return

    setIsUpdating(true)
    try {
      await onRoleUpdate(member.membership.id, newRole)
    } finally {
      setIsUpdating(false)
      setShowMenu(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Bu üyeyi kaldırmak istediğinizden emin misiniz?')) return

    setIsUpdating(true)
    try {
      await onRemove(member.membership.id)
    } finally {
      setIsUpdating(false)
      setShowMenu(false)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar */}
            {member.profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.profile.avatar_url}
                alt={member.profile.full_name || member.profile.email}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold dark:bg-primary-900/30 dark:text-primary-400">
                {getInitials(member.profile.full_name)}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {member.profile.full_name || member.profile.email}
              </p>
              <p className="text-sm text-muted-foreground truncate">{member.profile.email}</p>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[member.membership.role]}`}
                >
                  {roleLabels[member.membership.role]}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {canEdit && !isOwner && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMenu(!showMenu)}
                disabled={isUpdating}
              >
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-10 z-20 w-48 rounded-md border bg-background shadow-lg">
                    <div className="p-1">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Rol Değiştir
                      </div>
                      {Object.entries(roleLabels)
                        .filter(([value]) => value !== member.membership.role && value !== 'owner')
                        .map(([value, label]) => (
                          <button
                            key={value}
                            onClick={() => handleRoleChange(value as OrganizationRole)}
                            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
                            disabled={isUpdating}
                          >
                            {label}
                          </button>
                        ))}
                      <div className="my-1 border-t" />
                      <button
                        onClick={handleRemove}
                        className="w-full text-left px-2 py-1.5 text-sm text-destructive rounded hover:bg-destructive/10"
                        disabled={isUpdating}
                      >
                        <TrashIcon className="inline h-4 w-4 mr-2" />
                        Kaldır
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function TeamPage() {
  const { currentOrg, currentRole, isLoading: orgLoading } = useOrganization()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canManageTeam = currentRole === 'owner' || currentRole === 'admin'

  const loadTeamMembers = async () => {
    if (!currentOrg) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getTeamMembersAction(currentOrg.id)
      if (result.error) {
        setError(result.error.message)
      } else if (result.data) {
        setTeamMembers(result.data)
      }
    } catch (err) {
      setError('Ekip üyeleri yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTeamMembers()
  }, [currentOrg?.id])

  const handleInviteSuccess = () => {
    loadTeamMembers()
  }

  const handleRoleUpdate = async (membershipId: string, role: OrganizationRole) => {
    try {
      const result = await updateTeamMemberRoleAction(membershipId, role)
      if (result.error) {
        alert(result.error)
      } else {
        loadTeamMembers()
      }
    } catch (err) {
      alert('Rol güncellenirken bir hata oluştu')
    }
  }

  const handleRemove = async (membershipId: string) => {
    try {
      const result = await removeTeamMemberAction(membershipId)
      if (result.error) {
        alert(result.error)
      } else {
        loadTeamMembers()
      }
    } catch (err) {
      alert('Üye kaldırılırken bir hata oluştu')
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="sr-only">Geri</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Ekip Yönetimi</h1>
            <p className="mt-1 text-muted-foreground">
              {currentOrg
                ? `${currentOrg.name} ekibini yönetin`
                : 'Ekip üyelerini yönetin'}
            </p>
          </div>
        </div>
        {canManageTeam && currentOrg && (
          <div className="flex gap-2">
            <InviteDialog organizationId={currentOrg.id} onSuccess={handleInviteSuccess} />
            <ManualAddDialog organizationId={currentOrg.id} onSuccess={handleInviteSuccess} />
          </div>
        )}
      </div>

      {/* Loading State */}
      {(orgLoading || isLoading) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-48 rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Organization State */}
      {!orgLoading && !currentOrg && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <UsersIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Organizasyon seçilmedi</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Ekip yönetimini görüntülemek için bir organizasyon seçmeniz gerekmektedir.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Team Members List */}
      {!orgLoading && !isLoading && currentOrg && (
        <>
          {teamMembers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4">
                  <UsersIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Henüz üye yok</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  Ekibinize yeni üyeler davet ederek başlayın.
                </p>
                {canManageTeam && (
                  <div className="mt-4 flex gap-2">
                    <InviteDialog organizationId={currentOrg.id} onSuccess={handleInviteSuccess} />
                    <ManualAddDialog organizationId={currentOrg.id} onSuccess={handleInviteSuccess} />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map((member) => (
                <MemberCard
                  key={member.membership.id}
                  member={member}
                  currentRole={currentRole}
                  onRoleUpdate={handleRoleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Ekip İstatistikleri</CardTitle>
              <CardDescription>
                Rol bazında üye dağılımı ve erişim seviyeleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold">{teamMembers.length}</div>
                    <div className="text-sm text-muted-foreground">Toplam Üye</div>
                  </div>
                  {Object.entries(roleLabels).map(([role, label]) => {
                    const membersWithRole = teamMembers.filter((m) => m.membership.role === role)
                    const count = membersWithRole.length
                    return (
                      <div key={role} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold">{count}</div>
                            <div className="text-sm text-muted-foreground">{label}</div>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${roleColors[role as OrganizationRole]}`}
                          >
                            {label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Role Permissions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Rol Erişim İzinleri</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(roleLabels).map(([role, label]) => {
                      const permissions = rolePermissions[role as OrganizationRole]
                      const membersWithRole = teamMembers.filter((m) => m.membership.role === role)
                      const count = membersWithRole.length

                      return (
                        <div key={role} className="rounded-lg border p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${roleColors[role as OrganizationRole]}`}
                              >
                                {label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({count} {count === 1 ? 'üye' : 'üye'})
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Erişim İzinleri:</p>
                            <ul className="space-y-1.5">
                              {permissions.map((permission, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs">
                                  <svg
                                    className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                  <span className="text-muted-foreground">{permission}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Detailed Role Breakdown */}
                {teamMembers.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Rol Bazında Üyeler</h3>
                    <div className="space-y-3">
                      {Object.entries(roleLabels).map(([role, label]) => {
                        const membersWithRole = teamMembers.filter((m) => m.membership.role === role)
                        if (membersWithRole.length === 0) return null

                        return (
                          <div key={role} className="rounded-lg border p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${roleColors[role as OrganizationRole]}`}
                                >
                                  {label}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  ({membersWithRole.length} {membersWithRole.length === 1 ? 'üye' : 'üye'})
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {membersWithRole.map((member) => (
                                <div
                                  key={member.membership.id}
                                  className="flex items-center gap-3 rounded-md bg-muted/50 p-2"
                                >
                                  {member.profile.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={member.profile.avatar_url}
                                      alt={member.profile.full_name || member.profile.email}
                                      className="h-8 w-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold dark:bg-primary-900/30 dark:text-primary-400">
                                      {(member.profile.full_name || member.profile.email)
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {member.profile.full_name || member.profile.email}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {member.profile.email}
                                    </p>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(member.membership.joined_at || member.membership.created_at).toLocaleDateString('tr-TR', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

