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
  MessageCircle, FileText, Sparkles, Loader2,
} from "lucide-react";

type Tab = "chat" | "members" | "admin" | "approvals" | "dm";

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
  const [msgInput, setMsgInput] = useState("");
  const [dmUserId, setDmUserId] = useState<string | null>(null);
  const [dmUserName, setDmUserName] = useState("");
  const [dmInput, setDmInput] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [viewHistoryUserId, setViewHistoryUserId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inv = params.get('invite');
    if (inv) setJoinToken(inv);
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
    mutationFn: async () => apiRequest('POST', '/api/workgroups/join', { token: joinToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workgroups'] });
      setJoinToken("");
      toast({ title: "Joined workgroup!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendMsgMutation = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/workgroups/${activeWgId}/messages`, { content: msgInput, messageType: 'group' }),
    onSuccess: () => { setMsgInput(""); refetchMessages(); },
  });

  const sendDmMutation = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/workgroups/${activeWgId}/messages`, { content: dmInput, recipientId: dmUserId, messageType: 'private' }),
    onSuccess: () => { setDmInput(""); refetchDMs(); },
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

  const bg = isDark ? 'bg-[#131314]' : 'bg-gray-50';
  const card = isDark ? 'bg-[#1e1f20] border-[#3c4043]' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-[#c4c7c5]' : 'text-gray-500';
  const inputBg = isDark ? 'bg-[#131314] border-[#3c4043] text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';

  if (!activeWgId) {
    return (
      <div className={`min-h-screen ${bg} ${textPrimary} p-4 sm:p-8`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setLocation('/chat')} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-[#8ab4f8]" /> Workgroups</h1>
            </div>
            <Button onClick={() => setShowCreate(true)} className="bg-[#4285F4] hover:bg-[#5a9bf4] text-white">
              <Plus className="h-4 w-4 mr-2" /> Create
            </Button>
          </div>

          <div className={`rounded-xl border p-4 mb-6 ${card}`}>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Mail className="h-4 w-4" /> Join with Invite Code</h3>
            <div className="flex gap-2">
              <input value={joinToken} onChange={e => setJoinToken(e.target.value)} placeholder="Paste invite code..." className={`flex-1 px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
              <Button onClick={() => joinMutation.mutate()} disabled={!joinToken.trim() || joinMutation.isPending} className="bg-[#4285F4]">
                {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
              </Button>
            </div>
          </div>

          {showCreate && (
            <div className={`rounded-xl border p-6 mb-6 ${card}`}>
              <h3 className="font-semibold mb-4">Create New Workgroup</h3>
              <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Workgroup name" className={`w-full px-3 py-2 rounded-lg border text-sm mb-3 ${inputBg}`} />
              <textarea value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Description (optional)" rows={2} className={`w-full px-3 py-2 rounded-lg border text-sm mb-4 ${inputBg}`} />
              <div className="flex gap-2">
                <Button onClick={() => createMutation.mutate()} disabled={!createName.trim() || createMutation.isPending} className="bg-[#4285F4]">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#8ab4f8]" /></div>
          ) : workgroups.length === 0 ? (
            <div className={`text-center py-16 ${textSecondary}`}>
              <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium mb-2">No workgroups yet</p>
              <p className="text-sm">Create one or join using an invite code.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workgroups.map((wg: any) => (
                <button key={wg.id} onClick={() => { setActiveWgId(wg.id); setActiveTab('chat'); }}
                  className={`w-full text-left rounded-xl border p-4 transition-all hover:scale-[1.01] ${card}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {wg.name}
                        {wg.myRole === 'owner' && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
                        {wg.myRole === 'admin' && <Shield className="h-3.5 w-3.5 text-blue-400" />}
                      </h3>
                      {wg.description && <p className={`text-sm mt-1 ${textSecondary}`}>{wg.description}</p>}
                    </div>
                    <ChevronRight className="h-5 w-5 opacity-40" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const isAdmin = activeWg?.myRole === 'owner' || activeWg?.myRole === 'admin';
  const isOwner = activeWg?.myRole === 'owner';

  const tabs: { id: Tab; label: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'admin', label: 'Admin', icon: Settings, adminOnly: true },
    { id: 'approvals', label: 'Approvals', icon: Shield, adminOnly: true },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${bg} ${textPrimary}`}>
      {/* Header */}
      <div className={`shrink-0 border-b px-4 py-3 flex items-center gap-3 ${isDark ? 'border-[#3c4043] bg-[#1e1f20]' : 'border-gray-200 bg-white'}`}>
        <button onClick={() => { if (activeTab === 'dm') { setActiveTab('members'); setDmUserId(null); } else { setActiveWgId(null); } }}
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold truncate">{activeTab === 'dm' ? `DM — ${dmUserName}` : activeWg?.name}</h2>
          <p className={`text-xs ${textSecondary}`}>{members.length} members</p>
        </div>
        <div className="flex items-center gap-1">
          {tabs.filter(t => !t.adminOnly || isAdmin).map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setViewHistoryUserId(null); }}
              className={`p-2 rounded-lg transition-colors ${activeTab === t.id ? 'bg-[#4285F4] text-white' : isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <t.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className={`text-center py-12 ${textSecondary}`}>
                  <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : chatMessages.filter((m: any) => m.messageType === 'group').map((m: any) => (
                <div key={m.id} className={`flex gap-3 ${m.senderId === user?.id ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.senderId === user?.id ? 'bg-[#4285F4] text-white' : isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {(m.senderName || '?')[0].toUpperCase()}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.senderId === user?.id ? 'bg-[#4285F4] text-white' : isDark ? 'bg-[#1e1f20] border border-[#3c4043]' : 'bg-white border border-gray-200'}`}>
                    {m.senderId !== user?.id && <p className="text-xs font-semibold mb-1 opacity-70">{m.senderName}</p>}
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    <p className={`text-[10px] mt-1 ${m.senderId === user?.id ? 'text-white/60' : 'opacity-40'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* AI Summary / Ask bar */}
            <div className={`shrink-0 border-t px-4 py-2 ${isDark ? 'border-[#3c4043]' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={fetchAiSummary} disabled={aiSummaryLoading} className="text-xs">
                  {aiSummaryLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  AI Summary
                </Button>
                <div className="flex-1 flex gap-1">
                  <input value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchAiAnswer()}
                    placeholder="Ask AI about the chat..." className={`flex-1 px-2 py-1 rounded-lg border text-xs ${inputBg}`} />
                  <Button variant="ghost" size="sm" onClick={fetchAiAnswer} disabled={aiAskLoading || !aiQuestion.trim()} className="text-xs px-2">
                    {aiAskLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              {aiSummary && (
                <div className={`rounded-lg p-3 mb-2 text-xs border ${isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                  <p className="font-semibold mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Summary</p>
                  <p className="whitespace-pre-wrap">{aiSummary}</p>
                  <button onClick={() => setAiSummary("")} className="text-xs mt-1 underline opacity-60">Dismiss</button>
                </div>
              )}
              {aiAnswer && (
                <div className={`rounded-lg p-3 mb-2 text-xs border ${isDark ? 'bg-green-500/10 border-green-500/20 text-green-200' : 'bg-green-50 border-green-200 text-green-800'}`}>
                  <p className="font-semibold mb-1 flex items-center gap-1"><Bot className="h-3 w-3" /> AI Answer</p>
                  <p className="whitespace-pre-wrap">{aiAnswer}</p>
                  <button onClick={() => setAiAnswer("")} className="text-xs mt-1 underline opacity-60">Dismiss</button>
                </div>
              )}
            </div>

            {/* Message input */}
            <div className={`shrink-0 border-t px-4 py-3 ${isDark ? 'border-[#3c4043]' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && msgInput.trim()) sendMsgMutation.mutate(); }}
                  placeholder="Type a message..." className={`flex-1 px-4 py-2.5 rounded-xl border text-sm ${inputBg}`} />
                <Button onClick={() => sendMsgMutation.mutate()} disabled={!msgInput.trim() || sendMsgMutation.isPending} className="bg-[#4285F4] rounded-xl px-4">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* DM TAB */}
        {activeTab === 'dm' && dmUserId && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {dmMessages.length === 0 ? (
                <div className={`text-center py-12 ${textSecondary}`}>
                  <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p>No messages yet with {dmUserName}</p>
                </div>
              ) : dmMessages.map((m: any) => (
                <div key={m.id} className={`flex gap-3 ${m.senderId === user?.id ? 'flex-row-reverse' : ''}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.senderId === user?.id ? 'bg-[#4285F4] text-white' : isDark ? 'bg-[#1e1f20] border border-[#3c4043]' : 'bg-white border border-gray-200'}`}>
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    <p className={`text-[10px] mt-1 ${m.senderId === user?.id ? 'text-white/60' : 'opacity-40'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className={`shrink-0 border-t px-4 py-3 ${isDark ? 'border-[#3c4043]' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <input value={dmInput} onChange={e => setDmInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && dmInput.trim()) sendDmMutation.mutate(); }}
                  placeholder={`Message ${dmUserName}...`} className={`flex-1 px-4 py-2.5 rounded-xl border text-sm ${inputBg}`} />
                <Button onClick={() => sendDmMutation.mutate()} disabled={!dmInput.trim() || sendDmMutation.isPending} className="bg-[#4285F4] rounded-xl px-4">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="p-4 space-y-3">
            {isAdmin && (
              <div className={`rounded-xl border p-4 mb-4 ${card}`}>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><UserPlus className="h-4 w-4" /> Invite Member</h3>
                <div className="flex gap-2">
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@email.com" className={`flex-1 px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
                  <Button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail.trim() || inviteMutation.isPending} className="bg-[#4285F4]">
                    {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {members.map((m: any) => (
              <div key={m.id} className={`rounded-xl border p-4 ${card} ${m.isBlocked ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                      {(m.userName || m.userEmail || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-2">
                        {m.userName || m.userEmail}
                        {m.role === 'owner' && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
                        {m.role === 'admin' && <Shield className="h-3.5 w-3.5 text-blue-400" />}
                        {m.isBlocked && <Ban className="h-3.5 w-3.5 text-red-500" />}
                        {m.isRestricted && <Lock className="h-3.5 w-3.5 text-orange-400" />}
                      </p>
                      <p className={`text-xs ${textSecondary}`}>{m.userEmail} · {m.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {m.userId !== user?.id && (
                      <button onClick={() => { setDmUserId(m.userId); setDmUserName(m.userName || m.userEmail); setActiveTab('dm'); }}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`} title="Private Message">
                        <MessageCircle className="h-4 w-4 text-[#8ab4f8]" />
                      </button>
                    )}
                    {isAdmin && m.userId !== user?.id && m.role !== 'owner' && (
                      <>
                        {isAdmin && (
                          <button onClick={() => setViewHistoryUserId(viewHistoryUserId === m.userId ? null : m.userId)}
                            className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`} title="View search history">
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => blockMutation.mutate({ userId: m.userId, blocked: !m.isBlocked })}
                          className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`} title={m.isBlocked ? 'Unblock' : 'Block'}>
                          <Ban className={`h-4 w-4 ${m.isBlocked ? 'text-red-500' : ''}`} />
                        </button>
                        <button onClick={() => restrictMutation.mutate({ userId: m.userId, restricted: !m.isRestricted })}
                          className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`} title={m.isRestricted ? 'Unrestrict' : 'Restrict messaging'}>
                          <Lock className={`h-4 w-4 ${m.isRestricted ? 'text-orange-400' : ''}`} />
                        </button>
                        {isOwner && (
                          <button onClick={() => roleMutation.mutate({ userId: m.userId, role: m.role === 'admin' ? 'member' : 'admin' })}
                            className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`} title={m.role === 'admin' ? 'Demote to member' : 'Promote to admin'}>
                            <Shield className={`h-4 w-4 ${m.role === 'admin' ? 'text-blue-400' : ''}`} />
                          </button>
                        )}
                        <button onClick={() => { if (confirm(`Remove ${m.userName || m.userEmail}?`)) kickMutation.mutate(m.userId); }}
                          className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`} title="Kick">
                          <UserMinus className="h-4 w-4 text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {viewHistoryUserId === m.userId && (
                  <div className={`mt-4 rounded-lg border p-3 ${isDark ? 'border-[#3c4043] bg-black/30' : 'border-gray-200 bg-gray-50'}`}>
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><Search className="h-3 w-3" /> Search History</h4>
                    {memberHistory.length === 0 ? (
                      <p className={`text-xs ${textSecondary}`}>No search history found.</p>
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

            <div className="pt-4 space-y-2">
              {activeWg?.myRole !== 'owner' && (
                <Button variant="ghost" onClick={() => { if (confirm('Leave this workgroup?')) leaveMutation.mutate(); }} className="w-full text-red-400 hover:text-red-300">
                  <LogOut className="h-4 w-4 mr-2" /> Leave Workgroup
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && isAdmin && (
          <div className="p-4 space-y-4">
            <div className={`rounded-xl border p-5 ${card}`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Settings className="h-5 w-5" /> Workgroup Settings</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Require Approval</p>
                    <p className={`text-xs ${textSecondary}`}>Code and email drafts must be approved by an admin before being sent</p>
                  </div>
                  <button onClick={() => toggleApprovalMutation.mutate(!activeWg?.requireApproval)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${activeWg?.requireApproval ? 'bg-[#4285F4]' : isDark ? 'bg-white/10' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${activeWg?.requireApproval ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className={`rounded-lg border p-4 ${isDark ? 'border-[#3c4043] bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
                  <p className="text-sm font-medium mb-1">Group Stats</p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className={`text-xs ${textSecondary}`}>Members</p>
                      <p className="text-lg font-bold">{members.length}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${textSecondary}`}>Admins</p>
                      <p className="text-lg font-bold">{members.filter((m: any) => m.role === 'admin' || m.role === 'owner').length}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${textSecondary}`}>Blocked</p>
                      <p className="text-lg font-bold text-red-400">{members.filter((m: any) => m.isBlocked).length}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${textSecondary}`}>Restricted</p>
                      <p className="text-lg font-bold text-orange-400">{members.filter((m: any) => m.isRestricted).length}</p>
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <Button variant="destructive" onClick={() => { if (confirm('Delete this workgroup? This cannot be undone.')) deleteMutation.mutate(); }} className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Workgroup
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* APPROVALS TAB */}
        {activeTab === 'approvals' && isAdmin && (
          <div className="p-4 space-y-3">
            {!activeWg?.requireApproval && (
              <div className={`rounded-lg border p-3 text-sm ${isDark ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' : 'border-yellow-300 bg-yellow-50 text-yellow-800'}`}>
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Approval mode is disabled. Enable it in Admin settings to require approval for code and email drafts.
              </div>
            )}
            {approvals.length === 0 ? (
              <div className={`text-center py-12 ${textSecondary}`}>
                <Shield className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>No pending approvals</p>
              </div>
            ) : approvals.map((a: any) => (
              <div key={a.id} className={`rounded-xl border p-4 ${card}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{a.requesterName}</p>
                    <p className={`text-xs ${textSecondary}`}>{a.contentType} · {new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : a.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {a.status}
                  </span>
                </div>
                <div className={`rounded-lg border p-3 text-sm whitespace-pre-wrap ${isDark ? 'border-[#3c4043] bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
                  {a.content.slice(0, 500)}{a.content.length > 500 ? '...' : ''}
                </div>
                {a.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => reviewMutation.mutate({ approvalId: a.id, status: 'approved' })} className="bg-green-600 hover:bg-green-500">
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => reviewMutation.mutate({ approvalId: a.id, status: 'rejected', reviewNote: 'Rejected by admin' })}>
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
