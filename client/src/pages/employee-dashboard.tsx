import { useState, useEffect, useRef } from 'react';
import { primeAudioContext } from '@/lib/audio-manager';
import { SCENARIOS, type LockdownScenario } from '@/components/lockdown-screen';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import {
  Search, Ban, Flag, Shield, Users, AlertTriangle, CheckCircle, Pause, Play, Eye,
  ArrowLeft, MessageSquare, X, Bell, ShieldAlert, Clock, Mail, User as UserIcon,
  FileText, CreditCard, Gift, Settings, Activity, Wrench, Crown, Zap, Server,
  Database, Brain, DollarSign, TrendingUp, RefreshCw, ChevronDown, BarChart3, Trash2,
  Copy, Plus, ExternalLink, Link2, Calendar, FlaskConical, Send, ThumbsUp, ThumbsDown,
  Bug, Terminal, Filter, XCircle, AlertOctagon, CheckSquare, SlidersHorizontal,
  ChevronRight, AlertCircle, Layers, LayoutDashboard, LogOut, ChevronLeft,
  Cpu, HardDrive, Radio, Circle, Wifi, WifiOff, MemoryStick, ShieldCheck, Siren, Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  homeAddress?: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  isBanned: boolean;
  isFlagged: boolean;
  flagReason?: string;
  banReason?: string;
  banExpiresAt?: string;
  banDuration?: string;
  isSuspended: boolean;
  suspensionReason?: string;
  suspendedBy?: string;
  suspendedAt?: string;
  createdAt: string;
  lastLoginAt?: string;
  isEmployee?: boolean;
  employeeRole?: string;
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

interface TrackedError {
  id: string;
  timestamp: string;
  lastSeen: string;
  type: string;
  message: string;
  stack?: string;
  route?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  autoFixAttempted: boolean;
  autoFixResult?: string;
  occurrences: number;
}

interface ErrorLog {
  errors: TrackedError[];
  stats: { total: number; unresolved: number; critical: number; high: number; byType: Record<string, number> };
}

interface ActivityEntry {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  status: number;
  duration: number;
}

type TabType = 'commandcenter' | 'overview' | 'users' | 'subscriptions' | 'system' | 'notifications' | 'flagged' | 'invite' | 'beta' | 'security';

export default function EmployeeDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ type: string; userId: string; userName: string; userEmail?: string } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [banDuration, setBanDuration] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabType>('commandcenter');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lockdownConfirm, setLockdownConfirm] = useState(false);
  const [lockdownScenario, setLockdownScenario] = useState<LockdownScenario>('system_failure');
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);
  const [subModalUser, setSubModalUser] = useState<UserData | null>(null);
  const [subModalTier, setSubModalTier] = useState('');
  const [subModalReason, setSubModalReason] = useState('');
  const [subModalAction, setSubModalAction] = useState<'modify' | 'cancel' | 'grant'>('modify');
  const [subModalDuration, setSubModalDuration] = useState<number>(0);
  const [deleteModal, setDeleteModal] = useState<{ userId: string; userName: string } | null>(null);
  const [deleteVerificationCode, setDeleteVerificationCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

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
    refetchInterval: 30000,
  });

  const { data: lockdownStatus, refetch: refetchLockdown } = useQuery<{ active: boolean; activatedAt: string | null }>({
    queryKey: ['/api/system/lockdown-status'],
    refetchInterval: 10000,
  });

  const activateLockdownMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/lockdown/activate', { scenario: lockdownScenario }),
    onSuccess: () => { refetchLockdown(); setLockdownConfirm(false); toast({ title: 'Lockdown activated', description: 'All users now see the critical malfunction screen.', variant: 'destructive' }); },
    onError: () => toast({ title: 'Failed to activate lockdown', variant: 'destructive' }),
  });

  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const emailAllMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/lockdown/email-all', { scenario: lockdownScenario }),
    onSuccess: (data: any) => { toast({ title: `Emails sent`, description: `${data.sent} of ${data.total} users notified.` }); setShowEmailPreview(false); },
    onError: () => toast({ title: 'Email blast failed', variant: 'destructive' }),
  });

  const deactivateLockdownMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/lockdown/deactivate'),
    onSuccess: () => { refetchLockdown(); toast({ title: 'Lockdown lifted', description: 'Service restored to all users.' }); },
    onError: () => toast({ title: 'Failed to lift lockdown', variant: 'destructive' }),
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
    mutationFn: ({ userId, reason, durationMonths }: { userId: string; reason: string; durationMonths?: number }) =>
      apiRequest('POST', `/api/employee/users/${userId}/ban`, { reason, durationMonths }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
      setActionModal(null);
      setActionReason('');
      setBanDuration(0);
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => apiRequest('POST', `/api/employee/users/${userId}/unban`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
      setActionModal(null);
      toast({ title: 'User unbanned', description: 'The ban has been lifted and the user can log in again.' });
    },
    onError: (err: any) => toast({ title: 'Failed to unban user', description: err?.message || 'Unknown error', variant: 'destructive' }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
      toast({ title: 'User unflagged', description: 'The flag has been cleared.' });
    },
    onError: (err: any) => toast({ title: 'Failed to unflag user', description: err?.message || 'Unknown error', variant: 'destructive' }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
      setActionModal(null);
      toast({ title: 'User unsuspended', description: 'Suspension lifted — the user can access TurboAnswer again.' });
    },
    onError: (err: any) => toast({ title: 'Failed to unsuspend user', description: err?.message || 'Unknown error', variant: 'destructive' }),
  });

  const setAdminMutation = useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}/set-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ grant }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, verificationCode }: { userId: string; verificationCode: string }) => {
      const res = await apiRequest('POST', '/api/admin/delete-user', { userId, verificationCode });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setDeleteModal(null);
      setDeleteVerificationCode('');
      setDeleteError('');
    },
    onError: (error: any) => {
      setDeleteError(error.message || 'Failed to delete user');
    },
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
    if (!actionModal) return;
    const { type, userId } = actionModal;
    // unban, unsuspend, and unflag don't need a reason
    if (type === 'unban') { unbanMutation.mutate(userId); return; }
    if (type === 'unsuspend') { unsuspendMutation.mutate(userId); return; }
    if (type === 'unflag') { unflagMutation.mutate(userId); return; }
    // all other actions require a reason
    if (!actionReason.trim()) return;
    if (type === 'ban') banMutation.mutate({ userId, reason: actionReason.trim(), durationMonths: banDuration || undefined });
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
      <div className="min-h-screen bg-black text-slate-100 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => setSelectedUserId(null)} className="mb-4 text-slate-400 hover:text-white">
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
                  {selectedUser?.homeAddress && <div className="text-xs text-gray-500 font-normal">Address: {selectedUser.homeAddress}</div>}
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
                {selectedUser?.isBanned && (
                  <span className="px-2 py-1 rounded bg-red-600/20 text-red-400" title={selectedUser?.banExpiresAt ? `Expires: ${new Date(selectedUser.banExpiresAt).toLocaleDateString()}` : 'Permanent'}>
                    BANNED {selectedUser?.banDuration ? `(${selectedUser.banDuration})` : '(permanent)'}
                  </span>
                )}
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

  const flaggedCount = users.filter(u => u.isFlagged || u.isSuspended || u.isBanned).length;

  const navItems = [
    { id: 'commandcenter' as TabType, icon: LayoutDashboard, label: 'Command Center' },
    { id: 'users' as TabType, icon: Users, label: 'Users' },
    { id: 'subscriptions' as TabType, icon: CreditCard, label: 'Subscriptions' },
    { id: 'system' as TabType, icon: Terminal, label: 'System & Debug' },
    { id: 'flagged' as TabType, icon: Flag, label: 'Flagged', badge: flaggedCount },
    { id: 'notifications' as TabType, icon: Bell, label: 'Alerts', badge: unreadCount },
    { id: 'invite' as TabType, icon: Shield, label: 'Admin Invites' },
    { id: 'beta' as TabType, icon: FlaskConical, label: 'Beta Testing' },
    { id: 'security' as TabType, icon: ShieldCheck, label: 'Security' },
  ];

  const svcStatus = systemHealth?.services;

  const isOwner = (currentUser as any)?.email === 'support@turboanswer.it.com';
  const isLocked = lockdownStatus?.active ?? false;

  return (
    <div className="admin-panel h-screen flex flex-col overflow-hidden" style={{ background: '#000000', color: '#e2e8f0' }}>

      {/* ── TOP STATUS BAR ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b"
        style={{ background: '#080808', borderColor: '#1a1a1a', minHeight: '44px' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors">
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white/60" />
            </div>
            <span className="text-xs font-bold text-white/80 tracking-[0.15em] uppercase">Turbo Admin</span>
          </div>
          <div className="w-px h-3 bg-white/10 mx-1" />
          <div className="flex items-center gap-2.5">
            {['database', 'paypal', 'ai'].map((svc, i) => {
              const st = [svcStatus?.database, svcStatus?.paypal, svcStatus?.ai][i];
              const labels = ['DB', 'PAY', 'AI'];
              const dot = st === 'healthy' ? '#22c55e' : st === 'degraded' ? '#eab308' : st ? '#ef4444' : '#333';
              return (
                <div key={svc} className="flex items-center gap-1 font-mono text-[10px]">
                  <span style={{ color: dot }}>●</span>
                  <span style={{ color: '#555' }}>{labels[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: '#444' }}>
            <span style={{ color: '#555' }}>{adminStats?.totalUsers || users.length}<span style={{ color: '#333' }}> users</span></span>
            <span style={{ color: '#22c55e' }}>${adminStats?.estimatedMonthlyRevenue || '0'}<span style={{ color: '#333' }}>/mo</span></span>
            {systemHealth?.uptimeFormatted && <span>↑{systemHealth.uptimeFormatted}</span>}
          </div>
          {hasActiveOutage && (
            <div className="flex items-center gap-1 px-2 py-1 rounded font-mono text-[10px] font-bold animate-pulse"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
              <AlertTriangle className="w-2.5 h-2.5" /> OUTAGE
            </div>
          )}

          {/* LOCKDOWN BUTTON — owner only */}
          {isOwner && (
            isLocked ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => deactivateLockdownMutation.mutate()}
                  disabled={deactivateLockdownMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[10px] font-bold tracking-widest uppercase transition-all animate-pulse"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', color: '#ef4444' }}>
                  <Shield className="w-3 h-3" />
                  {deactivateLockdownMutation.isPending ? 'LIFTING...' : '⚠ LIFT'}
                </button>
                <button
                  onClick={() => setShowEmailPreview(v => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded font-mono text-[10px] font-bold uppercase tracking-widest transition-all"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>
                  <Mail className="w-3 h-3" /> EMAIL ALL
                </button>
              </div>
            ) : (
              lockdownConfirm ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <select
                    value={lockdownScenario}
                    onChange={e => setLockdownScenario(e.target.value as LockdownScenario)}
                    className="px-2 py-1.5 rounded font-mono text-[10px] outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #333', color: '#ccc', maxWidth: '160px' }}>
                    {(Object.entries(SCENARIOS) as [LockdownScenario, typeof SCENARIOS[LockdownScenario]][]).map(([key, s]) => (
                      <option key={key} value={key}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => { primeAudioContext(); activateLockdownMutation.mutate(); }}
                    disabled={activateLockdownMutation.isPending}
                    className="px-2.5 py-1.5 rounded font-mono text-[10px] font-black uppercase tracking-widest transition-all"
                    style={{ background: '#dc2626', color: '#fff', border: '1px solid #ef4444' }}>
                    {activateLockdownMutation.isPending ? '...' : 'CONFIRM LOCK'}
                  </button>
                  <button
                    onClick={() => setLockdownConfirm(false)}
                    className="px-2 py-1.5 rounded font-mono text-[10px] text-zinc-500 hover:text-white transition-colors"
                    style={{ border: '1px solid #222' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setLockdownConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[10px] font-bold tracking-widest uppercase transition-all hover:scale-105"
                  style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
                  <Shield className="w-3 h-3" /> LOCKDOWN
                </button>
              )
            )
          )}

          <Link href="/">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
              style={{ border: '1px solid #1a1a1a' }}>
              <ArrowLeft className="w-3 h-3" /> App
            </button>
          </Link>
        </div>
      </header>

      {/* ── EMAIL ALL PREVIEW PANEL ── */}
      {showEmailPreview && isOwner && isLocked && (
        <div className="flex-shrink-0 px-4 py-3 border-b flex items-start gap-4"
          style={{ background: 'rgba(30,58,138,0.15)', borderColor: 'rgba(59,130,246,0.2)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-blue-400">Incident Email Blast</span>
              <span className="font-mono text-[9px] text-zinc-500">— will notify all non-banned users about this {lockdownScenario.replace('_', ' ')} event</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              This will send a transactional email to every active account notifying them of the current lockdown event. Emails are rate-limited per-user and delivered via Brevo.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => emailAllMutation.mutate()}
              disabled={emailAllMutation.isPending}
              className="px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase tracking-widest transition-all"
              style={{ background: '#1d4ed8', color: '#fff', border: '1px solid #3b82f6' }}>
              {emailAllMutation.isPending ? 'SENDING...' : 'SEND EMAILS'}
            </button>
            <button
              onClick={() => setShowEmailPreview(false)}
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              style={{ border: '1px solid #1a1a1a' }}>
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ── BODY: SIDEBAR + MAIN ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ── */}
        <aside className="flex-shrink-0 flex flex-col border-r overflow-y-auto"
          style={{ width: sidebarCollapsed ? '48px' : '190px', background: '#050505', borderColor: '#141414', transition: 'width 0.2s ease' }}>
          <nav className="flex flex-col gap-px p-1.5 flex-1">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded text-left relative transition-all"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                    borderLeft: isActive ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                    color: isActive ? '#f4f4f5' : '#525252',
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isActive ? '#e4e4e7' : '#404040' }} />
                  {!sidebarCollapsed && <span className="text-[11px] font-medium truncate tracking-wide">{item.label}</span>}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute right-2 top-1.5 min-w-[16px] h-4 flex items-center justify-center rounded text-[9px] font-bold"
                      style={{ background: '#7f1d1d', color: '#fca5a5' }}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="flex-1" />
            <div className="border-t mt-2 pt-1.5" style={{ borderColor: '#141414' }}>
              <Link href="/email-templates">
                <button className="flex items-center gap-2.5 px-2.5 py-2 rounded w-full transition-colors"
                  style={{ color: '#3f3f46' }}
                  title={sidebarCollapsed ? 'Email Templates' : undefined}>
                  <Mail className="w-3.5 h-3.5 flex-shrink-0 text-zinc-700" />
                  {!sidebarCollapsed && <span className="text-[11px] font-medium">Email Templates</span>}
                </button>
              </Link>
            </div>
          </nav>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#000000' }}>
          <div className="p-5">

        {activeTab === 'commandcenter' && (
          <CommandCenter
            stats={adminStats}
            systemHealth={systemHealth}
            users={users}
            notifications={notifications}
            unreadCount={unreadCount}
            onTabChange={setActiveTab}
            onViewUser={(userId) => { setSelectedUserId(userId); setActiveTab('users'); }}
            onMarkRead={(id) => markReadMutation.mutate(id)}
          />
        )}

        {activeTab === 'overview' && (
          <OverviewTab
            stats={adminStats}
            systemHealth={systemHealth}
            users={users}
            unreadCount={unreadCount}
            onTabChange={setActiveTab}
          />
        )}

        {activeTab === 'flagged' && (
          <FlaggedUsersTab
            users={users}
            notifications={notifications.filter(n => n.type !== 'system_outage')}
            onViewUser={(userId) => { setSelectedUserId(userId); setActiveTab('users'); }}
            onAction={(type, userId, userName, userEmail) => setActionModal({ type, userId, userName, userEmail })}
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
                              <div className="flex items-center gap-1.5">
                                <div className="font-medium text-white">{user.firstName} {user.lastName}</div>
                                {user.isEmployee && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-700/40 text-red-300 border border-red-700/50 font-bold">ADMIN</span>
                                )}
                              </div>
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
                                {user.isBanned && <span className="text-xs px-2 py-0.5 rounded bg-red-600/20 text-red-400" title={user.banExpiresAt ? `Expires: ${new Date(user.banExpiresAt).toLocaleDateString()}` : 'Permanent'}>BANNED{user.banDuration ? ` (${user.banDuration})` : ''}</span>}
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
                                {user.isEmployee ? (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-orange-300 border-orange-600 hover:bg-orange-900/30" onClick={() => setAdminMutation.mutate({ userId: user.id, grant: false })} disabled={setAdminMutation.isPending}>
                                    <Shield className="w-3 h-3 mr-1" /> Revoke Admin
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-purple-300 border-purple-600 hover:bg-purple-900/30" onClick={() => setAdminMutation.mutate({ userId: user.id, grant: true })} disabled={setAdminMutation.isPending}>
                                    <Shield className="w-3 h-3 mr-1" /> Make Admin
                                  </Button>
                                )}
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
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-400 hover:bg-red-900/30" onClick={() => { setDeleteModal({ userId: user.id, userName: `${user.firstName} ${user.lastName}` }); setDeleteVerificationCode(''); setDeleteError(''); }}>
                                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                                </Button>
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

        {activeTab === 'invite' && (
          <AdminInviteTab currentUser={currentUser} />
        )}
        {activeTab === 'beta' && (
          <BetaTestingTab />
        )}
        {activeTab === 'security' && (
          <SecurityTab />
        )}

          </div>
        </main>
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
              {actionModal.type === 'ban' && (
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Ban Duration</label>
                  <select
                    value={banDuration}
                    onChange={(e) => setBanDuration(parseInt(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
                  >
                    <option value={0}>Permanent</option>
                    <option value={1}>1 Month</option>
                    <option value={2}>2 Months</option>
                    <option value={3}>3 Months</option>
                    <option value={4}>4 Months</option>
                    <option value={12}>12 Months</option>
                  </select>
                  {banDuration > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Ban expires: {new Date(Date.now() + banDuration * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
              {actionModal.type !== 'unban' && actionModal.type !== 'unsuspend' && actionModal.type !== 'unflag' && (
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Reason</label>
                  <Input
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder={`Enter reason for ${actionModal.type}...`}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => { setActionModal(null); setActionReason(''); setBanDuration(0); }} className="text-gray-400">
                  Cancel
                </Button>
                <Button
                  onClick={handleAction}
                  disabled={
                    (actionModal.type !== 'unban' && actionModal.type !== 'unsuspend' && actionModal.type !== 'unflag' && !actionReason.trim()) ||
                    banMutation.isPending || flagMutation.isPending || suspendMutation.isPending ||
                    unbanMutation.isPending || unsuspendMutation.isPending || unflagMutation.isPending
                  }
                  className={`${
                    actionModal.type === 'unban' || actionModal.type === 'unsuspend' || actionModal.type === 'unflag' ? 'bg-green-600 hover:bg-green-700' :
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

      {deleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-900 border-gray-700 w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-red-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Delete User Account
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setDeleteModal(null); setDeleteVerificationCode(''); setDeleteError(''); }}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3">
                <p className="text-red-300 text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> This action is permanent and cannot be undone
                </p>
              </div>
              <p className="text-gray-300 text-sm">
                You are about to permanently delete the account for <strong className="text-white">{deleteModal.userName}</strong>. This will remove all their data, cancel any active subscriptions, and revoke team access.
              </p>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Enter verification code to confirm</label>
                <Input
                  type="password"
                  value={deleteVerificationCode}
                  onChange={(e) => { setDeleteVerificationCode(e.target.value); setDeleteError(''); }}
                  placeholder="Enter admin verification code..."
                  className="bg-gray-800 border-gray-700 text-white"
                />
                {deleteError && (
                  <p className="text-red-400 text-xs mt-1">{deleteError}</p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => { setDeleteModal(null); setDeleteVerificationCode(''); setDeleteError(''); }} className="text-gray-400">
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteUserMutation.mutate({ userId: deleteModal.userId, verificationCode: deleteVerificationCode })}
                  disabled={!deleteVerificationCode.trim() || deleteUserMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete Account'}
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
                    <option value="research">Research ($30/mo)</option>
                    <option value="enterprise">Enterprise ($100/mo)</option>
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

function AdminInviteTab({ currentUser }: { currentUser: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: tokens = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/invite-tokens'],
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/invite-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ label: newLabel || 'Admin Invite', maxUses, expiresInDays: expiresInDays || undefined }),
      });
      if (!res.ok) throw new Error('Failed to create token');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invite-tokens'] });
      setNewLabel('');
      setMaxUses(1);
      setExpiresInDays('');
      toast({ title: 'Invite link created!', description: 'Share the link with the person you want to give admin access.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create invite link.', variant: 'destructive' }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/invite-tokens/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to revoke');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invite-tokens'] });
      toast({ title: 'Link revoked', description: 'The invite link is no longer usable.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to revoke link.', variant: 'destructive' }),
  });

  const getInviteUrl = (token: string) => `${window.location.origin}/register?invite=${token}`;

  const copyLink = (token: any) => {
    navigator.clipboard.writeText(getInviteUrl(token.token));
    setCopiedId(token.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeTokens = tokens.filter((t: any) => !t.isRevoked);
  const revokedTokens = tokens.filter((t: any) => t.isRevoked);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Admin Invite Links</h2>
        <p className="text-sm text-gray-400">Create invite links. Anyone who registers using one will automatically get admin access.</p>
      </div>

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Plus size={16} className="text-red-400" /> Create New Invite Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Label (optional)</label>
              <Input
                placeholder="e.g. John's admin link"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Max uses</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={maxUses}
                onChange={e => setMaxUses(parseInt(e.target.value) || 1)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Expires in (days, optional)</label>
              <Input
                type="number"
                min={1}
                placeholder="No expiry"
                value={expiresInDays}
                onChange={e => setExpiresInDays(e.target.value ? parseInt(e.target.value) : '')}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="bg-red-700 hover:bg-red-800 text-white"
          >
            <Plus size={14} className="mr-1.5" />
            {createMutation.isPending ? 'Creating...' : 'Generate Invite Link'}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading invite links...</div>
      ) : activeTokens.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Shield size={40} className="mx-auto mb-3 opacity-30" />
          <p>No active invite links. Create one above to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Active Links ({activeTokens.length})</h3>
          {activeTokens.map((token: any) => {
            const url = getInviteUrl(token.token);
            const isExpired = token.expiresAt && new Date() > new Date(token.expiresAt);
            const isExhausted = token.maxUses && token.currentUses >= token.maxUses;
            return (
              <Card key={token.id} className={`border ${isExpired || isExhausted ? 'border-yellow-700/50 bg-yellow-900/10' : 'border-gray-700 bg-gray-900'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield size={14} className="text-red-400 flex-shrink-0" />
                        <span className="font-semibold text-white text-sm">{token.label}</span>
                        {isExpired && <span className="text-[10px] bg-yellow-800 text-yellow-300 px-1.5 py-0.5 rounded">EXPIRED</span>}
                        {isExhausted && <span className="text-[10px] bg-orange-800 text-orange-300 px-1.5 py-0.5 rounded">USED UP</span>}
                        {!isExpired && !isExhausted && <span className="text-[10px] bg-green-800 text-green-300 px-1.5 py-0.5 rounded">ACTIVE</span>}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-[11px] text-gray-400 bg-gray-800 px-2 py-1 rounded truncate max-w-xs block">{url}</code>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1"><Users size={11} /> {token.currentUses}/{token.maxUses ?? '∞'} uses</span>
                        <span className="flex items-center gap-1"><Calendar size={11} /> Created {new Date(token.createdAt).toLocaleDateString()}</span>
                        {token.expiresAt && <span className="flex items-center gap-1"><Clock size={11} /> Expires {new Date(token.expiresAt).toLocaleDateString()}</span>}
                        {token.createdByEmail && <span className="flex items-center gap-1"><UserIcon size={11} /> By {token.createdByEmail}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(token)}
                        className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 h-8 px-2.5"
                      >
                        {copiedId === token.id ? <CheckCircle size={13} className="text-green-400" /> : <Copy size={13} />}
                        <span className="ml-1 text-xs">{copiedId === token.id ? 'Copied!' : 'Copy'}</span>
                      </Button>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 h-8 w-8 p-0">
                          <ExternalLink size={13} />
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revokeMutation.mutate(token.id)}
                        disabled={revokeMutation.isPending}
                        className="border-red-800 text-red-400 hover:text-red-300 hover:bg-red-900/30 h-8 px-2.5"
                      >
                        <Trash2 size={13} />
                        <span className="ml-1 text-xs">Revoke</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {revokedTokens.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Revoked ({revokedTokens.length})</h3>
          {revokedTokens.map((token: any) => (
            <div key={token.id} className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg opacity-50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">REVOKED</span>
                <span className="text-sm text-gray-500">{token.label}</span>
                <span className="text-xs text-gray-600">{token.currentUses}/{token.maxUses} uses · {new Date(token.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommandCenter({
  stats, systemHealth, users, notifications, unreadCount, onTabChange, onViewUser, onMarkRead
}: {
  stats: AdminStats | undefined;
  systemHealth: SystemHealth | undefined;
  users: UserData[];
  notifications: AdminNotification[];
  unreadCount: number;
  onTabChange: (tab: TabType) => void;
  onViewUser: (id: string) => void;
  onMarkRead: (id: number) => void;
}) {
  const activityRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activityFilter, setActivityFilter] = useState<'all' | 'errors' | 'slow'>('all');

  const { data: activity = [] } = useQuery<ActivityEntry[]>({
    queryKey: ['/api/admin/activity'],
    refetchInterval: 3000,
  });

  const { data: errorLog } = useQuery<ErrorLog>({
    queryKey: ['/api/admin/error-log'],
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (autoScroll && activityRef.current) {
      activityRef.current.scrollTop = 0;
    }
  }, [activity, autoScroll]);

  const filteredActivity = activity.filter(e => {
    if (activityFilter === 'errors') return e.status >= 400;
    if (activityFilter === 'slow') return e.duration > 500;
    return true;
  });

  const svc = systemHealth?.services;
  const metrics = [
    { label: 'Total Users', value: stats?.totalUsers ?? users.length, color: '#22d3ee', icon: Users },
    { label: 'Revenue/mo', value: `$${stats?.estimatedMonthlyRevenue ?? 0}`, color: '#4ade80', icon: DollarSign },
    { label: 'Pro Users', value: stats?.subscriptions?.pro ?? 0, color: '#a78bfa', icon: Crown },
    { label: 'Unread Alerts', value: unreadCount, color: unreadCount > 0 ? '#f87171' : '#4ade80', icon: Bell },
    { label: 'Active Errors', value: errorLog?.stats?.unresolved ?? 0, color: (errorLog?.stats?.unresolved ?? 0) > 0 ? '#fb923c' : '#4ade80', icon: AlertTriangle },
    { label: 'Flagged Users', value: users.filter(u => u.isFlagged).length, color: '#fbbf24', icon: Flag },
  ];

  const statusColor = (s?: string) =>
    s === 'healthy' ? '#4ade80' : s === 'degraded' ? '#fbbf24' : s ? '#f87171' : '#475569';

  const methodColor = (m: string) =>
    m === 'GET' ? '#22d3ee' : m === 'POST' ? '#4ade80' : m === 'DELETE' ? '#f87171' : m === 'PATCH' ? '#a78bfa' : '#94a3b8';

  const statusBg = (s: number) =>
    s >= 500 ? 'rgba(239,68,68,0.15)' : s >= 400 ? 'rgba(251,146,60,0.12)' : s >= 300 ? 'rgba(250,204,21,0.08)' : 'transparent';

  return (
    <div className="space-y-4">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-cyan-400" />
            Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">Live system overview · auto-refresh every 3s</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-mono text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </div>
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg p-3 flex flex-col gap-1"
            style={{ background: '#0d0d0d', border: '1px solid #0d1e30' }}>
            <div className="flex items-center justify-between">
              <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
              <span className="text-[10px] font-mono text-slate-600">KPI</span>
            </div>
            <div className="text-lg font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
            <div className="text-[10px] text-slate-500 truncate">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID: Activity Feed + Right Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── LIVE ACTIVITY FEED ── */}
        <div className="lg:col-span-2 rounded-lg overflow-hidden"
          style={{ background: '#080808', border: '1px solid #0d1e30' }}>
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: '#1a1a1a' }}>
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-green-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-300 font-mono">LIVE API FEED</span>
            </div>
            <div className="flex items-center gap-1">
              {(['all', 'errors', 'slow'] as const).map(f => (
                <button key={f} onClick={() => setActivityFilter(f)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono transition-colors"
                  style={{
                    background: activityFilter === f ? '#1a1a1a' : 'transparent',
                    color: activityFilter === f ? '#22d3ee' : '#475569',
                    border: activityFilter === f ? '1px solid #1e4a6e' : '1px solid transparent',
                  }}>
                  {f === 'all' ? 'ALL' : f === 'errors' ? 'ERR' : 'SLOW'}
                </button>
              ))}
              <button onClick={() => setAutoScroll(a => !a)}
                className="px-2 py-0.5 rounded text-[10px] font-mono transition-colors ml-1"
                style={{
                  background: autoScroll ? 'rgba(74,222,128,0.1)' : 'transparent',
                  color: autoScroll ? '#4ade80' : '#475569',
                  border: autoScroll ? '1px solid rgba(74,222,128,0.3)' : '1px solid #1e2a38',
                }}>
                {autoScroll ? '▼ AUTO' : '⏸ PAUSED'}
              </button>
            </div>
          </div>
          <div ref={activityRef} className="overflow-y-auto font-mono text-[11px]" style={{ maxHeight: '420px' }}>
            {filteredActivity.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-slate-600 text-xs">
                Waiting for API calls...
              </div>
            ) : (
              filteredActivity.map((entry, i) => (
                <div key={entry.id || i} className="flex items-center gap-2 px-3 py-1.5 border-b"
                  style={{ borderColor: '#111111', background: statusBg(entry.status) }}>
                  <span className="text-[9px] text-slate-600 w-16 flex-shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="w-10 flex-shrink-0 font-bold text-[10px]" style={{ color: methodColor(entry.method) }}>
                    {entry.method}
                  </span>
                  <span className="flex-1 truncate text-slate-400">{entry.path}</span>
                  <span className="w-8 flex-shrink-0 text-right"
                    style={{ color: entry.status >= 500 ? '#f87171' : entry.status >= 400 ? '#fb923c' : '#4ade80' }}>
                    {entry.status}
                  </span>
                  <span className="w-14 flex-shrink-0 text-right"
                    style={{ color: entry.duration > 1000 ? '#f87171' : entry.duration > 500 ? '#fbbf24' : '#475569' }}>
                    {entry.duration}ms
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Services + Alerts + Errors ── */}
        <div className="flex flex-col gap-4">

          {/* Services */}
          <div className="rounded-lg overflow-hidden" style={{ background: '#080808', border: '1px solid #0d1e30' }}>
            <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: '#1a1a1a' }}>
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-bold text-slate-300 font-mono">SERVICES</span>
            </div>
            <div className="p-3 space-y-2">
              {[
                { name: 'Database', key: 'database', icon: Database },
                { name: 'PayPal', key: 'paypal', icon: CreditCard },
                { name: 'AI (Gemini)', key: 'ai', icon: Brain },
              ].map(({ name, key, icon: Icon }) => {
                const s = svc?.[key as keyof typeof svc];
                const col = statusColor(s);
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3 text-slate-600" />
                      <span className="text-xs text-slate-400 font-mono">{name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: col, fontSize: '10px' }}>●</span>
                      <span className="text-[10px] font-mono capitalize" style={{ color: col }}>
                        {s ?? 'unknown'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {systemHealth?.uptimeFormatted && (
                <div className="pt-2 mt-1 border-t text-[10px] font-mono text-slate-600 flex justify-between"
                  style={{ borderColor: '#1a1a1a' }}>
                  <span>uptime</span>
                  <span className="text-green-500">{systemHealth.uptimeFormatted}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="rounded-lg overflow-hidden flex-1" style={{ background: '#080808', border: '1px solid #0d1e30' }}>
            <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: '#1a1a1a' }}>
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-bold text-slate-300 font-mono">RECENT ALERTS</span>
              </div>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '180px' }}>
              {notifications.slice(0, 8).map(n => (
                <div key={n.id}
                  className="px-3 py-2 border-b flex items-start gap-2 cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ borderColor: '#111111', background: n.isRead === 'false' ? 'rgba(234,88,12,0.05)' : 'transparent' }}
                  onClick={() => onMarkRead(n.id)}>
                  <div className="flex-shrink-0 mt-0.5">
                    {n.type === 'system_outage' ? (
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                    ) : n.type === 'content_flagged' ? (
                      <Flag className="w-3 h-3 text-orange-400" />
                    ) : (
                      <Bell className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-400 truncate font-mono">
                      {n.type.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-[10px] text-slate-600 truncate">{(n.flaggedContent || n.actionTaken)?.slice(0, 60)}</div>
                  </div>
                  {n.isRead === 'false' && (
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400 mt-1" />
                  )}
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="flex items-center justify-center h-12 text-slate-600 text-[10px] font-mono">
                  No alerts
                </div>
              )}
            </div>
            <div className="px-3 py-1.5 border-t" style={{ borderColor: '#1a1a1a' }}>
              <button onClick={() => onTabChange('notifications')}
                className="text-[10px] font-mono text-cyan-600 hover:text-cyan-400 transition-colors">
                View all alerts →
              </button>
            </div>
          </div>

          {/* Error summary */}
          {errorLog && (errorLog.stats.unresolved > 0 || errorLog.stats.critical > 0) && (
            <div className="rounded-lg overflow-hidden" style={{ background: '#080808', border: '1px solid rgba(239,68,68,0.25)' }}>
              <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                <Bug className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-bold text-red-300 font-mono">ERROR TRACKER</span>
              </div>
              <div className="p-3 space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-500">Unresolved</span>
                  <span className="text-orange-400">{errorLog.stats.unresolved}</span>
                </div>
                {errorLog.stats.critical > 0 && (
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-500">Critical</span>
                    <span className="text-red-400 font-bold">{errorLog.stats.critical}</span>
                  </div>
                )}
                <button onClick={() => onTabChange('system')}
                  className="text-[10px] font-mono text-cyan-600 hover:text-cyan-400 transition-colors block mt-1">
                  View error log →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Manage Users', icon: Users, tab: 'users' as TabType, color: '#22d3ee' },
          { label: 'Subscriptions', icon: CreditCard, tab: 'subscriptions' as TabType, color: '#a78bfa' },
          { label: 'System & Debug', icon: Terminal, tab: 'system' as TabType, color: '#4ade80' },
          { label: 'Beta Testing', icon: FlaskConical, tab: 'beta' as TabType, color: '#fb923c' },
        ].map(action => (
          <button key={action.tab} onClick={() => onTabChange(action.tab)}
            className="flex items-center gap-2.5 p-3 rounded-lg text-left transition-all hover:scale-[1.02]"
            style={{ background: '#0d0d0d', border: '1px solid #0d1e30' }}>
            <action.icon className="w-4 h-4 flex-shrink-0" style={{ color: action.color }} />
            <span className="text-xs text-slate-400 font-medium">{action.label}</span>
            <ChevronRight className="w-3 h-3 text-slate-700 ml-auto" />
          </button>
        ))}
      </div>

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
            <div className="text-xs text-gray-400">Research ($30/mo)</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{adminStats?.subscriptions?.enterprise || 0}</div>
            <div className="text-xs text-gray-400">Enterprise ($100/mo)</div>
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
  const [showHistory, setShowHistory] = useState(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [errorFilter, setErrorFilter] = useState<'all' | 'unresolved' | 'critical'>('unresolved');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: proactiveData, isLoading: proactiveFetching } = useQuery<any>({
    queryKey: ['/api/admin/proactive-diagnostics'],
    refetchInterval: 120000,
  });

  const { data: errorLogData, isLoading: errorLogLoading, refetch: refetchErrors } = useQuery<ErrorLog>({
    queryKey: ['/api/admin/error-log'],
    refetchInterval: 30000,
  });

  const proactiveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/proactive-diagnostics/run');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/proactive-diagnostics'] });
      toast({ title: 'Diagnostics complete', description: 'Self-diagnosis finished. Check results below.' });
    },
  });

  const resolveErrorMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/admin/error-log/${id}/resolve`, { autoFixResult: 'Manually resolved by admin' });
      return res.json();
    },
    onSuccess: () => {
      refetchErrors();
      toast({ title: 'Error resolved', description: 'Error marked as resolved.' });
    },
  });

  const clearResolvedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/admin/error-log/resolved');
      return res.json();
    },
    onSuccess: (data: any) => {
      refetchErrors();
      toast({ title: 'Cleared', description: `Removed ${data.cleared} resolved error(s).` });
    },
  });

  const heapPercent = systemHealth
    ? Math.round((systemHealth.memory.heapUsed / systemHealth.memory.heapTotal) * 100)
    : 0;

  const filteredErrors = (errorLogData?.errors || []).filter(e => {
    if (errorFilter === 'unresolved') return !e.resolved;
    if (errorFilter === 'critical') return e.severity === 'critical' || e.severity === 'high';
    return true;
  });

  const severityColor = (s: string) => {
    if (s === 'critical') return 'bg-red-600/30 text-red-400 border border-red-700/50';
    if (s === 'high') return 'bg-orange-600/30 text-orange-400 border border-orange-700/50';
    if (s === 'medium') return 'bg-yellow-600/30 text-yellow-400 border border-yellow-700/50';
    return 'bg-gray-600/30 text-gray-400 border border-gray-700/50';
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={onRefreshHealth} variant="outline" className="border-blue-700 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Health
        </Button>
        <Button onClick={onRunDiagnostics} disabled={diagLoading} className="bg-amber-600 hover:bg-amber-700">
          <Wrench className="w-4 h-4 mr-2" /> {diagLoading ? 'Running...' : 'Run Full Diagnostics'}
        </Button>
        <Button onClick={() => proactiveMutation.mutate()} disabled={proactiveMutation.isPending} className="bg-purple-700 hover:bg-purple-600">
          <Zap className="w-4 h-4 mr-2" /> {proactiveMutation.isPending ? 'Scanning...' : 'Auto-Scan & Fix'}
        </Button>
      </div>

      {systemHealth && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className={`border ${
            systemHealth.status === 'healthy' ? 'bg-green-950/40 border-green-700/60' :
            systemHealth.status === 'degraded' ? 'bg-yellow-950/40 border-yellow-700/60' :
            'bg-red-950/40 border-red-700/60'
          }`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className={`w-7 h-7 shrink-0 ${
                systemHealth.status === 'healthy' ? 'text-green-400' :
                systemHealth.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
              }`} />
              <div>
                <div className={`text-lg font-bold capitalize ${
                  systemHealth.status === 'healthy' ? 'text-green-400' :
                  systemHealth.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                }`}>{systemHealth.status}</div>
                <div className="text-xs text-gray-400">Overall Status</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-7 h-7 shrink-0 text-blue-400" />
              <div>
                <div className="text-lg font-bold text-white">{systemHealth.uptimeFormatted}</div>
                <div className="text-xs text-gray-400">Uptime</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Memory</span>
                <span className={`text-xs font-bold ${heapPercent > 85 ? 'text-red-400' : heapPercent > 70 ? 'text-yellow-400' : 'text-green-400'}`}>{heapPercent}%</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
                <div className={`h-full rounded-full transition-all ${heapPercent > 85 ? 'bg-red-500' : heapPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${heapPercent}%` }} />
              </div>
              <div className="text-xs text-gray-500">{systemHealth.memory.heapUsed}MB / {systemHealth.memory.heapTotal}MB</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Bug className={`w-7 h-7 shrink-0 ${(errorLogData?.stats.critical || 0) > 0 ? 'text-red-400' : (errorLogData?.stats.high || 0) > 0 ? 'text-orange-400' : 'text-green-400'}`} />
              <div>
                <div className="text-lg font-bold text-white">{errorLogData?.stats.unresolved || 0}</div>
                <div className="text-xs text-gray-400">Active Errors</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {systemHealth ? (
          ['Database', 'PayPal Payments', 'AI Engine'].map((name, i) => {
            const status = [systemHealth.services.database, systemHealth.services.paypal, systemHealth.services.ai][i];
            const icon = [<Database className="w-4 h-4" />, <DollarSign className="w-4 h-4" />, <Brain className="w-4 h-4" />][i];
            return (
              <Card key={name} className={`border ${status === 'healthy' ? 'bg-green-950/30 border-green-800/50' : status === 'degraded' ? 'bg-yellow-950/30 border-yellow-800/50' : 'bg-red-950/30 border-red-800/50'}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={status === 'healthy' ? 'text-green-400' : status === 'degraded' ? 'text-yellow-400' : 'text-red-400'}>{icon}</span>
                    <span className="text-sm font-medium text-white">{name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${status === 'healthy' ? 'bg-green-600/30 text-green-400' : status === 'degraded' ? 'bg-yellow-600/30 text-yellow-400' : 'bg-red-600/30 text-red-400'}`}>
                    {status?.toUpperCase()}
                  </span>
                </CardContent>
              </Card>
            );
          })
        ) : (
          [1,2,3].map(i => <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse"><CardContent className="p-4 h-14" /></Card>)
        )}
      </div>

      <Card className="bg-gradient-to-r from-purple-950/50 to-blue-950/50 border-purple-700/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Proactive Self-Diagnosis
              <span className="text-xs bg-purple-800/50 text-purple-300 px-2 py-0.5 rounded-full">Auto — Every 30 min</span>
            </div>
            <Button size="sm" onClick={() => setShowHistory(!showHistory)} variant="ghost" className="text-gray-400 hover:text-white text-xs h-7">
              <Layers className="w-3 h-3 mr-1" /> {showHistory ? 'Hide' : `History (${proactiveData?.historyCount || 0})`}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {proactiveFetching ? (
            <p className="text-gray-400 text-sm text-center py-3">Loading...</p>
          ) : proactiveData?.latest ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  proactiveData.latest.overallStatus === 'healthy' ? 'bg-green-400' :
                  proactiveData.latest.overallStatus === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
                <span className={`text-sm font-bold capitalize ${
                  proactiveData.latest.overallStatus === 'healthy' ? 'text-green-400' :
                  proactiveData.latest.overallStatus === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                }`}>{proactiveData.latest.overallStatus}</span>
                <span className="text-xs text-gray-500">Last run: {new Date(proactiveData.latest.timestamp).toLocaleString()}</span>
                <span className="text-xs text-gray-600 ml-auto">{proactiveData.latest.issuesFixed} auto-fixed</span>
              </div>
              <div className="grid gap-1.5">
                {proactiveData.latest.results.map((r: any, i: number) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                    r.status === 'pass' ? 'bg-green-950/40' : r.status === 'fixed' ? 'bg-blue-950/40' :
                    r.status === 'warn' ? 'bg-yellow-950/40' : 'bg-red-950/40'
                  }`}>
                    {r.status === 'pass' ? <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" /> :
                     r.status === 'fixed' ? <Wrench className="w-3.5 h-3.5 text-blue-400 shrink-0" /> :
                     r.status === 'warn' ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" /> :
                     <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <span className="text-gray-200 font-medium text-xs">{r.check}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ml-1 ${
                      r.status === 'pass' ? 'bg-green-700/30 text-green-400' :
                      r.status === 'fixed' ? 'bg-blue-700/30 text-blue-400' :
                      r.status === 'warn' ? 'bg-yellow-700/30 text-yellow-400' : 'bg-red-700/30 text-red-400'
                    }`}>{r.status === 'fixed' ? 'AUTO-FIXED' : r.status.toUpperCase()}</span>
                    <span className="text-gray-500 text-xs ml-auto truncate max-w-[260px]">{r.details}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-sm text-center py-3">First scan runs 30 seconds after server boot.</p>
          )}

          {showHistory && proactiveData?.history && proactiveData.history.length > 1 && (
            <div className="mt-3 border-t border-purple-700/30 pt-3">
              <h4 className="text-xs font-medium text-purple-400 mb-2 uppercase tracking-wide">Scan History</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {[...proactiveData.history].reverse().slice(1).map((report: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-gray-900/60 rounded text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full ${report.overallStatus === 'healthy' ? 'bg-green-400' : report.overallStatus === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    <span className="text-gray-400">{new Date(report.timestamp).toLocaleString()}</span>
                    <span className={`capitalize font-medium ${report.overallStatus === 'healthy' ? 'text-green-400' : report.overallStatus === 'degraded' ? 'text-yellow-400' : 'text-red-400'}`}>{report.overallStatus}</span>
                    <span className="text-gray-600 ml-auto">{report.issuesFound} found · {report.issuesFixed} fixed</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-950 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-green-400" />
              Live Error Log
              {(errorLogData?.stats.critical || 0) > 0 && (
                <span className="text-xs bg-red-700/40 text-red-400 border border-red-700/50 px-2 py-0.5 rounded-full animate-pulse">
                  {errorLogData?.stats.critical} CRITICAL
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-900 rounded-lg p-0.5 gap-0.5">
                {(['all', 'unresolved', 'critical'] as const).map(f => (
                  <button key={f} onClick={() => setErrorFilter(f)}
                    className={`text-xs px-2 py-1 rounded capitalize transition-colors ${errorFilter === f ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="ghost" onClick={() => refetchErrors()} className="text-gray-400 hover:text-white h-7 w-7 p-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              {(errorLogData?.errors.filter(e => e.resolved).length || 0) > 0 && (
                <Button size="sm" variant="ghost" onClick={() => clearResolvedMutation.mutate()} className="text-gray-500 hover:text-red-400 text-xs h-7">
                  <Trash2 className="w-3 h-3 mr-1" /> Clear Resolved
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorLogLoading ? (
            <p className="text-gray-500 text-sm text-center py-6">Loading error log...</p>
          ) : filteredErrors.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2 opacity-60" />
              <p className="text-gray-500 text-sm">
                {errorFilter === 'unresolved' ? 'No unresolved errors — system is clean.' : 'No errors match this filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredErrors.map(err => (
                <div key={err.id} className={`rounded-lg border transition-colors ${err.resolved ? 'opacity-50 bg-gray-900/30 border-gray-800' : 'bg-gray-900 border-gray-700 hover:border-gray-600'}`}>
                  <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => setExpandedError(expandedError === err.id ? null : err.id)}>
                    <div className={`mt-0.5 shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase ${severityColor(err.severity)}`}>
                      {err.severity}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-blue-400 font-mono bg-blue-900/20 px-1.5 py-0.5 rounded">{err.type}</span>
                        {err.route && <span className="text-xs text-gray-500 font-mono">{err.route}</span>}
                        {err.occurrences > 1 && (
                          <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">×{err.occurrences}</span>
                        )}
                        {err.resolved && <span className="text-xs bg-green-900/30 text-green-500 px-1.5 py-0.5 rounded">RESOLVED</span>}
                      </div>
                      <p className="text-sm text-gray-200 mt-1 font-mono leading-tight break-words">{err.message}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(err.timestamp).toLocaleString()}
                        {err.occurrences > 1 && ` · last seen ${new Date(err.lastSeen).toLocaleTimeString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!err.resolved && (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); resolveErrorMutation.mutate(err.id); }}
                          className="text-xs h-6 bg-green-800/50 hover:bg-green-700 text-green-300 border border-green-700/50">
                          Resolve
                        </Button>
                      )}
                      <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${expandedError === err.id ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  {expandedError === err.id && err.stack && (
                    <div className="border-t border-gray-800 px-3 pb-3">
                      <pre className="text-xs text-gray-500 font-mono bg-black/40 rounded p-3 mt-2 overflow-x-auto whitespace-pre-wrap max-h-40">{err.stack}</pre>
                      {err.autoFixResult && (
                        <p className="text-xs text-blue-400 mt-2 flex items-center gap-1">
                          <Wrench className="w-3 h-3" /> {err.autoFixResult}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {errorLogData && (
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-800 text-xs text-gray-600">
              <span>Total: <span className="text-gray-400">{errorLogData.stats.total}</span></span>
              <span>Unresolved: <span className={errorLogData.stats.unresolved > 0 ? 'text-yellow-400' : 'text-gray-400'}>{errorLogData.stats.unresolved}</span></span>
              <span>Critical: <span className={errorLogData.stats.critical > 0 ? 'text-red-400' : 'text-gray-400'}>{errorLogData.stats.critical}</span></span>
              <span>High: <span className={errorLogData.stats.high > 0 ? 'text-orange-400' : 'text-gray-400'}>{errorLogData.stats.high}</span></span>
            </div>
          )}
        </CardContent>
      </Card>

      {diagResults && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" /> Last Manual Diagnostic Run
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {diagResults.map((r, i) => (
              <div key={i} className={`flex items-start gap-3 px-3 py-2 rounded-lg ${
                r.status === 'pass' ? 'bg-green-950/30' : r.status === 'fixed' ? 'bg-blue-950/30' :
                r.status === 'warn' ? 'bg-yellow-950/30' : 'bg-red-950/30'
              }`}>
                {r.status === 'pass' ? <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> :
                 r.status === 'fixed' ? <Wrench className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" /> :
                 r.status === 'warn' ? <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" /> :
                 <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{r.check}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      r.status === 'pass' ? 'bg-green-700/30 text-green-400' :
                      r.status === 'fixed' ? 'bg-blue-700/30 text-blue-400' :
                      r.status === 'warn' ? 'bg-yellow-700/30 text-yellow-400' : 'bg-red-700/30 text-red-400'
                    }`}>{r.status === 'fixed' ? 'AUTO-FIXED' : r.status.toUpperCase()}</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">{r.details}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FlaggedUsersTab({
  users,
  notifications,
  onViewUser,
  onAction,
}: {
  users: UserData[];
  notifications: AdminNotification[];
  onViewUser: (userId: string) => void;
  onAction: (type: string, userId: string, userName: string, userEmail?: string) => void;
}) {
  const flaggedUsers = users.filter(u => u.isFlagged);
  const suspendedUsers = users.filter(u => u.isSuspended);
  const bannedUsers = users.filter(u => u.isBanned);
  const [filterType, setFilterType] = useState<'all' | 'flagged' | 'suspended' | 'banned'>('all');

  const displayUsers = filterType === 'flagged' ? flaggedUsers
    : filterType === 'suspended' ? suspendedUsers
    : filterType === 'banned' ? bannedUsers
    : [...flaggedUsers, ...suspendedUsers.filter(u => !u.isFlagged), ...bannedUsers.filter(u => !u.isFlagged && !u.isSuspended)];

  const uniqueUsers = displayUsers.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Flag className="w-5 h-5 text-orange-400" />
          Flagged & Actioned Users
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className={`border cursor-pointer transition-colors ${filterType === 'all' ? 'bg-gray-800 border-orange-500' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`} onClick={() => setFilterType('all')}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{users.filter(u => u.isFlagged || u.isSuspended || u.isBanned).length}</div>
            <div className="text-xs text-gray-400">All Issues</div>
          </CardContent>
        </Card>
        <Card className={`border cursor-pointer transition-colors ${filterType === 'flagged' ? 'bg-gray-800 border-yellow-500' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`} onClick={() => setFilterType('flagged')}>
          <CardContent className="p-4 text-center">
            <Flag className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{flaggedUsers.length}</div>
            <div className="text-xs text-gray-400">Flagged</div>
          </CardContent>
        </Card>
        <Card className={`border cursor-pointer transition-colors ${filterType === 'suspended' ? 'bg-gray-800 border-orange-500' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`} onClick={() => setFilterType('suspended')}>
          <CardContent className="p-4 text-center">
            <Pause className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{suspendedUsers.length}</div>
            <div className="text-xs text-gray-400">Suspended</div>
          </CardContent>
        </Card>
        <Card className={`border cursor-pointer transition-colors ${filterType === 'banned' ? 'bg-gray-800 border-red-500' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`} onClick={() => setFilterType('banned')}>
          <CardContent className="p-4 text-center">
            <Ban className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{bannedUsers.length}</div>
            <div className="text-xs text-gray-400">Banned</div>
          </CardContent>
        </Card>
      </div>

      {uniqueUsers.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
            <p className="text-gray-400">No flagged or actioned users. All clear!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {uniqueUsers.map((user) => {
            const relatedNotifications = notifications.filter(n => n.userId === user.id);
            const latestNotification = relatedNotifications[0];
            const statusBadges = [];
            if (user.isBanned) statusBadges.push({ label: 'BANNED', color: 'bg-red-600/20 text-red-400' });
            if (user.isSuspended) statusBadges.push({ label: 'SUSPENDED', color: 'bg-orange-600/20 text-orange-400' });
            if (user.isFlagged) statusBadges.push({ label: 'FLAGGED', color: 'bg-yellow-600/20 text-yellow-400' });

            return (
              <Card key={user.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 p-2 rounded-full ${
                      user.isBanned ? 'bg-red-600/20' : user.isSuspended ? 'bg-orange-600/20' : 'bg-yellow-600/20'
                    }`}>
                      {user.isBanned ? <Ban className="w-4 h-4 text-red-400" /> :
                       user.isSuspended ? <Pause className="w-4 h-4 text-orange-400" /> :
                       <Flag className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-white text-sm font-medium">{user.firstName} {user.lastName}</span>
                        <span className="text-gray-500 text-xs">{user.email}</span>
                        {statusBadges.map((badge, i) => (
                          <span key={i} className={`text-xs px-1.5 py-0.5 rounded font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                        ))}
                      </div>

                      {user.banReason && (
                        <p className="text-gray-400 text-sm mb-1">
                          <span className="text-gray-500">Ban reason:</span> {user.banReason}
                        </p>
                      )}
                      {user.flagReason && (
                        <p className="text-gray-400 text-sm mb-1">
                          <span className="text-gray-500">Flag reason:</span> {user.flagReason}
                        </p>
                      )}
                      {user.suspensionReason && (
                        <p className="text-gray-400 text-sm mb-1">
                          <span className="text-gray-500">Suspension reason:</span> {user.suspensionReason}
                        </p>
                      )}
                      {user.banExpiresAt && (
                        <p className="text-gray-400 text-xs">
                          <span className="text-gray-500">Ban expires:</span> {new Date(user.banExpiresAt).toLocaleDateString()}
                        </p>
                      )}

                      {latestNotification && (
                        <div className="mt-2 bg-gray-800/50 rounded p-2">
                          <p className="text-xs text-gray-500 mb-1">Flagged content:</p>
                          <p className="text-red-300 text-xs truncate">{latestNotification.flaggedContent}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" onClick={() => onViewUser(user.id)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7">
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Button>
                        {user.isBanned && (
                          <Button size="sm" onClick={() => onAction('unban', user.id, user.firstName || user.email)} variant="outline" className="border-green-700 text-green-400 hover:bg-green-900/30 text-xs h-7">
                            <Play className="w-3 h-3 mr-1" /> Unban
                          </Button>
                        )}
                        {user.isSuspended && (
                          <Button size="sm" onClick={() => onAction('unsuspend', user.id, user.firstName || user.email)} variant="outline" className="border-green-700 text-green-400 hover:bg-green-900/30 text-xs h-7">
                            <Play className="w-3 h-3 mr-1" /> Unsuspend
                          </Button>
                        )}
                        {user.isFlagged && (
                          <Button size="sm" onClick={() => onAction('unflag', user.id, user.firstName || user.email)} variant="outline" className="border-green-700 text-green-400 hover:bg-green-900/30 text-xs h-7">
                            <CheckCircle className="w-3 h-3 mr-1" /> Unflag
                          </Button>
                        )}
                        {!user.isBanned && (
                          <Button size="sm" onClick={() => onAction('ban', user.id, user.firstName || user.email, user.email)} variant="outline" className="border-red-700 text-red-400 hover:bg-red-900/30 text-xs h-7">
                            <Ban className="w-3 h-3 mr-1" /> Ban
                          </Button>
                        )}
                      </div>
                    </div>
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
  const [filterType, setFilterType] = useState<'all' | 'user' | 'system' | 'unread'>('all');

  const getAlertSeverity = (type: string) => {
    if (type === 'terrorism') return { label: 'CRITICAL', cls: 'bg-red-700/40 text-red-300 border border-red-700/60' };
    if (type === 'threat' || type === 'system_outage') return { label: 'HIGH', cls: 'bg-orange-700/40 text-orange-300 border border-orange-700/60' };
    if (type === 'sexual') return { label: 'HIGH', cls: 'bg-orange-700/40 text-orange-300 border border-orange-700/60' };
    if (type === 'system_diagnostic') return { label: 'MEDIUM', cls: 'bg-yellow-700/40 text-yellow-300 border border-yellow-700/60' };
    return { label: 'LOW', cls: 'bg-gray-700/40 text-gray-300 border border-gray-700/60' };
  };

  const getIcon = (type: string) => {
    if (type === 'system_outage') return <Server className="w-4 h-4 text-red-400" />;
    if (type === 'system_diagnostic') return <Activity className="w-4 h-4 text-yellow-400" />;
    if (type === 'threat' || type === 'terrorism') return <AlertOctagon className="w-4 h-4 text-red-400" />;
    return <ShieldAlert className="w-4 h-4 text-orange-400" />;
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'unread') return n.isRead === 'false';
    if (filterType === 'system') return n.type === 'system_outage' || n.type === 'system_diagnostic';
    if (filterType === 'user') return n.type !== 'system_outage' && n.type !== 'system_diagnostic';
    return true;
  });

  const typeGroups = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (selectedNotification) {
    const n = selectedNotification;
    const isSystem = n.type === 'system_outage' || n.type === 'system_diagnostic';
    const severity = getAlertSeverity(n.type);
    return (
      <div>
        <Button variant="ghost" onClick={() => onSelectNotification(null)} className="mb-4 text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Alerts
        </Button>
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${isSystem ? 'bg-yellow-900/40 border border-yellow-800/50' : 'bg-red-900/40 border border-red-800/50'}`}>
                  {getIcon(n.type)}
                </div>
                <div>
                  <CardTitle className="text-white text-base">
                    {isSystem ? (n.type === 'system_outage' ? 'System Outage Alert' : 'System Diagnostic Alert') :
                     n.type === 'terrorism' ? 'Terrorism / Extremist Content' :
                     n.type === 'threat' ? 'Threat Detected' :
                     n.type === 'sexual' ? 'Explicit Content Violation' : 'Content Policy Violation'}
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${severity.cls}`}>{severity.label}</span>
                <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 uppercase">{n.type.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSystem && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-800/60 rounded-xl p-4 space-y-2.5 border border-gray-700/50">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-blue-400" /> User Information
                  </h4>
                  {[
                    ['Name', `${n.userFirstName} ${n.userLastName}`],
                    ['Email', n.userEmail],
                    ['User ID', n.userId.slice(0, 16) + '...'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">{label}</span>
                      <span className="text-white text-sm font-medium font-mono">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-800/60 rounded-xl p-4 space-y-2.5 border border-gray-700/50">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-orange-400" /> Event Details
                  </h4>
                  {[
                    ['Date', new Date(n.createdAt).toLocaleDateString()],
                    ['Time', new Date(n.createdAt).toLocaleTimeString()],
                    ['Conversation', n.conversationId ? `#${n.conversationId}` : 'N/A'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">{label}</span>
                      <span className="text-white text-sm">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-red-800/40 overflow-hidden">
              <div className="bg-red-950/40 px-4 py-2 border-b border-red-800/40">
                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {isSystem ? 'Alert Details' : 'Flagged Content'}
                </h4>
              </div>
              <div className="p-4 bg-red-950/20">
                <p className="text-red-200 text-sm break-words whitespace-pre-wrap leading-relaxed">{n.flaggedContent}</p>
              </div>
            </div>

            <div className="rounded-xl border border-green-800/40 overflow-hidden">
              <div className="bg-green-950/40 px-4 py-2 border-b border-green-800/40">
                <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" /> Action Taken
                </h4>
              </div>
              <div className="p-4 bg-green-950/10">
                <p className="text-gray-300 text-sm">{n.actionTaken}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              {!isSystem && (
                <Button onClick={() => onViewUser(n.userId)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Eye className="w-4 h-4 mr-2" /> View User Profile
                </Button>
              )}
              {n.isRead === 'false' && (
                <Button onClick={() => onMarkRead(n.id)} variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:border-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark as Read
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const criticalCount = notifications.filter(n => ['terrorism', 'threat'].includes(n.type) && n.isRead === 'false').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-400" />
            Alerts & Notifications
            {unreadCount > 0 && (
              <span className="bg-red-600 text-white text-xs rounded-full px-2 py-0.5 font-bold">{unreadCount} unread</span>
            )}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{notifications.length} total · {Object.keys(typeGroups).length} type{Object.keys(typeGroups).length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={onMarkAllRead} className="border-gray-700 text-gray-300 hover:text-white hover:border-green-700">
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Mark All Read
            </Button>
          )}
        </div>
      </div>

      {criticalCount > 0 && (
        <div className="flex items-center gap-3 bg-red-950/50 border border-red-700/60 rounded-xl px-4 py-3">
          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
          <div>
            <p className="text-red-300 text-sm font-semibold">{criticalCount} critical unread alert{criticalCount !== 1 ? 's' : ''}</p>
            <p className="text-red-500 text-xs">Threats or extremist content detected — review immediately</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 w-fit">
        {([
          { id: 'all', label: `All (${notifications.length})` },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'user', label: 'User Reports' },
          { id: 'system', label: 'System' },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFilterType(f.id)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filterType === f.id ? 'bg-gray-700 text-white font-medium' : 'text-gray-500 hover:text-gray-300'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filteredNotifications.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-10 text-center">
            <Shield className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-40" />
            <p className="text-gray-400 text-sm">
              {filterType === 'unread' ? 'All caught up — no unread alerts.' : 'No alerts match this filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((n) => {
            const isSystem = n.type === 'system_outage' || n.type === 'system_diagnostic';
            const severity = getAlertSeverity(n.type);
            return (
              <Card
                key={n.id}
                className={`border cursor-pointer transition-all hover:border-gray-600 ${
                  n.isRead === 'false' ? 'bg-gray-900 border-gray-700' : 'bg-gray-950/60 border-gray-800/60'
                }`}
                onClick={() => { onSelectNotification(n); if (n.isRead === 'false') onMarkRead(n.id); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${isSystem ? 'bg-yellow-900/30 border border-yellow-800/40' : 'bg-red-900/30 border border-red-800/40'}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-white text-sm font-medium">
                          {isSystem ? (n.type === 'system_outage' ? 'System Outage' : 'System Diagnostic') : `${n.userFirstName} ${n.userLastName}`}
                        </span>
                        {!isSystem && <span className="text-gray-500 text-xs">{n.userEmail}</span>}
                        {n.isRead === 'false' && <span className="bg-blue-500 rounded-full w-1.5 h-1.5 shrink-0" />}
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed truncate max-w-xl">
                        {n.flaggedContent.length > 120 ? n.flaggedContent.slice(0, 120) + '...' : n.flaggedContent}
                      </p>
                      <p className="text-gray-600 text-xs mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${severity.cls}`}>{severity.label}</span>
                      <span className="text-xs text-gray-600 bg-gray-800/60 px-2 py-0.5 rounded uppercase">{n.type.replace(/_/g, ' ')}</span>
                    </div>
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

function BetaTestingTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<'applications' | 'feedback'>('applications');
  const [denyModal, setDenyModal] = useState<{ id: number; name: string; email: string } | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [emailModal, setEmailModal] = useState<{ id: number; name: string; email: string; type: 'approve' | 'deny' } | null>(null);
  const [customReason, setCustomReason] = useState('');

  const { data: applications = [], isLoading: appsLoading, refetch: refetchApps } = useQuery<any[]>({
    queryKey: ['/api/admin/beta/applications'],
    refetchInterval: 15000,
  });

  const { data: feedback = [], isLoading: feedbackLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/beta/feedback'],
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/beta/applications/${id}/approve`, { method: 'POST', credentials: 'include' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Approved', description: 'Application approved and email sent.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/beta/applications'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const denyMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await fetch(`/api/admin/beta/applications/${id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Denied', description: 'Application denied and email sent.' });
      setDenyModal(null);
      setDenyReason('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/beta/applications'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (payload: { email: string; name: string; subject: string; body: string }) => {
      const res = await fetch('/api/admin/beta/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Email Sent', description: 'Email delivered successfully.' });
      setEmailModal(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const pendingApps = applications.filter((a: any) => a.status === 'pending');
  const reviewedApps = applications.filter((a: any) => a.status !== 'pending');

  const categoryColor = (cat: string) => {
    switch (cat) {
      case 'bug': return 'bg-red-600/20 text-red-400';
      case 'feature': return 'bg-blue-600/20 text-blue-400';
      case 'ui': return 'bg-purple-600/20 text-purple-400';
      case 'performance': return 'bg-orange-600/20 text-orange-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-700/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <FlaskConical className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold text-white">Beta Testing Program</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-white">{applications.length}</div>
              <div className="text-xs text-gray-400">Total Applications</div>
            </div>
            <div className="text-center p-3 bg-yellow-900/30 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">{pendingApps.length}</div>
              <div className="text-xs text-gray-400">Pending Review</div>
            </div>
            <div className="text-center p-3 bg-green-900/30 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{applications.filter((a: any) => a.status === 'approved').length}</div>
              <div className="text-xs text-gray-400">Approved</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-white">{feedback.length}</div>
              <div className="text-xs text-gray-400">Feedback Notes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Switcher */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => setActiveSection('applications')}
          className={activeSection === 'applications' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}
        >
          <FlaskConical className="w-4 h-4 mr-1" /> Applications {pendingApps.length > 0 && <span className="ml-1.5 bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">{pendingApps.length}</span>}
        </Button>
        <Button
          size="sm"
          onClick={() => setActiveSection('feedback')}
          className={activeSection === 'feedback' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}
        >
          <MessageSquare className="w-4 h-4 mr-1" /> Feedback
        </Button>
      </div>

      {/* Applications Section */}
      {activeSection === 'applications' && (
        <div className="space-y-4">
          {appsLoading ? (
            <Card className="bg-gray-900 border-gray-800"><CardContent className="p-6 text-center text-gray-500">Loading applications…</CardContent></Card>
          ) : applications.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-10 text-center">
                <FlaskConical className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No applications yet. They'll appear here when users apply from the website.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {pendingApps.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Pending Review ({pendingApps.length})</h3>
                  <div className="space-y-3">
                    {pendingApps.map((app: any) => (
                      <Card key={app.id} className="bg-gray-900 border-yellow-700/30">
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row md:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-white">{app.name}</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-yellow-600/20 text-yellow-400">PENDING</span>
                              </div>
                              <div className="text-sm text-gray-400 mb-3">{app.email}</div>
                              <div className="space-y-2">
                                {app.answers && typeof app.answers === 'object' && Object.entries(app.answers).map(([q, a]) => (
                                  <div key={q} className="text-xs">
                                    <span className="text-gray-500 font-medium">{q}:</span>
                                    <span className="text-gray-300 ml-1">{String(a)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-xs text-gray-600 mt-2">Applied: {new Date(app.appliedAt).toLocaleDateString()}</div>
                            </div>
                            <div className="flex flex-row md:flex-col gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                className="bg-green-700 hover:bg-green-600 text-white"
                                onClick={() => approveMutation.mutate(app.id)}
                                disabled={approveMutation.isPending}
                              >
                                <ThumbsUp className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-700 text-red-400 hover:bg-red-900/20"
                                onClick={() => setDenyModal({ id: app.id, name: app.name, email: app.email })}
                              >
                                <ThumbsDown className="w-3 h-3 mr-1" /> Deny
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-400 hover:bg-blue-900/20"
                                onClick={() => setEmailModal({ id: app.id, name: app.name, email: app.email, type: 'approve' })}
                              >
                                <Mail className="w-3 h-3 mr-1" /> Email
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {reviewedApps.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Previously Reviewed ({reviewedApps.length})</h3>
                  <div className="space-y-2">
                    {reviewedApps.map((app: any) => (
                      <Card key={app.id} className="bg-gray-900 border-gray-800">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-white">{app.name}</span>
                              <span className="text-gray-500 text-sm ml-2">{app.email}</span>
                              {app.denialReason && <div className="text-xs text-gray-500 mt-1">Denial reason: {app.denialReason}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${app.status === 'approved' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                                {app.status.toUpperCase()}
                              </span>
                              <Button size="sm" variant="ghost" className="text-blue-400 hover:bg-blue-900/20 h-7 px-2" onClick={() => setEmailModal({ id: app.id, name: app.name, email: app.email, type: app.status === 'approved' ? 'approve' : 'deny' })}>
                                <Mail className="w-3 h-3 mr-1" /> Email
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Feedback Section */}
      {activeSection === 'feedback' && (
        <div className="space-y-3">
          {feedbackLoading ? (
            <Card className="bg-gray-900 border-gray-800"><CardContent className="p-6 text-center text-gray-500">Loading feedback…</CardContent></Card>
          ) : feedback.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-10 text-center">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No feedback yet. Beta testers can submit feedback from the chat page.</p>
              </CardContent>
            </Card>
          ) : (
            feedback.map((fb: any) => (
              <Card key={fb.id} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-medium text-white text-sm">{fb.userName || 'Anonymous'}</span>
                        <span className="text-gray-500 text-xs">{fb.userEmail}</span>
                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${categoryColor(fb.category)}`}>{fb.category || 'general'}</span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{fb.message}</p>
                      <div className="text-xs text-gray-600 mt-2">{new Date(fb.submittedAt).toLocaleString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Deny Modal */}
      {denyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Deny Application</h3>
            <p className="text-gray-400 text-sm mb-4">Denying <strong className="text-white">{denyModal.name}</strong> ({denyModal.email}). Optionally enter a reason — it will be included in the denial email.</p>
            <textarea
              value={denyReason}
              onChange={e => setDenyReason(e.target.value)}
              placeholder="Reason for denial (optional)…"
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-gray-700 bg-gray-800 text-white text-sm resize-none mb-4 focus:border-red-500 outline-none"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setDenyModal(null); setDenyReason(''); }} className="text-gray-400">Cancel</Button>
              <Button className="bg-red-700 hover:bg-red-600 text-white" onClick={() => denyMutation.mutate({ id: denyModal.id, reason: denyReason })} disabled={denyMutation.isPending}>
                <ThumbsDown className="w-3 h-3 mr-1" /> {denyMutation.isPending ? 'Sending…' : 'Deny & Send Email'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Mail className="w-5 h-5 text-blue-400" /> Send Email to {emailModal.name}</h3>
              <button onClick={() => setEmailModal(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex gap-2 mb-4">
              <Button size="sm" onClick={() => setEmailModal({ ...emailModal, type: 'approve' })} className={emailModal.type === 'approve' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400'}>
                Approval Template
              </Button>
              <Button size="sm" onClick={() => setEmailModal({ ...emailModal, type: 'deny' })} className={emailModal.type === 'deny' ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-400'}>
                Denial Template
              </Button>
            </div>

            {emailModal.type === 'deny' && (
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-400 mb-1 block">Reason for Denial (included in email)</label>
                <textarea
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Explain why the application was not selected…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-gray-700 bg-gray-800 text-white text-sm resize-none focus:border-red-500 outline-none"
                />
              </div>
            )}

            <div className={`rounded-lg border p-4 text-sm mb-4 ${emailModal.type === 'approve' ? 'border-green-700/40 bg-green-900/20' : 'border-red-700/40 bg-red-900/20'}`}>
              <div className="font-medium text-white mb-2">
                {emailModal.type === 'approve'
                  ? "Congratulations! You've been approved for TurboAnswer Beta Testing"
                  : "TurboAnswer Beta Testing Application Update"}
              </div>
              <div className="text-gray-400 text-xs leading-relaxed">
                {emailModal.type === 'approve'
                  ? `Hi ${emailModal.name}, Congratulations! Your application has been approved. To get started, create your account at turboanswer using this exact email: ${emailModal.email}. Your account will automatically have beta tester access when you register…`
                  : `Hi ${emailModal.name}, Thank you for applying. After careful review, your application has not been selected at this time.${customReason ? ` Reason: ${customReason}` : ''} We encourage you to apply again in the future…`}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEmailModal(null)} className="text-gray-400">Cancel</Button>
              <Button
                className={emailModal.type === 'approve' ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-blue-700 hover:bg-blue-600 text-white'}
                disabled={sendEmailMutation.isPending}
                onClick={() => {
                  const subject = emailModal.type === 'approve'
                    ? "Congratulations! You've been approved for TurboAnswer Beta Testing"
                    : "TurboAnswer Beta Testing Application Update";
                  const body = emailModal.type === 'approve'
                    ? `Hi ${emailModal.name},\n\nCongratulations! We're thrilled to let you know that your application to join the TurboAnswer Beta Testing Program has been approved.\n\nTo get started, please create your TurboAnswer account using this exact email address: ${emailModal.email}\n\nVisit https://turbo-answer.replit.app/register and sign up with the email above. Your account will automatically have beta tester access as soon as you register — no extra steps needed.\n\nOnce you're logged in, look for the green flask icon in the chat header to submit your feedback directly to our team.\n\nThank you for your enthusiasm. We're excited to have you on board!\n\nBest regards,\nThe TurboAnswer Team`
                    : `Hi ${emailModal.name},\n\nThank you for taking the time to apply to the TurboAnswer Beta Testing Program. After careful review, we regret to inform you that your application has not been selected at this time.\n\n${customReason ? `Reason: ${customReason}\n\n` : ''}We encourage you to keep using TurboAnswer and apply again in the future.\n\nBest regards,\nThe TurboAnswer Team`;
                  sendEmailMutation.mutate({ email: emailModal.email, name: emailModal.name, subject, body });
                }}
              >
                <Send className="w-3 h-3 mr-1" /> {sendEmailMutation.isPending ? 'Sending…' : 'Send Email'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Security Tab ─────────────────────────────────────────────────────────────
interface SecurityStats {
  totalEvents: number; eventsLast1h: number; blockedIPCount: number;
  requestsLastMinute: number;
  blockedIPs: { ip: string; blockedAt: string | null }[];
  threatBreakdown: { ddos: number; brute_force: number; scanning: number; injection: number; simulated: number };
}
interface IntrusionEvent {
  id: number; timestamp: string; type: string; ip: string;
  details: string; severity: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean; simulated: boolean;
}
const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280',
};
const THREAT_LABELS: Record<string, string> = {
  ddos: 'DDoS Attack', brute_force: 'Brute Force', scanning: 'Dir Scanning',
  injection: 'SQL/XSS Injection', data_breach: 'Data Breach',
  security_breach: 'Security Breach', simulated_hack: 'Simulated Hack',
};
const SIM_ATTACKS = [
  { type: 'ddos',        label: 'DDoS Attack',   icon: Wifi,        color: '#ef4444', desc: 'Floods server with 1,200+ req/min' },
  { type: 'brute_force', label: 'Brute Force',   icon: ShieldAlert, color: '#f97316', desc: 'Credential stuffing on login endpoint' },
  { type: 'injection',   label: 'SQL Injection', icon: Bug,         color: '#ef4444', desc: 'SQL/XSS injection on /api/auth' },
  { type: 'data_breach', label: 'Data Breach',   icon: Database,    color: '#ef4444', desc: 'Bulk user record exfiltration attempt' },
  { type: 'scanning',    label: 'Dir Scanning',  icon: Search,      color: '#eab308', desc: 'Automated vulnerability scanner probe' },
  { type: 'hack',        label: 'Admin Hack',    icon: Crown,       color: '#ef4444', desc: 'Stolen JWT admin session hijack' },
];

function SecurityTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmSim, setConfirmSim] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<SecurityStats>({
    queryKey: ['/api/admin/security/stats'],
    refetchInterval: 15000,
  });

  const { data: log, isLoading: logLoading, refetch: refetchLog } = useQuery<IntrusionEvent[]>({
    queryKey: ['/api/admin/security/log'],
    refetchInterval: 15000,
  });

  const simulateMutation = useMutation({
    mutationFn: async ({ type, triggerLockdown }: { type: string; triggerLockdown: boolean }) => {
      const res = await apiRequest('POST', '/api/admin/security/simulate', { type, triggerLockdown });
      return res.json();
    },
    onSuccess: (data: any) => {
      refetchStats(); refetchLog();
      queryClient.invalidateQueries({ queryKey: ['/api/system/lockdown-status'] });
      toast({
        title: `Simulation: ${data.event.type}`,
        description: data.lockdownTriggered ? `Lockdown triggered (${data.scenario})` : 'Event logged — no lockdown',
      });
      setConfirmSim(null);
    },
    onError: () => toast({ title: 'Simulation failed', variant: 'destructive' }),
  });

  const unblockMutation = useMutation({
    mutationFn: async (ip: string) => {
      const res = await apiRequest('POST', '/api/admin/security/unblock', { ip });
      return res.json();
    },
    onSuccess: (data: any) => { refetchStats(); toast({ title: data.message }); },
    onError: () => toast({ title: 'Unblock failed', variant: 'destructive' }),
  });

  const statBox = (label: string, value: string | number, color = '#9ca3af') => (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '14px 18px', minWidth: 110 }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck style={{ color: '#22c55e', width: 22, height: 22 }} />
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>Intrusion Detection</h2>
        </div>
        <button
          onClick={() => { refetchStats(); refetchLog(); }}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', color: '#9ca3af', padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {statsLoading ? <div style={{ color: '#555', fontSize: '0.85rem' }}>Loading…</div> : stats && (<>
          {statBox('Events (1h)', stats.eventsLast1h, stats.eventsLast1h > 0 ? '#f97316' : '#22c55e')}
          {statBox('Blocked IPs', stats.blockedIPCount, stats.blockedIPCount > 0 ? '#ef4444' : '#22c55e')}
          {statBox('Req/min', stats.requestsLastMinute)}
          {statBox('DDoS', stats.threatBreakdown.ddos, stats.threatBreakdown.ddos > 0 ? '#ef4444' : '#444')}
          {statBox('Brute Force', stats.threatBreakdown.brute_force, stats.threatBreakdown.brute_force > 0 ? '#f97316' : '#444')}
          {statBox('Injection', stats.threatBreakdown.injection, stats.threatBreakdown.injection > 0 ? '#ef4444' : '#444')}
          {statBox('Scanning', stats.threatBreakdown.scanning, stats.threatBreakdown.scanning > 0 ? '#eab308' : '#444')}
        </>)}
      </div>

      {/* Blocked IPs */}
      {stats && stats.blockedIPs.length > 0 && (
        <div style={{ background: '#0d0d0d', border: '1px solid #2a0000', borderRadius: '8px', padding: '14px 18px', marginBottom: '24px' }}>
          <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.82rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ban style={{ width: 13, height: 13 }} /> Blocked IPs ({stats.blockedIPs.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {stats.blockedIPs.map(({ ip }) => (
              <div key={ip} style={{ background: '#1a0000', border: '1px solid #3a0000', borderRadius: '6px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '0.8rem' }}>{ip}</span>
                <button
                  onClick={() => unblockMutation.mutate(ip)}
                  disabled={unblockMutation.isPending}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}
                  title="Unblock IP"
                >
                  <Unlock style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulation panel */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Siren style={{ color: '#f97316', width: 16, height: 16 }} />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>Attack Simulator</span>
          <span style={{ background: '#1a1000', border: '1px solid #3a2000', borderRadius: '4px', padding: '1px 8px', fontSize: '0.62rem', color: '#f97316', letterSpacing: '0.1em' }}>OWNER ONLY</span>
        </div>
        <p style={{ color: '#555', fontSize: '0.78rem', marginBottom: '16px', lineHeight: 1.5 }}>
          Generate a realistic fake security event for testing. Optionally trigger the lockdown screen so you can see exactly what users experience during a real attack.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: confirmSim ? '14px' : 0 }}>
          {SIM_ATTACKS.map(atk => (
            <button
              key={atk.type}
              onClick={() => setConfirmSim(atk.type)}
              style={{ background: '#111', border: `1px solid ${atk.color}33`, borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', textAlign: 'left', minWidth: 148 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <atk.icon style={{ width: 13, height: 13, color: atk.color }} />
                <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>{atk.label}</span>
              </div>
              <div style={{ color: '#555', fontSize: '0.68rem', lineHeight: 1.4 }}>{atk.desc}</div>
            </button>
          ))}
        </div>

        {confirmSim && (
          <div style={{ background: '#130800', border: '1px solid #3a1500', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <AlertTriangle style={{ color: '#f97316', width: 15, height: 15, flexShrink: 0 }} />
            <span style={{ color: '#d97706', fontSize: '0.82rem', flex: 1 }}>
              Simulate <strong>{SIM_ATTACKS.find(a => a.type === confirmSim)?.label}</strong>?
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={simulateMutation.isPending}
                onClick={() => simulateMutation.mutate({ type: confirmSim, triggerLockdown: false })}
                style={{ background: '#1a1000', border: '1px solid #555', borderRadius: '6px', color: '#9ca3af', padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                {simulateMutation.isPending ? '…' : 'Log Only'}
              </button>
              <button
                disabled={simulateMutation.isPending}
                onClick={() => simulateMutation.mutate({ type: confirmSim, triggerLockdown: true })}
                style={{ background: '#3a0000', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
              >
                {simulateMutation.isPending ? '…' : '+ Trigger Lockdown'}
              </button>
              <button
                onClick={() => setConfirmSim(null)}
                style={{ background: 'none', border: '1px solid #333', borderRadius: '6px', color: '#555', padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Event log */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal style={{ color: '#6b7280', width: 14, height: 14 }} />
          <span style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.85rem' }}>Intrusion Log</span>
          <span style={{ marginLeft: 'auto', color: '#444', fontSize: '0.72rem', fontFamily: 'monospace' }}>{log?.length ?? 0} events</span>
        </div>
        {logLoading ? (
          <div style={{ padding: '24px', color: '#555', textAlign: 'center', fontSize: '0.85rem' }}>Loading…</div>
        ) : !log || log.length === 0 ? (
          <div style={{ padding: '32px', color: '#444', textAlign: 'center', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <ShieldCheck style={{ color: '#22c55e', width: 28, height: 28 }} />
            <span style={{ color: '#22c55e' }}>No threats detected</span>
            <span style={{ color: '#333', fontSize: '0.75rem' }}>All clear — system is secure</span>
          </div>
        ) : (
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {log.map(ev => (
              <div key={ev.id} style={{ padding: '10px 18px', borderBottom: '1px solid #0f0f0f', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: SEVERITY_COLOR[ev.severity] ?? '#555', marginTop: '5px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>
                      {THREAT_LABELS[ev.type] ?? ev.type}
                    </span>
                    {ev.simulated && (
                      <span style={{ background: '#1a1000', border: '1px solid #3a2000', borderRadius: '3px', padding: '0 5px', fontSize: '0.6rem', color: '#d97706' }}>SIMULATED</span>
                    )}
                    {ev.blocked && (
                      <span style={{ background: '#0d1a00', border: '1px solid #1a3a00', borderRadius: '3px', padding: '0 5px', fontSize: '0.6rem', color: '#22c55e' }}>BLOCKED</span>
                    )}
                    <span style={{ color: '#333', fontSize: '0.68rem', fontFamily: 'monospace', marginLeft: 'auto' }}>
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: '#555', fontSize: '0.72rem', marginTop: '3px', fontFamily: 'monospace' }}>
                    IP: {ev.ip}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '2px', lineHeight: 1.4 }}>
                    {ev.details}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
