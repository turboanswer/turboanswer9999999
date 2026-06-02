import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  Users,
  ClipboardList,
  LogOut,
  ShieldAlert,
  Check,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { PROCEDURES, PROCEDURE_CATEGORIES, DIFFICULTIES, type Procedure } from "@shared/procedures";

type RecepUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
};

type AssistantMatch = { id: number; title: string; category: string; difficulty: string };
type AssistantResult = { guidance: string; matches: AssistantMatch[] };
type ActivityMessage = { role: string; content: string; createdAt: string };
type ActivityConversation = { id: number; title: string; createdAt: string; messages: ActivityMessage[] };
type ActivityResult = { conversations: ActivityConversation[] };

const TIERS = ["free", "pro", "research", "enterprise"] as const;

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  research: "Research",
  enterprise: "Enterprise",
};

const TIER_COLOR: Record<string, string> = {
  free: "bg-gray-600",
  pro: "bg-blue-600",
  research: "bg-purple-600",
  enterprise: "bg-amber-600",
};

const DIFF_COLOR: Record<string, string> = {
  easy: "bg-green-700",
  medium: "bg-yellow-700",
  complex: "bg-red-700",
};

const PROC_BY_ID = new Map(PROCEDURES.map((p) => [p.id, p]));

function ProcedureCard({ p, highlight }: { p: Procedure; highlight?: boolean }) {
  return (
    <div
      id={`procedure-${p.id}`}
      className={`rounded-lg border bg-[#141416] p-5 ${highlight ? "border-purple-500 ring-1 ring-purple-500/40" : "border-[#222]"}`}
      data-testid={`procedure-${p.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="font-semibold text-base">
          {p.id}. {p.title}
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          {p.difficulty && (
            <span className={`text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full text-white ${DIFF_COLOR[p.difficulty] || "bg-gray-600"}`}>
              {p.difficulty}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-1">{p.category}</p>
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">When: {p.when}</p>
      {p.script && <p className="text-sm text-purple-300 italic mb-3">“{p.script}”</p>}
      {p.steps?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-400 mb-1">Steps</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-200">
            {p.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
      {p.capture && p.capture.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-400 mb-1">Capture</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-200">
            {p.capture.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {p.escalate && (
        <p className="text-sm text-amber-400 mb-1">
          <span className="font-semibold">Escalate:</span> {p.escalate}
        </p>
      )}
      {p.never && (
        <p className="text-sm text-red-400">
          <span className="font-semibold">Never:</span> {p.never}
        </p>
      )}
    </div>
  );
}

export default function ReceptionistDashboard() {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"assistant" | "accounts" | "procedures">("assistant");

  // Accounts
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Record<string, string>>({});
  const [openActivity, setOpenActivity] = useState<string | null>(null);
  const [escalateUser, setEscalateUser] = useState<RecepUser | null>(null);
  const [escalateText, setEscalateText] = useState("");
  const [escalateSeverity, setEscalateSeverity] = useState("normal");

  // Assistant
  const [issue, setIssue] = useState("");
  const [result, setResult] = useState<AssistantResult | null>(null);

  // Procedures
  const [procSearch, setProcSearch] = useState("");
  const [procCategory, setProcCategory] = useState("all");
  const [procDifficulty, setProcDifficulty] = useState("all");
  const [openProc, setOpenProc] = useState<number | null>(null);

  const allowed = !!user && ((user as any).isReceptionist || (user as any).isEmployee);

  const { data: users = [], isLoading: usersLoading } = useQuery<RecepUser[]>({
    queryKey: ["/api/receptionist/users"],
    enabled: allowed,
  });

  const modifyMutation = useMutation({
    mutationFn: (data: { userId: string; tier: string }) =>
      apiRequest("POST", "/api/receptionist/modify-subscription", data),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/receptionist/users"] });
      setPending((p) => {
        const next = { ...p };
        delete next[vars.userId];
        return next;
      });
      toast({ title: "Plan updated", description: `Set to ${TIER_LABEL[vars.tier]}.` });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err?.message || "Could not change the plan.", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (data: { userId: string }) =>
      apiRequest("POST", "/api/receptionist/cancel-subscription", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receptionist/users"] });
      toast({ title: "Subscription cancelled", description: "The customer is back on the Free plan." });
    },
    onError: (err: any) => {
      toast({ title: "Cancel failed", description: err?.message || "Could not cancel.", variant: "destructive" });
    },
  });

  const assistantMutation = useMutation({
    mutationFn: async (text: string): Promise<AssistantResult> => {
      const res = await apiRequest("POST", "/api/receptionist/assistant", { issue: text });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (err: any) => {
      toast({ title: "Assistant unavailable", description: err?.message || "Try the Procedures search.", variant: "destructive" });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (data: { userId?: string; summary: string; severity: string }) =>
      apiRequest("POST", "/api/receptionist/escalate", data),
    onSuccess: () => {
      toast({ title: "Escalation sent", description: "Engineering has been emailed." });
      setEscalateUser(null);
      setEscalateText("");
      setEscalateSeverity("normal");
    },
    onError: (err: any) => {
      toast({ title: "Escalation failed", description: err?.message || "Could not send.", variant: "destructive" });
    },
  });

  const { data: activity, isLoading: activityLoading } = useQuery<ActivityResult>({
    queryKey: ["/api/receptionist/user-activity", openActivity],
    enabled: !!openActivity,
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
      return (u.email ?? "").toLowerCase().includes(q) || name.includes(q);
    });
  }, [users, search]);

  const filteredProcs = useMemo(() => {
    const q = procSearch.trim().toLowerCase();
    return PROCEDURES.filter((p) => {
      if (procCategory !== "all" && p.category !== procCategory) return false;
      if (procDifficulty !== "all" && p.difficulty !== procDifficulty) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.when} ${(p.keywords || []).join(" ")} ${p.category}`.toLowerCase();
      return hay.includes(q);
    });
  }, [procSearch, procCategory, procDifficulty]);

  const visibleProcs = filteredProcs.slice(0, 60);

  function goToProcedure(id: number) {
    setTab("procedures");
    setProcSearch("");
    setProcCategory("all");
    setProcDifficulty("all");
    setOpenProc(id);
    setTimeout(() => {
      document.getElementById(`procedure-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0b0c] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login?redirect=/receptionist");
    return null;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#0b0b0c] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Access denied</h1>
          <p className="text-gray-400 mb-6">This area is for receptionist accounts only.</p>
          <Button onClick={() => setLocation("/chat")}>Back to TurboAnswer</Button>
        </div>
      </div>
    );
  }

  const tabBtn = (key: typeof tab, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setTab(key)}
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        tab === key ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
      }`}
      data-testid={`tab-${key}`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white">
      <header className="border-b border-[#222] px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0b0b0c] z-10">
        <div>
          <h1 className="text-lg font-semibold">Receptionist Panel</h1>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => logout()} className="border-[#333] text-gray-300">
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </header>

      <div className="px-4 sm:px-6 pt-4">
        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[#222] p-1 bg-[#141416]">
          {tabBtn("assistant", <Sparkles className="h-4 w-4" />, "Help Assistant")}
          {tabBtn("accounts", <Users className="h-4 w-4" />, "Accounts")}
          {tabBtn("procedures", <ClipboardList className="h-4 w-4" />, "Procedures")}
        </div>
      </div>

      {/* ---- Help Assistant ---- */}
      {tab === "assistant" && (
        <div className="p-4 sm:p-6 max-w-3xl">
          <p className="text-sm text-gray-400 mb-4">
            Type what the customer is having trouble with. The assistant (powered by GPT-5.1 Codex)
            finds the exact procedure to follow.
          </p>
          <Textarea
            placeholder="e.g. Customer was charged twice and wants a refund"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            className="bg-[#141416] border-[#2a2a2e] text-white min-h-[90px]"
            data-testid="input-assistant-issue"
          />
          <div className="mt-3 flex items-center gap-3">
            <Button
              onClick={() => issue.trim() && assistantMutation.mutate(issue.trim())}
              disabled={!issue.trim() || assistantMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-assistant-find"
            >
              {assistantMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Finding…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Find the procedure</>
              )}
            </Button>
            {result && (
              <button onClick={() => { setResult(null); setIssue(""); }} className="text-sm text-gray-500 hover:text-white">
                Clear
              </button>
            )}
          </div>

          {result && (
            <div className="mt-6 space-y-4" data-testid="assistant-result">
              <div className="rounded-lg border border-purple-500/40 bg-purple-950/20 p-4">
                <p className="text-xs font-semibold text-purple-300 mb-1 uppercase tracking-wide">Guidance</p>
                <p className="text-sm text-gray-100">{result.guidance}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Matching procedures</p>
                <div className="space-y-2">
                  {result.matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => goToProcedure(m.id)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-[#222] bg-[#141416] hover:border-purple-500 text-left"
                      data-testid={`assistant-match-${m.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.id}. {m.title}</p>
                        <p className="text-xs text-gray-500">{m.category}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Accounts ---- */}
      {tab === "accounts" && (
        <div className="p-4 sm:p-6">
          <p className="text-sm text-gray-400 mb-4">
            Search a customer to change or cancel their plan, see what they've been chatting about,
            or escalate their issue to engineering.
          </p>
          <div className="relative mb-5 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#141416] border-[#2a2a2e] text-white"
              data-testid="input-search-users"
            />
          </div>

          {usersLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-gray-500">No accounts found.</p>
          ) : (
            <div className="space-y-2">
              {filteredUsers.slice(0, 100).map((u) => {
                const current = u.subscriptionTier || "free";
                const selected = pending[u.id] ?? current;
                const changed = selected !== current;
                const isSaving = modifyMutation.isPending && modifyMutation.variables?.userId === u.id;
                const isCancelling = cancelMutation.isPending && cancelMutation.variables?.userId === u.id;
                const activityOpen = openActivity === u.id;
                return (
                  <div key={u.id} className="rounded-lg border border-[#222] bg-[#141416]" data-testid={`row-user-${u.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {(u.firstName || u.lastName) ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "—"}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{u.email}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full text-white ${TIER_COLOR[current] || "bg-gray-600"}`}>
                        {TIER_LABEL[current] || current}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select value={selected} onValueChange={(v) => setPending((p) => ({ ...p, [u.id]: v }))}>
                          <SelectTrigger className="w-[130px] bg-[#0b0b0c] border-[#2a2a2e] text-white" data-testid={`select-tier-${u.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIERS.map((t) => (
                              <SelectItem key={t} value={t}>{TIER_LABEL[t]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          disabled={!changed || isSaving}
                          onClick={() => modifyMutation.mutate({ userId: u.id, tier: selected })}
                          className="bg-purple-600 hover:bg-purple-700"
                          data-testid={`button-apply-${u.id}`}
                        >
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Apply</>}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap px-4 pb-4 -mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#333] text-gray-300 h-8"
                        onClick={() => setOpenActivity(activityOpen ? null : u.id)}
                        data-testid={`button-chats-${u.id}`}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" /> {activityOpen ? "Hide chats" : "View chats"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#333] text-amber-300 h-8"
                        onClick={() => { setEscalateUser(u); setEscalateText(""); setEscalateSeverity("normal"); }}
                        data-testid={`button-escalate-${u.id}`}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" /> Escalate
                      </Button>
                      {current !== "free" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-900 text-red-400 h-8"
                          disabled={isCancelling}
                          onClick={() => {
                            if (confirm(`Cancel the ${TIER_LABEL[current]} subscription for ${u.email}? They will move to the Free plan.`)) {
                              cancelMutation.mutate({ userId: u.id });
                            }
                          }}
                          data-testid={`button-cancel-${u.id}`}
                        >
                          {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-1" /> Cancel plan</>}
                        </Button>
                      )}
                    </div>

                    {activityOpen && (
                      <div className="border-t border-[#222] px-4 py-3" data-testid={`activity-${u.id}`}>
                        {activityLoading ? (
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading chats…
                          </div>
                        ) : !activity || activity.conversations.length === 0 ? (
                          <p className="text-sm text-gray-500">No chats found for this customer.</p>
                        ) : (
                          <div className="space-y-3">
                            {activity.conversations.map((c) => (
                              <div key={c.id} className="rounded-md border border-[#222] bg-[#0f0f10] p-3">
                                <p className="text-sm font-medium mb-2 truncate">{c.title || "Conversation"}</p>
                                <div className="space-y-1.5">
                                  {c.messages.map((m, i) => (
                                    <div key={i} className="text-xs">
                                      <span className={m.role === "user" ? "text-blue-300" : "text-purple-300"}>
                                        {m.role === "user" ? "Customer" : "AI"}:
                                      </span>{" "}
                                      <span className="text-gray-300">{m.content}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredUsers.length > 100 && (
                <p className="text-xs text-gray-600 pt-2">Showing first 100 — refine your search to narrow results.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Procedures ---- */}
      {tab === "procedures" && (
        <div className="p-4 sm:p-6">
          <p className="text-sm text-gray-400 mb-4">
            {PROCEDURES.length.toLocaleString()} procedures, from easy to complex. Search or filter to find one fast.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-5 max-w-3xl">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
              <Input
                placeholder="Search procedures…"
                value={procSearch}
                onChange={(e) => setProcSearch(e.target.value)}
                className="pl-9 bg-[#141416] border-[#2a2a2e] text-white"
                data-testid="input-search-procedures"
              />
            </div>
            <Select value={procCategory} onValueChange={setProcCategory}>
              <SelectTrigger className="w-full sm:w-[190px] bg-[#141416] border-[#2a2a2e] text-white" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {PROCEDURE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={procDifficulty} onValueChange={setProcDifficulty}>
              <SelectTrigger className="w-full sm:w-[140px] bg-[#141416] border-[#2a2a2e] text-white" data-testid="select-difficulty">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-gray-600 mb-3">
            {filteredProcs.length.toLocaleString()} match{filteredProcs.length === 1 ? "" : "es"}
            {filteredProcs.length > visibleProcs.length ? ` — showing first ${visibleProcs.length}` : ""}
          </p>

          {openProc != null && PROC_BY_ID.has(openProc) && (
            <div className="mb-4 max-w-3xl">
              <ProcedureCard p={PROC_BY_ID.get(openProc)!} highlight />
              <button onClick={() => setOpenProc(null)} className="text-xs text-gray-500 hover:text-white mt-2">
                Close pinned procedure
              </button>
            </div>
          )}

          <div className="space-y-4 max-w-3xl">
            {visibleProcs
              .filter((p) => p.id !== openProc)
              .map((p) => (
                <ProcedureCard key={p.id} p={p} />
              ))}
          </div>
        </div>
      )}

      {/* ---- Escalate dialog ---- */}
      {escalateUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEscalateUser(null)}>
          <div className="bg-[#141416] border border-[#2a2a2e] rounded-lg w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Escalate to engineering
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Sends an email to support@turboanswer.it.com with {escalateUser.email}'s account details and your notes.
            </p>
            <label className="text-xs text-gray-400">Severity</label>
            <Select value={escalateSeverity} onValueChange={setEscalateSeverity}>
              <SelectTrigger className="w-full mb-3 bg-[#0b0b0c] border-[#2a2a2e] text-white" data-testid="select-severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["low", "normal", "high", "urgent"].map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="text-xs text-gray-400">What's the issue?</label>
            <Textarea
              value={escalateText}
              onChange={(e) => setEscalateText(e.target.value)}
              placeholder="Describe the problem the customer is hitting…"
              className="bg-[#0b0b0c] border-[#2a2a2e] text-white min-h-[100px] mb-4"
              data-testid="input-escalate-text"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-[#333] text-gray-300" onClick={() => setEscalateUser(null)}>
                Cancel
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                disabled={!escalateText.trim() || escalateMutation.isPending}
                onClick={() => escalateMutation.mutate({ userId: escalateUser.id, summary: escalateText.trim(), severity: escalateSeverity })}
                data-testid="button-send-escalation"
              >
                {escalateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send escalation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
