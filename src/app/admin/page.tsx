'use client'

export const dynamic = 'force-dynamic'

/**
 * Super Admin Dashboard
 *
 * Professional platform administration dashboard for superadmins.
 * Features:
 * - Comprehensive platform statistics
 * - Organization management (view, edit, activate/deactivate, delete)
 * - User management (view, edit roles, activate/deactivate)
 * - Search and filtering
 * - Real-time data updates
 *
 * @route /admin
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSuperadmin } from '@/lib/hooks/use-superadmin'
import {
  getPlatformStats,
  getAllOrganizations,
  getAllUsers,
  updateUserSystemRole,
  updateUserActiveStatus,
  updateOrganizationActiveStatus,
  deleteOrganization,
} from '@/lib/actions/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import type { Organization, Profile } from '@/types/database'

// =============================================================================
// ICONS
// =============================================================================

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

function BuildingIcon({ className }: { className?: string }) {
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
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12h12M6 16h12M6 8h12" />
    </svg>
  )
}

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

function ShieldIcon({ className }: { className?: string }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function TrendingUpIcon({ className }: { className?: string }) {
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
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

type TabType = 'overview' | 'organizations' | 'users'

export default function AdminPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { isSuperadmin, isLoading: authLoading } = useSuperadmin()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [orgSearch, setOrgSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; orgId: string | null }>({
    open: false,
    orgId: null,
  })

  // Fetch platform stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'platform-stats'],
    queryFn: getPlatformStats,
    enabled: isSuperadmin,
    refetchInterval: 60000, // Refresh every minute
  })

  // Fetch organizations
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: getAllOrganizations,
    enabled: isSuperadmin,
  })

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAllUsers,
    enabled: isSuperadmin,
  })

  // Mutations
  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'support' | 'sales' | 'superadmin' }) =>
      updateUserSystemRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı rolü güncellendi',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateUserActiveStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı durumu güncellendi',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateOrgStatusMutation = useMutation({
    mutationFn: ({ orgId, isActive }: { orgId: string; isActive: boolean }) =>
      updateOrganizationActiveStatus(orgId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-stats'] })
      toast({
        title: 'Başarılı',
        description: 'Organizasyon durumu güncellendi',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deleteOrgMutation = useMutation({
    mutationFn: (orgId: string) => deleteOrganization(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-stats'] })
      setDeleteDialog({ open: false, orgId: null })
      toast({
        title: 'Başarılı',
        description: 'Organizasyon silindi',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Filter organizations
  const filteredOrgs = organizations.filter((org) => {
    const searchLower = orgSearch.toLowerCase()
    return (
      org.name.toLowerCase().includes(searchLower) ||
      org.slug.toLowerCase().includes(searchLower) ||
      org.email?.toLowerCase().includes(searchLower)
    )
  })

  // Filter users
  const filteredUsers = users.filter((user) => {
    const searchLower = userSearch.toLowerCase()
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.system_role.toLowerCase().includes(searchLower)
    )
  })

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!isSuperadmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Erişim Reddedildi</CardTitle>
            <CardDescription>
              Bu sayfaya erişmek için süper admin yetkisine sahip olmanız gerekmektedir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full">Dashboard'a Dön</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span className="sr-only">Geri</span>
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Süper Admin Paneli
                </h1>
                <p className="mt-1 text-muted-foreground">
                  Platform yönetimi ve sistem izleme
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Süper Admin</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2 border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Genel Bakış
            </button>
            <button
              onClick={() => setActiveTab('organizations')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'organizations'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Organizasyonlar ({organizations.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Kullanıcılar ({users.length})
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Organizasyon</CardTitle>
                  <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.organizations.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.organizations.active || 0} aktif
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.users.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.users.active || 0} aktif
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Sipariş</CardTitle>
                  <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.orders.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.orders.today || 0} bugün
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bu Ay Yeni</CardTitle>
                  <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.organizations.newThisMonth || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.users.newThisMonth || 0} kullanıcı
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Subscription Tiers */}
            <Card>
              <CardHeader>
                <CardTitle>Abonelik Dağılımı</CardTitle>
                <CardDescription>Organizasyonların abonelik seviyeleri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {stats?.organizations.byTier && (
                    <>
                      <div className="rounded-lg border p-4">
                        <div className="text-2xl font-bold">
                          {stats.organizations.byTier.lite}
                        </div>
                        <div className="text-sm text-muted-foreground">Lite</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-2xl font-bold">
                          {stats.organizations.byTier.gold}
                        </div>
                        <div className="text-sm text-muted-foreground">Gold</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-2xl font-bold">
                          {stats.organizations.byTier.platinum}
                        </div>
                        <div className="text-sm text-muted-foreground">Platinum</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-2xl font-bold">
                          {stats.organizations.byTier.enterprise}
                        </div>
                        <div className="text-sm text-muted-foreground">Enterprise</div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Organizasyon ara (isim, slug, email)..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Organizations Table */}
            <Card>
              <CardHeader>
                <CardTitle>Organizasyonlar</CardTitle>
                <CardDescription>
                  {filteredOrgs.length} organizasyon bulundu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>İsim</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>E-posta</TableHead>
                        <TableHead>Abonelik</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Oluşturulma</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Yükleniyor...
                          </TableCell>
                        </TableRow>
                      ) : filteredOrgs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Organizasyon bulunamadı
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrgs.map((org) => (
                          <TableRow key={org.id}>
                            <TableCell className="font-medium">{org.name}</TableCell>
                            <TableCell className="text-muted-foreground">{org.slug}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {org.email || '-'}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                {org.subscription_tier || 'lite'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  org.is_active && !org.deleted_at
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                              >
                                {org.is_active && !org.deleted_at ? 'Aktif' : 'Pasif'}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(org.created_at).toLocaleDateString('tr-TR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateOrgStatusMutation.mutate({
                                      orgId: org.id,
                                      isActive: !org.is_active,
                                    })
                                  }
                                >
                                  {org.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeleteDialog({ open: true, orgId: org.id })}
                                >
                                  Sil
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Kullanıcı ara (isim, email, rol)..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Kullanıcılar</CardTitle>
                <CardDescription>{filteredUsers.length} kullanıcı bulundu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>İsim</TableHead>
                        <TableHead>E-posta</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Oluşturulma</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Yükleniyor...
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Kullanıcı bulunamadı
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.full_name || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                              <Select
                                value={user.system_role}
                                onValueChange={(value: 'user' | 'support' | 'sales' | 'superadmin') =>
                                  updateUserRoleMutation.mutate({ userId: user.id, role: value })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="support">Support</SelectItem>
                                  <SelectItem value="sales">Sales</SelectItem>
                                  <SelectItem value="superadmin">Superadmin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  user.is_active && !user.deleted_at
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                              >
                                {user.is_active && !user.deleted_at ? 'Aktif' : 'Pasif'}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString('tr-TR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateUserStatusMutation.mutate({
                                    userId: user.id,
                                    isActive: !user.is_active,
                                  })
                                }
                              >
                                {user.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, orgId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organizasyonu Sil</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Organizasyon ve tüm verileri silinecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, orgId: null })}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialog.orgId) {
                  deleteOrgMutation.mutate(deleteDialog.orgId)
                }
              }}
              disabled={deleteOrgMutation.isPending}
            >
              {deleteOrgMutation.isPending ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
