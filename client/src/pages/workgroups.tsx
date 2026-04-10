import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Users, Plus, Settings, MessageSquare, Shield, Send, ArrowLeft,
  Crown, UserMinus, Ban, Eye, ChevronRight, Search, Bot, Lock,
  Check, X, AlertTriangle, Mail, UserPlus, LogOut, Trash2,
  MessageCircle, FileText, Sparkles, Loader2, Smile, Paperclip,
  MoreVertical, Phone, Video,
} from "lucide-react";

type Tab = "chat" | "members" | "admin" | "approvals" | "dm";

function formatMessageDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;
  if (diff < dayMs && now.getDate() === date.getDate()) return 'Today';
  if (diff < dayMs * 2 && now.getDate() - date.getDate() === 1) return 'Yesterday';
  if (diff < dayMs * 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500',
    'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
    'bg-indigo-500', 'bg-orange-500', 'bg-lime-600', 'bg-fuchsia-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function shouldShowAvatar(messages: any[], index: number, currentUserId: string | undefined): boolean {
  const msg = messages[index];
  if (msg.senderId === currentUserId) return false;
  if (index === messages.length - 1) return true;
  const next = messages[index + 1];
  return next.senderId !== msg.senderId;
}

function isNewSenderGroup(messages: any[], index: number): boolean {
  if (index === 0) return true;
  return messages[index].senderId !== messages[index - 1].senderId;
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toDateString();
}

