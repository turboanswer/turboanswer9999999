import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';
import {
  Search, Ban, Flag, Shield, Users, AlertTriangle, CheckCircle, Pause, Play, Eye,
  ArrowLeft, MessageSquare, X, Bell, ShieldAlert, Clock, Mail, User as UserIcon,
  FileText, CreditCard, Gift, Settings, Activity, Wrench, Crown, Zap, Server,
  Database, Brain, DollarSign, TrendingUp, RefreshCw, ChevronDown, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  isBanned: boolean;
  isFlagged: boolean;
  flagReason?: string;
  banReason?: string;
  isSuspended: boolean;
  suspensionReason?: string;
  suspendedBy?: string;
  suspendedAt?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface AdminNotification {
  id: number;
  type: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  flaggedContent: string;
  conversationId: number | null;
  actionTaken: string;
  isRead: string;
  createdAt: string;
}

interface SystemHealth {
  status: string;
  uptime: number;
  uptimeFormatted: string;
  totalUsers: number;
  subscriptions: { pro: number; research: number; enterprise: number };
  services: { database: string; paypal: string; ai: string };
  recentErrors: Array<{ time: number; message: string; source: string }>;
  lastHealthCheck: string;
  memory: { heapUsed: number; heapTotal: number; rss: number };
}

interface DiagResult {
  check: string;
  status: string;
  details: string;
  fixed?: boolean;
}

interface AdminStats {
  totalUsers: number;
  subscriptions: { pro: number; research: number; enterprise: number };
  moderation: { banned: number; suspended: number; flagged: number };
  estimatedMonthlyRevenue: string;
}

type TabType = 'overview' | 'users' | 'subscriptions' | 'system' | 'notifications';

export default function EmployeeDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ type: string; userId: string; userName: string; userEmail?: string } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);
  const [subModalUser, setSubModalUser] = useState<UserData | null>(null);
  const [subModalTier, setSubModalTier] = useState('');
  const [subModalReason, setSubModalReason] = useState('');
  const [subModalAction, setSubModalAction] = useState<'modify' | 'cancel' | 'grant'>('modify');
  const [subModalDuration, setSubModalDuration] = useState<number>(0);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery<UserData[]>({
    queryKey: ['/api/employee/users'],
  });

  const { data: notifications = [] } = useQuery<AdminNotification[]>({
    queryKey: ['/api/admin/notifications'],
    refetchInterval: 15000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/admin/notifications/unread-count'],
    refetchInterval: 10000,
  });

  const { data: adminStats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 30000,
  });

  const { data: systemHealth, refetch: refetchHealth } = useQuery<SystemHealth>({
    queryKey: ['/api/admin/system-health'],
    refetchInterval: 60000,
    enabled: activeTab === 'system' || activeTab === 'overview',
  });

  const unreadCount = unreadData?.count || 0;

  const { data: userChats } = useQuery<{ user: any; total: number; conversations: any[] }>({
    queryKey: ['/api/super-admin/user', selectedUserId, 'conversations'],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/user/${selectedUserId}/conversations`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!selectedUserId,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/admin/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications/unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications/unread-count'] });
    },
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      apiRequest('POST', `/api/employee/users/${userId}/ban`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
      setActionModal(null);
      setActionReason('');
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => apiRequest('POST', `/api/employee/users/${userId}/unban`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] }),
  });

  const flagMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      apiRequest('POST', `/api/employee/users/${userId}/flag`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
      setActionModal(null);
      setActionReason('');
    },
  });

  const unflagMutation = useMutation({
    mutationFn: (userId: string) => apiRequest('POST', `/api/employee/users/${userId}/unflag`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] }),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      apiRequest('POST', `/api/employee/users/${userId}/suspend`, {
        reason,
        employeeId: currentUser?.id || '',
        employeeUsername: currentUser?.email || 'admin',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
      setActionModal(null);
      setActionReason('');
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest('POST', `/api/employee/users/${userId}/unsuspend`, {
        employeeId: currentUser?.id || '',
        employeeUsername: currentUser?.email || 'admin',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] }),
  });

  const modifySubMutation = useMutation({
    mutationFn: (data: { userId: string; tier: string; reason: string }) =>
      apiRequest('POST', '/api/admin/modify-subscription', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSubModalUser(null);
      setSubModalTier('');
      setSubModalReason('');
    },
  });

  const cancelSubMutation = useMutation({
    mutationFn: (data: { userId: string; reason: string }) =>
      apiRequest('POST', '/api/admin/cancel-user-subscription', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSubModalUser(null);
      setSubModalReason('');
    },
  });

  const grantCompMutation = useMutation({
    mutationFn: (data: { userId: string; tier: string; reason: string; durationMonths: number }) =>
      apiRequest('POST', '/api/admin/grant-complimentary', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSubModalUser(null);
      setSubModalTier('');
      setSubModalReason('');
      setSubModalDuration(0);
    },
  });

  const [diagResults, setDiagResults] = useState<DiagResult[] | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const runDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const res = await fetch('/api/admin/run-diagnostics', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Diagnostics] Error response:', res.status, errText);
        setDiagResults([{ check: 'Diagnostics', status: 'fail', details: `Server error: ${res.status}` }]);
        setDiagLoading(false);
        return;
      }
      const data = await res.json();
      setDiagResults(data.results || []);
    } catch (err: any) {
      console.error('[Diagnostics] Fetch error:', err);
      setDiagResults([{ check: 'Diagnostics', status: 'fail', details: 'Failed to connect to diagnostics endpoint' }]);
    }
    setDiagLoading(false);
  };

  const filteredUsers = users.filter(user => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toString().includes(searchTerm);

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'banned' && user.isBanned) ||
      (filterStatus === 'flagged' && user.isFlagged) ||
      (filterStatus === 'suspended' && user.isSuspended) ||
      (filterStatus === 'active' && !user.isBanned && !user.isFlagged && !user.isSuspended) ||
      (filterStatus === 'pro' && user.subscriptionTier === 'pro') ||
      (filterStatus === 'research' && user.subscriptionTier === 'research') ||
      (filterStatus === 'enterprise' && user.subscriptionTier === 'enterprise');

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => !u.isBanned && !u.isFlagged && !u.isSuspended).length,
    banned: users.filter(u => u.isBanned).length,
    flagged: users.filter(u => u.isFlagged).length,
    suspended: users.filter(u => u.isSuspended).length,
  };

  const handleAction = () => {
    if (!actionModal || !actionReason.trim()) return;
    const { type, userId } = actionModal;
    if (type === 'ban') banMutation.mutate({ userId, reason: actionReason.trim() });
    else if (type === 'flag') flagMutation.mutate({ userId, reason: actionReason.trim() });
    else if (type === 'suspend') suspendMutation.mutate({ userId, reason: actionReason.trim() });
  };

  const handleSubAction = () => {
    if (!subModalUser) return;
    if (subModalAction === 'modify' && subModalTier) {
      modifySubMutation.mutate({ userId: subModalUser.id, tier: subModalTier, reason: subModalReason });
    } else if (subModalAction === 'cancel') {
      cancelSubMutation.mutate({ userId: subModalUser.id, reason: subModalReason });
    } else if (subModalAction === 'grant' && subModalTier) {
      grantCompMutation.mutate({ userId: subModalUser.id, tier: subModalTier, reason: subModalReason, durationMonths: subModalDuration });
    }
  };

  const outageNotifications = notifications.filter(n => n.type === 'system_outage');
  const hasActiveOutage = outageNotifications.some(n => n.isRead === 'false');

  if (selectedUserId) {
    const selectedUser = users.find(u => u.id === selectedUserId);
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => setSelectedUserId(null)} className="mb-4 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <Card className="bg-gray-900 border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold">
                  {(selectedUser?.firstName?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  {selectedUser?.firstName} {selectedUser?.lastName}
                  <div className="text-sm text-gray-400 font-normal">{selectedUser?.email}</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap text-sm mb-4">
                <span className={`px-2 py-1 rounded font-medium ${
                  selectedUser?.subscriptionTier === 'enterprise' ? 'bg-amber-600/20 text-amber-400' :
                  selectedUser?.subscriptionTier === 'research' ? 'bg-purple-600/20 text-purple-400' :
                  selectedUser?.subscriptionTier === 'pro' ? 'bg-blue-600/20 text-blue-400' :
                  'bg-gray-600/20 text-gray-400'
                }`}>
                  {(selectedUser?.subscriptionTier || 'free').toUpperCase()}
                </span>
                {selectedUser?.isBanned && <span className="px-2 py-1 rounded bg-red-600/20 text-red-400">BANNED</span>}
                {selectedUser?.isFlagged && <span className="px-2 py-1 rounded bg-yellow-600/20 text-yellow-400">FLAGGED</span>}
                {selectedUser?.isSuspended && <span className="px-2 py-1 rounded bg-orange-600/20 text-orange-400">SUSPENDED</span>}
                {!selectedUser?.isBanned && !selectedUser?.isFlagged && !selectedUser?.isSuspended && (
                  <span className="px-2 py-1 rounded bg-green-600/20 text-green-400">ACTIVE</span>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                  if (selectedUser) {
                    setSubModalUser(selectedUser);
                    setSubModalAction('modify');
                    setSubModalTier(selectedUser.subscriptionTier || 'free');
                  }
                }}>
                  <CreditCard className="w-3 h-3 mr-1" /> Change Plan
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
                  if (selectedUser) {
                    setSubModalUser(selectedUser);
                    setSubModalAction('grant');
                    setSubModalTier('pro');
                    setSubModalDuration(0);
                  }
                }}>
                  <Gift className="w-3 h-3 mr-1" /> Grant Free Access
                </Button>
                {selectedUser?.subscriptionTier !== 'free' && (
                  <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => {
                    if (selectedUser) {
                      setSubModalUser(selectedUser);
                      setSubModalAction('cancel');
                    }
                  }}>
                    <X className="w-3 h-3 mr-1" /> Cancel Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" /> Chat History ({userChats?.total || 0} conversations)
          </h3>

          {userChats?.conversations && userChats.conversations.length > 0 ? (
            <div className="space-y-4">
              {userChats.conversations.map((conv: any) => (
                <Card key={conv.id} className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-300">
                      {conv.title || 'Untitled'} - {new Date(conv.createdAt).toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ViewConversationMessages conversationId={conv.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No conversations found for this user.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
              <Crown className="w-7 h-7 text-amber-500" />
              Command Center
            </h1>
            <p className="text-gray-400 text-sm mt-1">Ultimate admin authority - Full system control</p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveOutage && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 border border-red-600/50 rounded-full text-red-400 text-sm animate-pulse">
                <AlertTriangle className="w-4 h-4" /> Outage
              </div>
            )}
            <Link href="/">
              <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to App
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {([
            { id: 'overview', icon: BarChart3, label: 'Overview' },
            { id: 'users', icon: Users, label: 'Users' },
            { id: 'subscriptions', icon: CreditCard, label: 'Subscriptions' },
            { id: 'system', icon: Server, label: 'System & Debug' },
            { id: 'notifications', icon: Bell, label: 'Alerts' },
          ] as const).map(tab => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap relative ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
              {tab.id === 'notifications' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <OverviewTab
            stats={adminStats}
            systemHealth={systemHealth}
            users={users}
            unreadCount={unreadCount}
            onTabChange={setActiveTab}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={(id) => markReadMutation.mutate(id)}
            onMarkAllRead={() => markAllReadMutation.mutate()}
            onViewUser={(userId) => { setSelectedUserId(userId); setActiveTab('users'); }}
            selectedNotification={selectedNotification}
            onSelectNotification={setSelectedNotification}
          />
        )}

        {activeTab === 'subscriptions' && (
          <SubscriptionsTab
            users={users}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onModify={(user) => { setSubModalUser(user); setSubModalAction('modify'); setSubModalTier(user.subscriptionTier || 'free'); }}
            onCancel={(user) => { setSubModalUser(user); setSubModalAction('cancel'); }}
            onGrant={(user) => { setSubModalUser(user); setSubModalAction('grant'); setSubModalTier('pro'); setSubModalDuration(0); }}
            onViewUser={(userId) => setSelectedUserId(userId)}
            adminStats={adminStats}
          />
        )}

        {activeTab === 'system' && (
          <SystemTab
            systemHealth={systemHealth}
            diagResults={diagResults}
            diagLoading={diagLoading}
            onRunDiagnostics={runDiagnostics}
            onRefreshHealth={() => refetchHealth()}
          />
        )}

        {activeTab === 'users' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 text-center">
                  <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-gray-400">Total</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{stats.active}</div>
                  <div className="text-xs text-gray-400">Active</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 text-center">
                  <Ban className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{stats.banned}</div>
                  <div className="text-xs text-gray-400">Banned</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 text-center">
                  <Flag className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{stats.flagged}</div>
                  <div className="text-xs text-gray-400">Flagged</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800 col-span-2 md:col-span-1">
                <CardContent className="p-4 text-center">
                  <Pause className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{stats.suspended}</div>
                  <div className="text-xs text-gray-400">Suspended</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-900 border-gray-800 mb-6">
              <CardContent className="p-4">
                <div className="flex gap-3 flex-wrap items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, email, or ID..."
                      className="pl-9 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                  >
                    <option value="all">All Users</option>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                    <option value="flagged">Flagged</option>
                    <option value="suspended">Suspended</option>
                    <option value="pro">Pro Plan</option>
                    <option value="research">Research Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-400">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No users found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800 bg-gray-800/50">
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Name</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Email</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Plan</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Joined</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="p-3">
                              <div className="font-medium text-white">{user.firstName} {user.lastName}</div>
                              <div className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                            </td>
                            <td className="p-3 text-sm text-gray-300">{user.email || '-'}</td>
                            <td className="p-3">
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                user.subscriptionTier === 'enterprise' ? 'bg-amber-600/20 text-amber-400' :
                                user.subscriptionTier === 'research' ? 'bg-purple-600/20 text-purple-400' :
                                user.subscriptionTier === 'pro' ? 'bg-blue-600/20 text-blue-400' :
                                'bg-gray-600/20 text-gray-400'
                              }`}>
                                {(user.subscriptionTier || 'free').toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1 flex-wrap">
                                {user.isBanned && <span className="text-xs px-2 py-0.5 rounded bg-red-600/20 text-red-400">BANNED</span>}
                                {user.isFlagged && <span className="text-xs px-2 py-0.5 rounded bg-yellow-600/20 text-yellow-400">FLAGGED</span>}
                                {user.isSuspended && <span className="text-xs px-2 py-0.5 rounded bg-orange-600/20 text-orange-400">SUSPENDED</span>}
                                {!user.isBanned && !user.isFlagged && !user.isSuspended && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-green-600/20 text-green-400">ACTIVE</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-sm text-gray-400">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1 flex-wrap">
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20" onClick={() => setSelectedUserId(user.id)}>
                                  <Eye className="w-3 h-3 mr-1" /> View
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20" onClick={() => { setSubModalUser(user); setSubModalAction('modify'); setSubModalTier(user.subscriptionTier || 'free'); }}>
                                  <CreditCard className="w-3 h-3 mr-1" /> Plan
                                </Button>
                                {!user.isBanned ? (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => setActionModal({ type: 'ban', userId: user.id, userName: `${user.firstName} ${user.lastName}` })}>
                                    <Ban className="w-3 h-3 mr-1" /> Ban
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-900/20" onClick={() => unbanMutation.mutate(user.id)} disabled={unbanMutation.isPending}>
                                    Unban
                                  </Button>
                                )}
                                {!user.isFlagged ? (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20" onClick={() => setActionModal({ type: 'flag', userId: user.id, userName: `${user.firstName} ${user.lastName}` })}>
                                    <Flag className="w-3 h-3 mr-1" /> Flag
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-gray-400 hover:text-gray-300" onClick={() => unflagMutation.mutate(user.id)} disabled={unflagMutation.isPending}>
                                    Unflag
                                  </Button>
                                )}
                                {!user.isSuspended ? (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20" onClick={() => setActionModal({ type: 'suspend', userId: user.id, userName: `${user.firstName} ${user.lastName}` })}>
                                    <Pause className="w-3 h-3 mr-1" /> Suspend
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-900/20" onClick={() => unsuspendMutation.mutate(user.id)} disabled={unsuspendMutation.isPending}>
                                    <Play className="w-3 h-3 mr-1" /> Unsuspend
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {actionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-900 border-gray-700 w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white capitalize">{actionModal.type} User</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setActionModal(null); setActionReason(''); }}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300 text-sm">
                Are you sure you want to {actionModal.type} <strong>{actionModal.userName}</strong>?
              </p>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Reason</label>
                <Input
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={`Enter reason for ${actionModal.type}...`}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => { setActionModal(null); setActionReason(''); }} className="text-gray-400">
                  Cancel
                </Button>
                <Button
                  onClick={handleAction}
                  disabled={!actionReason.trim() || banMutation.isPending || flagMutation.isPending || suspendMutation.isPending}
                  className={`${
                    actionModal.type === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                    actionModal.type === 'flag' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-orange-600 hover:bg-orange-700'
                  } text-white`}
                >
                  Confirm {actionModal.type}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {subModalUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-900 border-gray-700 w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                {subModalAction === 'grant' ? <Gift className="w-5 h-5 text-green-400" /> :
                 subModalAction === 'cancel' ? <X className="w-5 h-5 text-red-400" /> :
                 <CreditCard className="w-5 h-5 text-blue-400" />}
                {subModalAction === 'grant' ? 'Grant Complimentary Access' :
                 subModalAction === 'cancel' ? 'Cancel Subscription' : 'Modify Subscription'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setSubModalUser(null); setSubModalTier(''); setSubModalReason(''); setSubModalDuration(0); }}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-sm text-gray-400">User</div>
                <div className="text-white font-medium">{subModalUser.firstName} {subModalUser.lastName}</div>
                <div className="text-gray-400 text-sm">{subModalUser.email}</div>
                <div className="mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    subModalUser.subscriptionTier === 'enterprise' ? 'bg-amber-600/20 text-amber-400' :
                    subModalUser.subscriptionTier === 'research' ? 'bg-purple-600/20 text-purple-400' :
                    subModalUser.subscriptionTier === 'pro' ? 'bg-blue-600/20 text-blue-400' :
                    'bg-gray-600/20 text-gray-400'
                  }`}>
                    Current: {(subModalUser.subscriptionTier || 'free').toUpperCase()}
                  </span>
                </div>
              </div>

              {subModalAction !== 'cancel' && (
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">
                    {subModalAction === 'grant' ? 'Grant Tier' : 'New Tier'}
                  </label>
                  <select
                    value={subModalTier}
                    onChange={(e) => setSubModalTier(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                  >
                    {subModalAction === 'modify' && <option value="free">Free</option>}
                    <option value="pro">Pro ($6.99/mo)</option>
                    <option value="research">Research ($15/mo)</option>
                    <option value="enterprise">Enterprise ($50/mo)</option>
                  </select>
                </div>
              )}

              {subModalAction === 'grant' && (
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Duration</label>
                  <select
                    value={subModalDuration}
                    onChange={(e) => setSubModalDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                  >
                    <option value={0}>Forever</option>
                    <option value={1}>1 Month</option>
                    <option value={2}>2 Months</option>
                    <option value={3}>3 Months</option>
                    <option value={4}>4 Months</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {subModalDuration === 0 ? 'Access will never expire' : `Access expires after ${subModalDuration} month${subModalDuration > 1 ? 's' : ''}`}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Reason (optional)</label>
                <Input
                  value={subModalReason}
                  onChange={(e) => setSubModalReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => { setSubModalUser(null); setSubModalTier(''); setSubModalReason(''); setSubModalDuration(0); }} className="text-gray-400">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubAction}
                  disabled={modifySubMutation.isPending || cancelSubMutation.isPending || grantCompMutation.isPending}
                  className={`text-white ${
                    subModalAction === 'cancel' ? 'bg-red-600 hover:bg-red-700' :
                    subModalAction === 'grant' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {modifySubMutation.isPending || cancelSubMutation.isPending || grantCompMutation.isPending ? 'Processing...' :
                   subModalAction === 'cancel' ? 'Cancel Subscription' :
                   subModalAction === 'grant' ? 'Grant Access' : 'Update Plan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ stats, systemHealth, users, unreadCount, onTabChange }: {
  stats: AdminStats | undefined;
  systemHealth: SystemHealth | undefined;
  users: UserData[];
  unreadCount: number;
  onTabChange: (tab: TabType) => void;
}) {
  const statusColor = systemHealth?.status === 'healthy' ? 'text-green-400' :
    systemHealth?.status === 'degraded' ? 'text-yellow-400' : 'text-red-400';
  const statusBg = systemHealth?.status === 'healthy' ? 'bg-green-600/20 border-green-600/50' :
    systemHealth?.status === 'degraded' ? 'bg-yellow-600/20 border-yellow-600/50' : 'bg-red-600/20 border-red-600/50';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-700/50 cursor-pointer hover:border-blue-600" onClick={() => onTabChange('users')}>
          <CardContent className="p-5">
            <Users className="w-6 h-6 text-blue-400 mb-2" />
            <div className="text-3xl font-bold text-white">{stats?.totalUsers || users.length}</div>
            <div className="text-sm text-blue-300">Total Users</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-700/50 cursor-pointer hover:border-green-600" onClick={() => onTabChange('subscriptions')}>
          <CardContent className="p-5">
            <DollarSign className="w-6 h-6 text-green-400 mb-2" />
            <div className="text-3xl font-bold text-white">${stats?.estimatedMonthlyRevenue || '0.00'}</div>
            <div className="text-sm text-green-300">Monthly Revenue</div>
          </CardContent>
        </Card>
        <Card className={`border cursor-pointer hover:opacity-90 ${statusBg}`} onClick={() => onTabChange('system')}>
          <CardContent className="p-5">
            <Activity className={`w-6 h-6 ${statusColor} mb-2`} />
            <div className={`text-3xl font-bold ${statusColor} capitalize`}>{systemHealth?.status || 'Unknown'}</div>
            <div className="text-sm text-gray-300">System Status</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-900/50 to-red-800/30 border-red-700/50 cursor-pointer hover:border-red-600" onClick={() => onTabChange('notifications')}>
          <CardContent className="p-5">
            <Bell className="w-6 h-6 text-red-400 mb-2" />
            <div className="text-3xl font-bold text-white">{unreadCount}</div>
            <div className="text-sm text-red-300">Unread Alerts</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" /> Subscription Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-300">Pro</span>
              </div>
              <span className="text-white font-bold">{stats?.subscriptions?.pro || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-gray-300">Research</span>
              </div>
              <span className="text-white font-bold">{stats?.subscriptions?.research || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-gray-300">Enterprise</span>
              </div>
              <span className="text-white font-bold">{stats?.subscriptions?.enterprise || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Server className="w-5 h-5 text-green-400" /> Services Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemHealth ? (
              <>
                <ServiceRow name="Database" status={systemHealth.services.database} icon={<Database className="w-4 h-4" />} />
                <ServiceRow name="PayPal" status={systemHealth.services.paypal} icon={<DollarSign className="w-4 h-4" />} />
                <ServiceRow name="AI Engine" status={systemHealth.services.ai} icon={<Brain className="w-4 h-4" />} />
                <div className="pt-2 border-t border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Uptime</span>
                    <span className="text-white">{systemHealth.uptimeFormatted}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-400">Memory</span>
                    <span className="text-white">{systemHealth.memory.heapUsed}MB / {systemHealth.memory.heapTotal}MB</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">Loading health data...</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-400" /> Moderation Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-red-900/20 rounded-lg">
              <Ban className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{stats?.moderation?.banned || 0}</div>
              <div className="text-xs text-gray-400">Banned</div>
            </div>
            <div className="text-center p-3 bg-orange-900/20 rounded-lg">
              <Pause className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{stats?.moderation?.suspended || 0}</div>
              <div className="text-xs text-gray-400">Suspended</div>
            </div>
            <div className="text-center p-3 bg-yellow-900/20 rounded-lg">
              <Flag className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{stats?.moderation?.flagged || 0}</div>
              <div className="text-xs text-gray-400">Flagged</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceRow({ name, status, icon }: { name: string; status: string; icon: any }) {
  const color = status === 'healthy' ? 'text-green-400' : status === 'degraded' ? 'text-yellow-400' : 'text-red-400';
  const bg = status === 'healthy' ? 'bg-green-600/20' : status === 'degraded' ? 'bg-yellow-600/20' : 'bg-red-600/20';
  return (
    <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
      <div className="flex items-center gap-2 text-gray-300">
        {icon} {name}
      </div>
      <span className={`text-xs px-2 py-1 rounded font-medium ${bg} ${color} capitalize`}>
        {status}
      </span>
    </div>
  );
}

function SubscriptionsTab({ users, searchTerm, setSearchTerm, onModify, onCancel, onGrant, onViewUser, adminStats }: {
  users: UserData[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  onModify: (u: UserData) => void;
  onCancel: (u: UserData) => void;
  onGrant: (u: UserData) => void;
  onViewUser: (id: string) => void;
  adminStats: AdminStats | undefined;
}) {
  const [subFilter, setSubFilter] = useState('all');
  const filtered = users.filter(u => {
    const matchesSearch = !searchTerm ||
      (u.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = subFilter === 'all' || u.subscriptionTier === subFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{adminStats?.subscriptions?.pro || 0}</div>
            <div className="text-xs text-gray-400">Pro ($6.99/mo)</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{adminStats?.subscriptions?.research || 0}</div>
            <div className="text-xs text-gray-400">Research ($15/mo)</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{adminStats?.subscriptions?.enterprise || 0}</div>
            <div className="text-xs text-gray-400">Enterprise ($50/mo)</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">${adminStats?.estimatedMonthlyRevenue || '0.00'}</div>
            <div className="text-xs text-gray-400">Est. Monthly Revenue</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search subscribers..."
                className="pl-9 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <select value={subFilter} onChange={e => setSubFilter(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm">
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="research">Research</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-800/50">
                  <th className="text-left p-3 text-sm font-medium text-gray-300">User</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-300">Plan</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-300">Status</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="p-3">
                      <div className="font-medium text-white">{user.firstName} {user.lastName}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        user.subscriptionTier === 'enterprise' ? 'bg-amber-600/20 text-amber-400' :
                        user.subscriptionTier === 'research' ? 'bg-purple-600/20 text-purple-400' :
                        user.subscriptionTier === 'pro' ? 'bg-blue-600/20 text-blue-400' :
                        'bg-gray-600/20 text-gray-400'
                      }`}>
                        {(user.subscriptionTier || 'free').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs ${user.subscriptionStatus === 'active' ? 'text-green-400' : 'text-gray-500'}`}>
                        {(user.subscriptionStatus || 'free').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-400 hover:bg-blue-900/20" onClick={() => onModify(user)}>
                          <CreditCard className="w-3 h-3 mr-1" /> Change
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:bg-green-900/20" onClick={() => onGrant(user)}>
                          <Gift className="w-3 h-3 mr-1" /> Grant
                        </Button>
                        {user.subscriptionTier !== 'free' && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-900/20" onClick={() => onCancel(user)}>
                            <X className="w-3 h-3 mr-1" /> Cancel
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-gray-400 hover:bg-gray-800" onClick={() => onViewUser(user.id)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SystemTab({ systemHealth, diagResults, diagLoading, onRunDiagnostics, onRefreshHealth }: {
  systemHealth: SystemHealth | undefined;
  diagResults: DiagResult[] | null;
  diagLoading: boolean;
  onRunDiagnostics: () => void;
  onRefreshHealth: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex gap-3 flex-wrap">
        <Button onClick={onRefreshHealth} className="bg-blue-600 hover:bg-blue-700">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Health
        </Button>
        <Button onClick={onRunDiagnostics} disabled={diagLoading} className="bg-amber-600 hover:bg-amber-700">
          <Wrench className="w-4 h-4 mr-2" /> {diagLoading ? 'Running Diagnostics...' : 'Run Diagnostics & Auto-Fix'}
        </Button>
      </div>

      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`border ${
            systemHealth.status === 'healthy' ? 'bg-green-900/20 border-green-600/50' :
            systemHealth.status === 'degraded' ? 'bg-yellow-900/20 border-yellow-600/50' :
            'bg-red-900/20 border-red-600/50'
          }`}>
            <CardContent className="p-5 text-center">
              <Activity className={`w-8 h-8 mx-auto mb-2 ${
                systemHealth.status === 'healthy' ? 'text-green-400' :
                systemHealth.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
              }`} />
              <div className={`text-2xl font-bold capitalize ${
                systemHealth.status === 'healthy' ? 'text-green-400' :
                systemHealth.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {systemHealth.status}
              </div>
              <div className="text-sm text-gray-400">Overall Status</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <div className="text-2xl font-bold text-white">{systemHealth.uptimeFormatted}</div>
              <div className="text-sm text-gray-400">Uptime</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-purple-400" />
              <div className="text-2xl font-bold text-white">{systemHealth.memory.heapUsed}MB</div>
              <div className="text-sm text-gray-400">Memory Used ({Math.round((systemHealth.memory.heapUsed / systemHealth.memory.heapTotal) * 100)}%)</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Server className="w-5 h-5 text-green-400" /> Service Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {systemHealth ? (
            <>
              <ServiceRow name="Database" status={systemHealth.services.database} icon={<Database className="w-4 h-4" />} />
              <ServiceRow name="PayPal Payments" status={systemHealth.services.paypal} icon={<DollarSign className="w-4 h-4" />} />
              <ServiceRow name="AI Engine (Gemini)" status={systemHealth.services.ai} icon={<Brain className="w-4 h-4" />} />
            </>
          ) : (
            <p className="text-gray-500 text-center py-4">Loading...</p>
          )}
        </CardContent>
      </Card>

      {diagResults && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" /> Diagnostic Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {diagResults.map((r, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                r.status === 'pass' ? 'bg-green-900/20' :
                r.status === 'fixed' ? 'bg-blue-900/20' :
                r.status === 'warn' ? 'bg-yellow-900/20' : 'bg-red-900/20'
              }`}>
                <div className="mt-0.5">
                  {r.status === 'pass' ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                   r.status === 'fixed' ? <Wrench className="w-4 h-4 text-blue-400" /> :
                   r.status === 'warn' ? <AlertTriangle className="w-4 h-4 text-yellow-400" /> :
                   <X className="w-4 h-4 text-red-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{r.check}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      r.status === 'pass' ? 'bg-green-600/30 text-green-400' :
                      r.status === 'fixed' ? 'bg-blue-600/30 text-blue-400' :
                      r.status === 'warn' ? 'bg-yellow-600/30 text-yellow-400' : 'bg-red-600/30 text-red-400'
                    }`}>
                      {r.status === 'fixed' ? 'AUTO-FIXED' : r.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">{r.details}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {systemHealth && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" /> System Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Total Users</div>
                <div className="text-xl font-bold text-white">{systemHealth.totalUsers}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Heap Used</div>
                <div className="text-xl font-bold text-white">{systemHealth.memory.heapUsed}MB</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Heap Total</div>
                <div className="text-xl font-bold text-white">{systemHealth.memory.heapTotal}MB</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">RSS Memory</div>
                <div className="text-xl font-bold text-white">{systemHealth.memory.rss}MB</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Last health check: {new Date(systemHealth.lastHealthCheck).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NotificationsPanel({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onViewUser,
  selectedNotification,
  onSelectNotification,
}: {
  notifications: AdminNotification[];
  unreadCount: number;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onViewUser: (userId: string) => void;
  selectedNotification: AdminNotification | null;
  onSelectNotification: (n: AdminNotification | null) => void;
}) {
  if (selectedNotification) {
    const n = selectedNotification;
    const isOutage = n.type === 'system_outage';
    return (
      <div>
        <Button variant="ghost" onClick={() => onSelectNotification(null)} className="mb-4 text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Alerts
        </Button>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                {isOutage ? <Server className="w-5 h-5 text-red-500" /> :
                 <ShieldAlert className={`w-5 h-5 ${n.type === 'threat' ? 'text-red-500' : 'text-yellow-500'}`} />}
                {isOutage ? 'System Outage Alert' :
                 n.type === 'threat' ? 'Threat Detected' : 'Inappropriate Content Detected'}
              </CardTitle>
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                isOutage ? 'bg-red-600/20 text-red-400' :
                n.type === 'threat' ? 'bg-red-600/20 text-red-400' : 'bg-yellow-600/20 text-yellow-400'
              }`}>
                {n.type.toUpperCase().replace('_', ' ')}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!isOutage && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-blue-400" /> User Information
                  </h4>
                  <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Name</span>
                      <span className="text-white text-sm font-medium">{n.userFirstName} {n.userLastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Email</span>
                      <span className="text-white text-sm">{n.userEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">User ID</span>
                      <span className="text-white text-sm font-mono">{n.userId.slice(0, 12)}...</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" /> Event Details
                  </h4>
                  <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Date</span>
                      <span className="text-white text-sm">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Time</span>
                      <span className="text-white text-sm">{new Date(n.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                {isOutage ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                {isOutage ? 'Outage Details' : 'Flagged Message'}
              </h4>
              <div className={`${isOutage ? 'bg-red-900/30 border border-red-700/50' : 'bg-red-900/20 border border-red-800/50'} rounded-lg p-4`}>
                <p className="text-red-200 text-sm break-words whitespace-pre-wrap">{n.flaggedContent}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-400" /> Action Taken
              </h4>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-300 text-sm">{n.actionTaken}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {!isOutage && (
                <Button onClick={() => onViewUser(n.userId)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Eye className="w-4 h-4 mr-2" /> View User
                </Button>
              )}
              {n.isRead === 'false' && (
                <Button onClick={() => onMarkRead(n.id)} variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark as Read
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-yellow-400" />
          Alerts & Notifications
          {unreadCount > 0 && (
            <span className="bg-red-600 text-white text-xs rounded-full px-2 py-0.5 ml-2">{unreadCount} new</span>
          )}
        </h2>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={onMarkAllRead} className="border-gray-700 text-gray-300 hover:text-white">
            <CheckCircle className="w-3 h-3 mr-1" /> Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
            <p className="text-gray-400">No alerts yet. All clear!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isOutage = n.type === 'system_outage';
            return (
              <Card
                key={n.id}
                className={`border cursor-pointer transition-colors hover:bg-gray-800/50 ${
                  n.isRead === 'false'
                    ? isOutage ? 'bg-red-900/20 border-red-700/50' : 'bg-gray-900 border-red-800/50'
                    : 'bg-gray-900/50 border-gray-800'
                }`}
                onClick={() => {
                  onSelectNotification(n);
                  if (n.isRead === 'false') onMarkRead(n.id);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 p-2 rounded-full ${
                      isOutage ? 'bg-red-600/30' :
                      n.type === 'threat' ? 'bg-red-600/20' : 'bg-yellow-600/20'
                    }`}>
                      {isOutage ? <Server className="w-4 h-4 text-red-400" /> :
                       <ShieldAlert className={`w-4 h-4 ${n.type === 'threat' ? 'text-red-400' : 'text-yellow-400'}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-medium">
                          {isOutage ? 'System Alert' : `${n.userFirstName} ${n.userLastName}`}
                        </span>
                        {!isOutage && <span className="text-gray-500 text-xs">{n.userEmail}</span>}
                        {n.isRead === 'false' && (
                          <span className="bg-red-600 rounded-full w-2 h-2 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-gray-400 text-sm truncate">
                        {n.flaggedContent.length > 100 ? n.flaggedContent.slice(0, 100) + '...' : n.flaggedContent}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className={`px-1.5 py-0.5 rounded ${
                          isOutage ? 'bg-red-600/30 text-red-400' :
                          n.type === 'threat' ? 'bg-red-600/20 text-red-400' : 'bg-yellow-600/20 text-yellow-400'
                        }`}>
                          {isOutage ? 'OUTAGE' : n.type.toUpperCase()}
                        </span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-gray-500 mt-2 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ViewConversationMessages({ conversationId }: { conversationId: number }) {
  const { data: messages = [] } = useQuery<Array<{ id: number; content: string; role: string; timestamp: string }>>({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (messages.length === 0) return <p className="text-gray-500 text-sm">No messages</p>;

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {messages.map((msg) => (
        <div key={msg.id} className={`text-sm p-2 rounded ${msg.role === 'user' ? 'bg-blue-900/20 text-blue-200' : 'bg-gray-800 text-gray-300'}`}>
          <span className="text-xs text-gray-500 font-medium uppercase">{msg.role}: </span>
          <span>{msg.content.length > 300 ? msg.content.slice(0, 300) + '...' : msg.content}</span>
        </div>
      ))}
    </div>
  );
}
