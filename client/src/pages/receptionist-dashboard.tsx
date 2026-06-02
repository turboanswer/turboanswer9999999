import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { PROCEDURES } from "@shared/procedures";

type RecepUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
};

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

export default function ReceptionistDashboard() {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"accounts" | "procedures">("accounts");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Record<string, string>>({});

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
      toast({
        title: "Update failed",
        description: err?.message || "Could not change the plan.",
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
      return (u.email ?? "").toLowerCase().includes(q) || name.includes(q);
    });
  }, [users, search]);

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
          <p className="text-gray-400 mb-6">
            This area is for receptionist accounts only.
          </p>
          <Button onClick={() => setLocation("/chat")}>Back to TurboAnswer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white">
      <header className="border-b border-[#222] px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0b0b0c] z-10">
        <div>
          <h1 className="text-lg font-semibold">Receptionist Panel</h1>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          className="border-[#333] text-gray-300"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </header>

      <div className="px-4 sm:px-6 pt-4">
        <div className="inline-flex rounded-lg border border-[#222] p-1 bg-[#141416]">
          <button
            onClick={() => setTab("accounts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "accounts" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
            }`}
            data-testid="tab-accounts"
          >
            <Users className="h-4 w-4" /> Accounts
          </button>
          <button
            onClick={() => setTab("procedures")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "procedures" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
            }`}
            data-testid="tab-procedures"
          >
            <ClipboardList className="h-4 w-4" /> Procedures
          </button>
        </div>
      </div>

      {tab === "accounts" && (
        <div className="p-4 sm:p-6">
          <p className="text-sm text-gray-400 mb-4">
            Search a customer and change their plan. You can take card details on the call,
            then set the plan they paid for here.
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
          ) : filtered.length === 0 ? (
            <p className="text-gray-500">No accounts found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => {
                const current = u.subscriptionTier || "free";
                const selected = pending[u.id] ?? current;
                const changed = selected !== current;
                const isSaving = modifyMutation.isPending && modifyMutation.variables?.userId === u.id;
                return (
                  <div
                    key={u.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-lg border border-[#222] bg-[#141416]"
                    data-testid={`row-user-${u.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {(u.firstName || u.lastName)
                          ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                          : "—"}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{u.email}</p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full text-white ${TIER_COLOR[current] || "bg-gray-600"}`}
                    >
                      {TIER_LABEL[current] || current}
                    </span>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selected}
                        onValueChange={(v) => setPending((p) => ({ ...p, [u.id]: v }))}
                      >
                        <SelectTrigger
                          className="w-[140px] bg-[#0b0b0c] border-[#2a2a2e] text-white"
                          data-testid={`select-tier-${u.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIERS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {TIER_LABEL[t]}
                            </SelectItem>
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
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" /> Apply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "procedures" && (
        <div className="p-4 sm:p-6">
          <p className="text-sm text-gray-400 mb-5">
            Full list of TurboAnswer call-center procedures. Follow the matching one on each call.
          </p>
          <div className="space-y-4 max-w-3xl">
            {PROCEDURES.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-[#222] bg-[#141416] p-5"
                data-testid={`procedure-${p.id}`}
              >
                <h2 className="font-semibold text-base mb-1">
                  {p.id}. {p.title}
                </h2>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                  When: {p.when}
                </p>
                {p.script && (
                  <p className="text-sm text-purple-300 italic mb-3">“{p.script}”</p>
                )}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