export default function WorkgroupsPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeWgId, setActiveWgId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [dmUserId, setDmUserId] = useState<string | null>(null);
  const [dmUserName, setDmUserName] = useState("");
  const [dmInput, setDmInput] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [viewHistoryUserId, setViewHistoryUserId] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dmEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inv = params.get('invite');
    const code = inv || localStorage.getItem('turbo_pending_invite') || '';
    if (code) {
      setJoinToken(code);
      setActiveWgId(null);
      if (code.length === 6 && /^\d{6}$/.test(code)) {
        const digits = code.split('');
        setCodeDigits(digits);
      }
      localStorage.removeItem('turbo_pending_invite');
      window.history.replaceState({}, '', '/workgroups');
    }
  }, []);

  const { data: workgroups = [], isLoading } = useQuery<any[]>({ queryKey: ['/api/workgroups'] });

  const activeWg = workgroups.find((w: any) => w.id === activeWgId);

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ['/api/workgroups', activeWgId, 'members'],
    enabled: !!activeWgId,
  });

  const { data: chatMessages = [], refetch: refetchMessages } = useQuery<any[]>({
    queryKey: ['/api/workgroups', activeWgId, 'messages'],
    enabled: !!activeWgId && activeTab === 'chat',
    refetchInterval: 5000,
  });

  const { data: dmMessages = [], refetch: refetchDMs } = useQuery<any[]>({
    queryKey: ['/api/workgroups', activeWgId, 'messages', 'dm', dmUserId],
    enabled: !!activeWgId && !!dmUserId && activeTab === 'dm',
    refetchInterval: 3000,
  });

  const { data: approvals = [] } = useQuery<any[]>({
    queryKey: ['/api/workgroups', activeWgId, 'approvals'],
    enabled: !!activeWgId && activeTab === 'approvals' && (activeWg?.myRole === 'owner' || activeWg?.myRole === 'admin'),
  });

  const { data: memberHistory = [] } = useQuery<any[]>({
    queryKey: ['/api/workgroups', activeWgId, 'members', viewHistoryUserId, 'history'],
    enabled: !!activeWgId && !!viewHistoryUserId,
  });

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (dmEndRef.current) dmEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages]);

  const createMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/workgroups', { name: createName, description: createDesc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workgroups'] });
      setShowCreate(false);
      setCreateName("");
      setCreateDesc("");
      toast({ title: "Workgroup created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/workgroups/${activeWgId}/invite`, { email: inviteEmail }),
    onSuccess: () => {
      setInviteEmail("");
      toast({ title: "Invitation sent!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const code = codeDigits.join('') || joinToken;
      return apiRequest('POST', '/api/workgroups/join', { token: code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workgroups'] });
      setJoinToken("");
      setCodeDigits(["", "", "", "", "", ""]);
      toast({ title: "Joined workgroup!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendMsgMutation = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/workgroups/${activeWgId}/messages`, { content: msgInput, messageType: 'group' }),
    onSuccess: () => { setMsgInput(""); queryClient.invalidateQueries({ queryKey: ['/api/workgroups', activeWgId, 'messages'] }); inputRef.current?.focus(); },
  });

  const sendDmMutation = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/workgroups/${activeWgId}/messages`, { content: dmInput, recipientId: dmUserId, messageType: 'private' }),
    onSuccess: () => { setDmInput(""); queryClient.invalidateQueries({ queryKey: ['/api/workgroups', activeWgId, 'messages', 'dm', dmUserId] }); },
  });

  const kickMutation = useMutation({
    mutationFn: async (userId: string) => apiRequest('POST', `/api/workgroups/${activeWgId}/kick`, { userId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/workgroups', activeWgId, 'members'] }); toast({ title: "Member removed" }); },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => apiRequest('POST', `/api/workgroups/${activeWgId}/block`, { userId, blocked }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/workgroups', activeWgId, 'members'] }); toast({ title: "Updated" }); },
  });

  const restrictMutation = useMutation({
    mutationFn: async ({ userId, restricted }: { userId: string; restricted: boolean }) => apiRequest('POST', `/api/workgroups/${activeWgId}/restrict`, { userId, restricted }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/workgroups', activeWgId, 'members'] }); toast({ title: "Updated" }); },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => apiRequest('POST', `/api/workgroups/${activeWgId}/role`, { userId, role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/workgroups', activeWgId, 'members'] }); toast({ title: "Role updated" }); },
  });

  const toggleApprovalMutation = useMutation({
    mutationFn: async (requireApproval: boolean) => apiRequest('PATCH', `/api/workgroups/${activeWgId}`, { requireApproval }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/workgroups'] }); toast({ title: "Settings updated" }); },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ approvalId, status, reviewNote }: { approvalId: number; status: string; reviewNote?: string }) =>
      apiRequest('POST', `/api/workgroups/${activeWgId}/approvals/${approvalId}/review`, { status, reviewNote }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/workgroups', activeWgId, 'approvals'] }); toast({ title: "Review submitted" }); },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/workgroups/${activeWgId}/leave`),
    onSuccess: () => { setActiveWgId(null); queryClient.invalidateQueries({ queryKey: ['/api/workgroups'] }); toast({ title: "Left workgroup" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiRequest('DELETE', `/api/workgroups/${activeWgId}`),
    onSuccess: () => { setActiveWgId(null); queryClient.invalidateQueries({ queryKey: ['/api/workgroups'] }); toast({ title: "Workgroup deleted" }); },
  });

  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiAskLoading, setAiAskLoading] = useState(false);

  async function fetchAiSummary() {
    setAiSummaryLoading(true);
    try {
      const r = await apiRequest('POST', `/api/workgroups/${activeWgId}/ai-summary`);
      const data = await r.json();
      setAiSummary(data.summary);
    } catch { setAiSummary("Failed to generate summary."); }
    setAiSummaryLoading(false);
  }

  async function fetchAiAnswer() {
    if (!aiQuestion.trim()) return;
    setAiAskLoading(true);
    try {
      const r = await apiRequest('POST', `/api/workgroups/${activeWgId}/ai-ask`, { question: aiQuestion });
      const data = await r.json();
      setAiAnswer(data.answer);
    } catch { setAiAnswer("Failed to get answer."); }
    setAiAskLoading(false);
    setAiQuestion("");
  }

  const bg = isDark ? 'bg-black' : 'bg-gray-50';
  const card = isDark ? 'bg-[#1e1f20] border-[#3c4043]' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-[#c4c7c5]' : 'text-gray-500';
  const inputBg = isDark ? 'bg-[#131314] border-[#3c4043] text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';

  const groupMessages = chatMessages.filter((m: any) => m.messageType === 'group');

  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newDigits = [...codeDigits];
    newDigits[index] = value;
    setCodeDigits(newDigits);
    setJoinToken(newDigits.join(''));
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
    if (newDigits.every(d => d !== '') && newDigits.join('').length === 6) {
      setTimeout(() => joinMutation.mutate(), 100);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setCodeDigits(digits);
      setJoinToken(pasted);
      codeRefs.current[5]?.focus();
      setTimeout(() => joinMutation.mutate(), 100);
    }
  };

  const codeComplete = codeDigits.every(d => d !== '') && codeDigits.join('').length === 6;

  if (!activeWgId) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setLocation('/chat')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold tracking-tight">Workgroups</h1>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-white text-black text-sm font-semibold rounded-full px-4 h-9 hover:bg-white/90 transition-colors">
              <Plus className="h-4 w-4" /> New
            </button>
          </div>

          <div className="rounded-2xl bg-[#111111] border border-[#222222] p-6 mb-6">
            <div className="text-center mb-5">
              <p className="text-sm font-semibold text-white mb-1">Enter Invite Code</p>
              <p className="text-xs text-[#666666]">Type or paste the 6-digit code from your invitation email</p>
            </div>
            <div className="flex justify-center gap-2.5 mb-5" onPaste={handleCodePaste}>
              {codeDigits.map((digit, i) => (
                <div key={i} className="relative">
                  {i === 3 && <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[#333333]" />}
                  <input
                    ref={el => { codeRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeInput(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    className="w-12 h-14 bg-black border border-[#333333] rounded-xl text-center text-2xl font-bold text-white outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8]/30 transition-all caret-[#8ab4f8]"
                  />
                </div>
              ))}
            </div>
            <button onClick={() => joinMutation.mutate()} disabled={!codeComplete || joinMutation.isPending}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                codeComplete
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-[#1a1a1a] text-[#444444] cursor-not-allowed'
              }`}>
              {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Join Workgroup"}
            </button>
          </div>

          {showCreate && (
            <div className="rounded-2xl bg-[#111111] border border-[#222222] p-6 mb-6">
              <h3 className="font-semibold text-sm mb-4 text-white">Create Workgroup</h3>
              <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Group name"
                className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-sm text-white placeholder-[#555555] outline-none focus:border-[#8ab4f8] transition-colors mb-3" />
              <textarea value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Description (optional)" rows={2}
                className="w-full px-4 py-3 rounded-xl bg-black border border-[#333333] text-sm text-white placeholder-[#555555] outline-none focus:border-[#8ab4f8] transition-colors resize-none mb-4" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm text-[#888888] hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={() => createMutation.mutate()} disabled={!createName.trim() || createMutation.isPending}
                  className="bg-white text-black px-5 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-30">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#8ab4f8]" /></div>
          ) : workgroups.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-[#111111] border border-[#222222]">
                <Users className="h-7 w-7 text-[#444444]" />
              </div>
              <p className="text-sm font-medium text-[#888888] mb-1">No workgroups yet</p>
              <p className="text-xs text-[#555555]">Create a group or join one with an invite code</p>
            </div>
          ) : (
            <div className="space-y-1">
              {workgroups.map((wg: any) => (
                <button key={wg.id} onClick={() => { setActiveWgId(wg.id); setActiveTab('chat'); }}
                  className="w-full text-left rounded-2xl px-4 py-3.5 transition-all flex items-center gap-3.5 hover:bg-[#111111] active:bg-[#181818]">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0 ${getAvatarColor(wg.name)}`}>
                    {wg.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[15px] truncate text-white">{wg.name}</h3>
                      {wg.myRole === 'owner' && <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                      {wg.myRole === 'admin' && <Shield className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                    </div>
                    {wg.description && <p className="text-sm truncate mt-0.5 text-[#666666]">{wg.description}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#444444]" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const isAdminUser = activeWg?.myRole === 'owner' || activeWg?.myRole === 'admin';
  const isOwner = activeWg?.myRole === 'owner';

  const tabs: { id: Tab; label: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'admin', label: 'Admin', icon: Settings, adminOnly: true },
    { id: 'approvals', label: 'Approvals', icon: Shield, adminOnly: true },
  ];

  const renderChatBubbles = (msgs: any[], isGroupChat: boolean) => {
    let lastDateKey = '';

    return msgs.map((m: any, i: number) => {
      const isMine = m.senderId === user?.id;
      const dateKey = getDateKey(m.createdAt);
      const showDate = dateKey !== lastDateKey;
      if (showDate) lastDateKey = dateKey;
      const newGroup = isNewSenderGroup(msgs, i);
      const showAv = isGroupChat && shouldShowAvatar(msgs, i, user?.id);
      const isLastInGroup = i === msgs.length - 1 || msgs[i + 1]?.senderId !== m.senderId;
      const senderName = m.senderName || '?';

      return (
        <div key={m.id}>
          {showDate && (
            <div className="flex justify-center my-4">
              <span className={`text-[11px] font-medium px-3 py-1 rounded-full ${isDark ? 'bg-white/5 text-[#9aa0a6]' : 'bg-gray-200/80 text-gray-500'}`}>
                {formatMessageDate(new Date(m.createdAt))}
              </span>
            </div>
          )}
          <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''} ${newGroup ? 'mt-3' : 'mt-0.5'}`}>
            {isGroupChat && !isMine ? (
              <div className="w-7 shrink-0">
                {showAv && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${getAvatarColor(senderName)}`}>
                    {senderName[0].toUpperCase()}
                  </div>
                )}
              </div>
            ) : null}
            <div className={`max-w-[78%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
              {isGroupChat && !isMine && newGroup && (
                <p className={`text-[11px] font-medium mb-0.5 ml-1 ${isDark ? 'text-[#8ab4f8]' : 'text-blue-600'}`}>{senderName}</p>
              )}
              <div className={`
                relative px-3.5 py-2 text-[14px] leading-[20px]
                ${isMine
                  ? `${isDark ? 'bg-[#004a77] text-[#e8f0fe]' : 'bg-[#d3e3fd] text-[#1a1a1a]'}
                     ${isLastInGroup ? 'rounded-[20px_20px_4px_20px]' : 'rounded-[20px_4px_4px_20px]'}`
                  : `${isDark ? 'bg-[#303134] text-[#e8eaed]' : 'bg-white text-[#1a1a1a] border border-gray-200/80'}
                     ${isLastInGroup ? 'rounded-[20px_20px_20px_4px]' : 'rounded-[4px_20px_20px_4px]'}`
                }
              `}>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`text-[10px] mt-1 flex items-center gap-1 ${isMine ? (isDark ? 'text-blue-300/50' : 'text-blue-800/40') : (isDark ? 'text-white/30' : 'text-gray-400')}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMine && <Check className="h-2.5 w-2.5" />}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className={`h-screen flex flex-col ${bg} ${textPrimary}`}>
      {/* Header — Google Messages style */}
      <div className={`shrink-0 px-2 py-2 flex items-center gap-2 ${isDark ? 'bg-[#1e1f20]' : 'bg-white shadow-sm'}`}>
        <button onClick={() => { if (activeTab === 'dm') { setActiveTab('members'); setDmUserId(null); } else { setActiveWgId(null); } }}
          className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
          <ArrowLeft className="h-5 w-5" />
        </button>

        {activeTab === 'dm' ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${getAvatarColor(dmUserName)}`}>
              {(dmUserName || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-[15px] truncate">{dmUserName}</h2>
              <p className={`text-[11px] ${textSecondary}`}>Private message</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${getAvatarColor(activeWg?.name || '')}`}>
              {(activeWg?.name || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-[15px] truncate">{activeWg?.name}</h2>
              <p className={`text-[11px] ${textSecondary}`}>{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        <div className="flex items-center">
          {tabs.filter(t => !t.adminOnly || isAdminUser).map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setViewHistoryUserId(null); }}
              className={`p-2 rounded-full transition-colors relative ${
                activeTab === t.id
                  ? 'text-[#8ab4f8]'
                  : isDark ? 'text-[#9aa0a6] hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'
              }`} title={t.label}>
              <t.icon className="h-[18px] w-[18px]" />
              {activeTab === t.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-[#8ab4f8]" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`flex-1 overflow-y-auto px-3 py-2 ${isDark ? 'bg-black' : 'bg-[#f8f9fa]'}`}
              style={{ backgroundImage: isDark ? 'none' : 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
              {groupMessages.length === 0 ? (
                <div className={`text-center py-20 ${textSecondary}`}>
                  <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <MessageSquare className="h-7 w-7 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs mt-1 opacity-60">Be the first to say something!</p>
                </div>
              ) : (
                <>
                  {renderChatBubbles(groupMessages, true)}
                </>
              )}
              <div ref={chatEndRef} />
            </div>

            {showAiPanel && (
              <div className={`shrink-0 border-t px-4 py-3 space-y-2 ${isDark ? 'border-[#3c4043] bg-[#1e1f20]' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-[#8ab4f8]' : 'text-blue-600'}`}>
                    <Sparkles className="h-3.5 w-3.5" /> AI Assistant
                  </p>
                  <button onClick={() => setShowAiPanel(false)} className={`p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchAiSummary} disabled={aiSummaryLoading}
                    className={`rounded-full text-xs h-8 ${isDark ? 'border-[#3c4043] hover:bg-white/5' : ''}`}>
                    {aiSummaryLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Summarize chat
                  </Button>
                  <div className="flex-1 flex gap-1.5">
                    <input value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchAiAnswer()}
                      placeholder="Ask about the conversation..."
                      className={`flex-1 px-3 py-1.5 rounded-full border text-xs outline-none focus:border-[#4285F4] transition-colors ${inputBg}`} />
                    <Button size="sm" onClick={fetchAiAnswer} disabled={aiAskLoading || !aiQuestion.trim()}
                      className="bg-[#4285F4] hover:bg-[#5a9bf4] rounded-full h-8 w-8 p-0">
                      {aiAskLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                {aiSummary && (
                  <div className={`rounded-xl p-3 text-xs ${isDark ? 'bg-blue-500/10 text-blue-200' : 'bg-blue-50 text-blue-800'}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
                    <button onClick={() => setAiSummary("")} className="text-[10px] mt-2 underline opacity-50 hover:opacity-80">Dismiss</button>
                  </div>
                )}
                {aiAnswer && (
                  <div className={`rounded-xl p-3 text-xs ${isDark ? 'bg-emerald-500/10 text-emerald-200' : 'bg-green-50 text-green-800'}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{aiAnswer}</p>
                    <button onClick={() => setAiAnswer("")} className="text-[10px] mt-2 underline opacity-50 hover:opacity-80">Dismiss</button>
                  </div>
                )}
              </div>
            )}

            <div className={`shrink-0 px-3 py-2.5 ${isDark ? 'bg-[#1e1f20]' : 'bg-white border-t border-gray-100'}`}>
              <div className={`flex items-center gap-2 rounded-full px-1 py-1 ${isDark ? 'bg-[#303134]' : 'bg-[#f1f3f4] border border-gray-200'}`}>
                <button onClick={() => setShowAiPanel(!showAiPanel)}
                  className={`p-2 rounded-full shrink-0 transition-colors ${showAiPanel ? 'text-[#8ab4f8]' : isDark ? 'text-[#9aa0a6] hover:bg-white/10' : 'text-gray-400 hover:bg-gray-200'}`}>
                  <Sparkles className="h-5 w-5" />
                </button>
                <input ref={inputRef} value={msgInput} onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && msgInput.trim()) { e.preventDefault(); sendMsgMutation.mutate(); } }}
                  placeholder="Message" className={`flex-1 bg-transparent outline-none text-sm py-1.5 ${isDark ? 'text-white placeholder-[#9aa0a6]' : 'text-gray-900 placeholder-gray-400'}`} />
                <button onClick={() => { if (msgInput.trim()) sendMsgMutation.mutate(); }}
                  disabled={!msgInput.trim() || sendMsgMutation.isPending}
                  className={`p-2 rounded-full shrink-0 transition-all ${
                    msgInput.trim()
                      ? 'bg-[#4285F4] text-white hover:bg-[#5a9bf4] scale-100'
                      : `${isDark ? 'text-[#9aa0a6]' : 'text-gray-400'} scale-90 opacity-50`
                  }`}>
                  {sendMsgMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DM TAB */}
        {activeTab === 'dm' && dmUserId && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`flex-1 overflow-y-auto px-3 py-2 ${isDark ? 'bg-black' : 'bg-[#f8f9fa]'}`}
              style={{ backgroundImage: isDark ? 'none' : 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
              {dmMessages.length === 0 ? (
                <div className={`text-center py-20 ${textSecondary}`}>
                  <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold ${getAvatarColor(dmUserName)}`}>
                    {(dmUserName || '?')[0].toUpperCase()}
                  </div>
                  <p className="text-sm font-medium">{dmUserName}</p>
                  <p className="text-xs mt-1 opacity-60">Start a private conversation</p>
                </div>
              ) : (
                <>
                  {renderChatBubbles(dmMessages, false)}
                </>
              )}
              <div ref={dmEndRef} />
            </div>

            <div className={`shrink-0 px-3 py-2.5 ${isDark ? 'bg-[#1e1f20]' : 'bg-white border-t border-gray-100'}`}>
              <div className={`flex items-center gap-2 rounded-full px-1 py-1 ${isDark ? 'bg-[#303134]' : 'bg-[#f1f3f4] border border-gray-200'}`}>
                <div className="p-2" />
                <input value={dmInput} onChange={e => setDmInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && dmInput.trim()) { e.preventDefault(); sendDmMutation.mutate(); } }}
                  placeholder={`Message ${dmUserName}`} className={`flex-1 bg-transparent outline-none text-sm py-1.5 ${isDark ? 'text-white placeholder-[#9aa0a6]' : 'text-gray-900 placeholder-gray-400'}`} />
                <button onClick={() => { if (dmInput.trim()) sendDmMutation.mutate(); }}
                  disabled={!dmInput.trim() || sendDmMutation.isPending}
                  className={`p-2 rounded-full shrink-0 transition-all ${
                    dmInput.trim()
                      ? 'bg-[#4285F4] text-white hover:bg-[#5a9bf4] scale-100'
                      : `${isDark ? 'text-[#9aa0a6]' : 'text-gray-400'} scale-90 opacity-50`
                  }`}>
                  {sendDmMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="flex-1 overflow-y-auto">
            {isAdminUser && (
              <div className="px-4 pt-4 pb-2">
                <div className={`rounded-2xl border p-4 ${card}`}>
                  <p className={`text-xs font-medium mb-2 ${textSecondary}`}>Invite member</p>
                  <div className="flex gap-2">
                    <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@email.com"
                      className={`flex-1 px-3.5 py-2 rounded-full border text-sm outline-none focus:border-[#4285F4] transition-colors ${inputBg}`} />
                    <Button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail.trim() || inviteMutation.isPending}
                      className="bg-[#4285F4] hover:bg-[#5a9bf4] rounded-full h-9 w-9 p-0">
                      {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="px-4 py-2">
              <p className={`text-xs font-medium mb-2 px-1 ${textSecondary}`}>{members.length} member{members.length !== 1 ? 's' : ''}</p>
              {members.map((m: any) => (
                <div key={m.id} className={`rounded-xl px-3 py-3 mb-1 transition-colors ${m.isBlocked ? 'opacity-40' : ''} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${getAvatarColor(m.userName || m.userEmail || '?')}`}>
                      {(m.userName || m.userEmail || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm flex items-center gap-1.5 truncate">
                        {m.userName || m.userEmail}
                        {m.role === 'owner' && <Crown className="h-3 w-3 text-yellow-500 shrink-0" />}
                        {m.role === 'admin' && <Shield className="h-3 w-3 text-blue-400 shrink-0" />}
                        {m.isBlocked && <Ban className="h-3 w-3 text-red-500 shrink-0" />}
                        {m.isRestricted && <Lock className="h-3 w-3 text-orange-400 shrink-0" />}
                      </p>
                      <p className={`text-xs truncate ${textSecondary}`}>{m.role}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {m.userId !== user?.id && (
                        <button onClick={() => { setDmUserId(m.userId); setDmUserName(m.userName || m.userEmail); setActiveTab('dm'); }}
                          className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-[#8ab4f8]' : 'hover:bg-gray-100 text-blue-500'}`} title="Message">
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      )}
                      {isAdminUser && m.userId !== user?.id && m.role !== 'owner' && (
                        <>
                          <button onClick={() => setViewHistoryUserId(viewHistoryUserId === m.userId ? null : m.userId)}
                            className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} title="View history">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => blockMutation.mutate({ userId: m.userId, blocked: !m.isBlocked })}
                            className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} title={m.isBlocked ? 'Unblock' : 'Block'}>
                            <Ban className={`h-4 w-4 ${m.isBlocked ? 'text-red-500' : ''}`} />
                          </button>
                          <button onClick={() => restrictMutation.mutate({ userId: m.userId, restricted: !m.isRestricted })}
                            className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} title={m.isRestricted ? 'Unrestrict' : 'Restrict'}>
                            <Lock className={`h-4 w-4 ${m.isRestricted ? 'text-orange-400' : ''}`} />
                          </button>
                          {isOwner && (
                            <button onClick={() => roleMutation.mutate({ userId: m.userId, role: m.role === 'admin' ? 'member' : 'admin' })}
                              className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                              title={m.role === 'admin' ? 'Demote' : 'Promote'}>
                              <Shield className={`h-4 w-4 ${m.role === 'admin' ? 'text-blue-400' : ''}`} />
                            </button>
                          )}
                          <button onClick={() => { if (confirm(`Remove ${m.userName || m.userEmail}?`)) kickMutation.mutate(m.userId); }}
                            className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} title="Remove">
                            <UserMinus className="h-4 w-4 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {viewHistoryUserId === m.userId && (
                    <div className={`mt-3 ml-13 rounded-xl border p-3 ${isDark ? 'border-[#3c4043] bg-black/30' : 'border-gray-200 bg-gray-50'}`}>
                      <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1 ${textSecondary}`}><Search className="h-3 w-3" /> Search History</h4>
                      {memberHistory.length === 0 ? (
                        <p className={`text-xs ${textSecondary}`}>No history found.</p>
                      ) : memberHistory.slice(0, 10).map((h: any) => (
                        <div key={h.conversation.id} className={`text-xs py-1.5 border-b last:border-0 ${isDark ? 'border-[#3c4043]' : 'border-gray-200'}`}>
                          <p className="font-medium">{h.conversation.title}</p>
                          {h.messages[0] && <p className={`truncate mt-0.5 ${textSecondary}`}>{h.messages[0].content}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {activeWg?.myRole !== 'owner' && (
                <div className="pt-4 pb-6">
                  <Button variant="ghost" onClick={() => { if (confirm('Leave this workgroup?')) leaveMutation.mutate(); }}
                    className="w-full text-red-400 hover:text-red-300 rounded-xl">
                    <LogOut className="h-4 w-4 mr-2" /> Leave Workgroup
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && isAdminUser && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h3 className="font-semibold text-sm mb-5 flex items-center gap-2"><Settings className="h-4 w-4" /> Settings</h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Require Approval</p>
                    <p className={`text-xs mt-0.5 ${textSecondary}`}>Code and drafts need admin approval</p>
                  </div>
                  <button onClick={() => toggleApprovalMutation.mutate(!activeWg?.requireApproval)}
                    className={`w-11 h-6 rounded-full transition-all relative ${activeWg?.requireApproval ? 'bg-[#4285F4]' : isDark ? 'bg-white/10' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${activeWg?.requireApproval ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className={`rounded-xl p-4 ${isDark ? 'bg-black/30' : 'bg-gray-50'}`}>
                  <p className={`text-xs font-medium mb-3 ${textSecondary}`}>Group stats</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold">{members.length}</p>
                      <p className={`text-xs ${textSecondary}`}>Members</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{members.filter((m: any) => m.role === 'admin' || m.role === 'owner').length}</p>
                      <p className={`text-xs ${textSecondary}`}>Admins</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-400">{members.filter((m: any) => m.isBlocked).length}</p>
                      <p className={`text-xs ${textSecondary}`}>Blocked</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-400">{members.filter((m: any) => m.isRestricted).length}</p>
                      <p className={`text-xs ${textSecondary}`}>Restricted</p>
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <Button variant="destructive" onClick={() => { if (confirm('Delete this workgroup? This cannot be undone.')) deleteMutation.mutate(); }}
                    className="w-full rounded-xl">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Workgroup
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* APPROVALS TAB */}
        {activeTab === 'approvals' && isAdminUser && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!activeWg?.requireApproval && (
              <div className={`rounded-xl border p-3 text-sm flex items-center gap-2 ${isDark ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' : 'border-yellow-300 bg-yellow-50 text-yellow-800'}`}>
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Approval mode is off. Enable in Admin settings.
              </div>
            )}
            {approvals.length === 0 ? (
              <div className={`text-center py-20 ${textSecondary}`}>
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                  <Shield className="h-7 w-7 opacity-40" />
                </div>
                <p className="text-sm font-medium">No pending approvals</p>
              </div>
            ) : approvals.map((a: any) => (
              <div key={a.id} className={`rounded-2xl border p-4 ${card}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(a.requesterName || '?')}`}>
                      {(a.requesterName || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.requesterName}</p>
                      <p className={`text-[11px] ${textSecondary}`}>{a.contentType} · {new Date(a.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${a.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : a.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {a.status}
                  </span>
                </div>
                <div className={`rounded-xl border p-3 text-sm whitespace-pre-wrap ${isDark ? 'border-[#3c4043] bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
                  {a.content.slice(0, 500)}{a.content.length > 500 ? '...' : ''}
                </div>
                {a.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => reviewMutation.mutate({ approvalId: a.id, status: 'approved' })}
                      className="bg-emerald-600 hover:bg-emerald-500 rounded-full px-4">
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => reviewMutation.mutate({ approvalId: a.id, status: 'rejected', reviewNote: 'Rejected by admin' })}
                      className="rounded-full px-4">
                      <X className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
                {a.reviewNote && <p className={`text-xs mt-2 ${textSecondary}`}>Note: {a.reviewNote}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
