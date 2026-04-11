import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, Key, Plus, Trash2, Copy, Check, Loader2, Eye, EyeOff, Activity, Shield, Code, Zap, Clock, BarChart3, Users, Globe } from "lucide-react";

export default function ApiKeysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [rateLimit, setRateLimit] = useState("100");
  const [keyType, setKeyType] = useState<'public' | 'admin'>('public');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newKeyType, setNewKeyType] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewingUsage, setViewingUsage] = useState<number | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [showIntegration, setShowIntegration] = useState(false);

  const { data: keys = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/keys'],
  });

  const { data: usageData } = useQuery({
    queryKey: ['/api/keys', viewingUsage, 'usage'],
    enabled: !!viewingUsage,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/keys', { name: keyName, rateLimit: parseInt(rateLimit), keyType });
      return res.json();
    },
    onSuccess: (data: any) => {
      setNewKey(data.key);
      setNewKeyType(data.keyType || 'public');
      setKeyName("");
      setKeyType('public');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['/api/keys'] });
      toast({ title: data.keyType === 'admin' ? "Admin API key created!" : "API key created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/keys/${id}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/keys'] });
      toast({ title: data.message || "API key updated" });
    },
  });

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation('/chat')} className="text-[#666] hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
              <Key className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">API Keys</h1>
              <p className="text-xs text-[#555]">Integrate TurboAnswer construction AI into your apps</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowDocs(!showDocs)}
              className="px-4 py-2 rounded-xl bg-[#111] border border-[#222] text-sm text-[#888] hover:text-white transition-colors flex items-center gap-2">
              <Code className="h-4 w-4" /> Docs
            </button>
            <button onClick={() => { setShowCreate(true); setNewKey(null); }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-semibold hover:from-emerald-500 hover:to-cyan-500 transition-all flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Key
            </button>
          </div>
        </div>

        {newKey && (
          <div className={`rounded-2xl border p-6 mb-6 ${newKeyType === 'admin' ? 'bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20' : 'bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border-emerald-500/20'}`}>
            <div className="flex items-center gap-2 mb-3">
              {newKeyType === 'admin' ? <Shield className="h-4 w-4 text-orange-400" /> : <Shield className="h-4 w-4 text-emerald-400" />}
              <span className={`text-sm font-bold ${newKeyType === 'admin' ? 'text-orange-400' : 'text-emerald-400'}`}>
                {newKeyType === 'admin' ? 'Your New Admin API Key' : 'Your New API Key'}
              </span>
              {newKeyType === 'admin' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">Employee Only</span>}
            </div>
            <p className="text-xs text-[#888] mb-3">
              {newKeyType === 'admin' ? 'This admin key includes internal pricing, supplier costs, and profit margins. Keep it secure — it will not be shown again.' : 'Copy this key now. It will not be shown again.'}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-sm font-mono text-emerald-300 overflow-x-auto">{newKey}</code>
              <button onClick={copyKey} className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={() => setNewKey(null)} className="text-xs text-[#555] mt-3 hover:text-white transition-colors">Dismiss</button>
          </div>
        )}

        {showCreate && !newKey && (
          <div className="rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] p-6 mb-6">
            <h3 className="text-sm font-bold mb-4">Create API Key</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#666] mb-1 block">Key Name</label>
                <input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="e.g., My Repair App, Construction Dashboard..."
                  className="w-full px-4 py-3 rounded-xl bg-[#111] border border-[#222] text-sm text-white placeholder-[#444] outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="text-xs text-[#666] mb-2 block">Key Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setKeyType('public')}
                    className={`p-4 rounded-xl border text-left transition-all ${keyType === 'public' ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[#111] border-[#222] hover:border-[#333]'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className={`h-4 w-4 ${keyType === 'public' ? 'text-emerald-400' : 'text-[#555]'}`} />
                      <span className={`text-xs font-bold ${keyType === 'public' ? 'text-emerald-400' : 'text-[#888]'}`}>Public Key</span>
                    </div>
                    <p className="text-[10px] text-[#555]">For your website, apps, and customer-facing tools. Shows consumer-friendly estimates.</p>
                  </button>
                  <button onClick={() => setKeyType('admin')}
                    className={`p-4 rounded-xl border text-left transition-all ${keyType === 'admin' ? 'bg-orange-500/5 border-orange-500/30' : 'bg-[#111] border-[#222] hover:border-[#333]'} ${!(user as any)?.isEmployee ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={!(user as any)?.isEmployee}>
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className={`h-4 w-4 ${keyType === 'admin' ? 'text-orange-400' : 'text-[#555]'}`} />
                      <span className={`text-xs font-bold ${keyType === 'admin' ? 'text-orange-400' : 'text-[#888]'}`}>Admin Key</span>
                    </div>
                    <p className="text-[10px] text-[#555]">
                      {(user as any)?.isEmployee ? 'For employees. Includes supplier pricing, profit margins, internal cost breakdowns.' : 'Admin/employee access required to create employee keys.'}
                    </p>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#666] mb-1 block">Daily Rate Limit</label>
                <input type="number" value={rateLimit} onChange={e => setRateLimit(e.target.value)} min="10" max="10000"
                  className="w-full px-4 py-3 rounded-xl bg-[#111] border border-[#222] text-sm text-white outline-none focus:border-emerald-500/50" />
                <p className="text-[10px] text-[#444] mt-1">Max requests per 24 hours (10–10,000)</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowCreate(false); setKeyType('public'); }} className="px-4 py-2 rounded-xl text-sm text-[#666] hover:bg-white/5">Cancel</button>
                <button onClick={() => createMutation.mutate()} disabled={!keyName.trim() || createMutation.isPending}
                  className={`px-5 py-2 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-30 flex items-center gap-2 ${keyType === 'admin' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : keyType === 'admin' ? "Generate Admin Key" : "Generate Key"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDocs && (
          <div className="rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] p-6 mb-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2"><Code className="h-4 w-4" /> API Documentation</h3>
              <p className="text-xs text-[#888] mb-4">Base URL: <code className="text-emerald-300 bg-[#111] px-2 py-0.5 rounded">https://turbo-answer.replit.app/api/v1/construction</code></p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">POST</span>
                  <code className="text-xs text-white">/analyze</code>
                </div>
                <p className="text-xs text-[#888] mb-3">Analyze construction/repair images with AI vision</p>
                <pre className="text-[11px] text-[#aaa] bg-[#0a0a0a] rounded-lg p-3 overflow-x-auto">{`curl -X POST \\
  https://turbo-answer.replit.app/api/v1/construction/analyze \\
  -H "Authorization: Bearer ta_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image": "<base64_image_data>",
    "query": "What repairs does this roof need?",
    "type": "damage_assessment"
  }'

// Types: damage_assessment, material_identification,
//   repair_estimate, safety_inspection,
//   progress_tracking, general`}</pre>
              </div>

              <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">POST</span>
                  <code className="text-xs text-white">/advice</code>
                </div>
                <p className="text-xs text-[#888] mb-3">Get expert construction advice</p>
                <pre className="text-[11px] text-[#aaa] bg-[#0a0a0a] rounded-lg p-3 overflow-x-auto">{`curl -X POST \\
  https://turbo-answer.replit.app/api/v1/construction/advice \\
  -H "Authorization: Bearer ta_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "question": "How to fix a cracked foundation?",
    "category": "foundation",
    "context": "House built in 1985, hairline cracks"
  }'

// Categories: plumbing, electrical, roofing,
//   foundation, framing, drywall, painting,
//   flooring, hvac, landscaping, permits,
//   scheduling, budgeting, general`}</pre>
              </div>

              <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">POST</span>
                  <code className="text-xs text-white">/schedule</code>
                </div>
                <p className="text-xs text-[#888] mb-3">Generate optimized repair work schedules</p>
                <pre className="text-[11px] text-[#aaa] bg-[#0a0a0a] rounded-lg p-3 overflow-x-auto">{`curl -X POST \\
  https://turbo-answer.replit.app/api/v1/construction/schedule \\
  -H "Authorization: Bearer ta_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tasks": [
      {"name": "Fix roof leak", "priority": "high"},
      {"name": "Replace drywall", "duration": "2 days"},
      {"name": "Paint interior", "priority": "low"}
    ],
    "constraints": "Work can only be done weekdays",
    "image": "<optional_base64_site_photo>"
  }'`}</pre>
              </div>

              <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">POST</span>
                  <code className="text-xs text-white">/estimate</code>
                  <span className="text-[9px] text-yellow-400/70">NEW</span>
                </div>
                <p className="text-xs text-[#888] mb-3">Generate detailed material lists and cost estimates based on job size</p>
                <pre className="text-[11px] text-[#aaa] bg-[#0a0a0a] rounded-lg p-3 overflow-x-auto">{`curl -X POST \\
  https://turbo-answer.replit.app/api/v1/construction/estimate \\
  -H "Authorization: Bearer ta_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jobType": "kitchen_remodel",
    "squareFootage": 200,
    "rooms": 1,
    "floors": 1,
    "location": "Denver, CO",
    "materials": "mid-range",
    "description": "Full gut and remodel",
    "image": "<optional_base64_site_photo>"
  }'

// Admin keys include: supplier pricing,
//   profit margins, subcontractor rates`}</pre>
              </div>

              <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">POST</span>
                  <code className="text-xs text-white">/permits</code>
                  <span className="text-[9px] text-yellow-400/70">NEW</span>
                </div>
                <p className="text-xs text-[#888] mb-3">Location-based permit requirements and building code guidance</p>
                <pre className="text-[11px] text-[#aaa] bg-[#0a0a0a] rounded-lg p-3 overflow-x-auto">{`curl -X POST \\
  https://turbo-answer.replit.app/api/v1/construction/permits \\
  -H "Authorization: Bearer ta_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jobType": "deck_build",
    "location": "Austin, TX",
    "scope": "400 sq ft attached deck",
    "propertyType": "residential"
  }'

// Returns: required permits, local codes,
//   application process, inspections,
//   fees, and penalties for skipping`}</pre>
              </div>

              <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">GET</span>
                  <code className="text-xs text-white">/health</code>
                </div>
                <p className="text-xs text-[#888]">Check API status and view available endpoints (no auth required)</p>
              </div>
            </div>

            <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
              <h4 className="text-xs font-bold text-[#888] mb-2 uppercase tracking-wider">JavaScript Example</h4>
              <pre className="text-[11px] text-[#aaa] bg-[#0a0a0a] rounded-lg p-3 overflow-x-auto">{`const response = await fetch(
  'https://turbo-answer.replit.app/api/v1/construction/analyze',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ta_your_key_here',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: base64ImageData,
      type: 'repair_estimate',
      query: 'What needs fixing here?',
    }),
  }
);
const data = await response.json();
console.log(data.analysis.content);`}</pre>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>
        ) : keys.length === 0 && !showCreate ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 flex items-center justify-center mx-auto mb-4">
              <Key className="h-10 w-10 text-emerald-500/30" />
            </div>
            <p className="text-sm text-[#666] mb-1 font-bold">No API keys yet</p>
            <p className="text-xs text-[#444] mb-4">Create your first key to start using the construction AI API</p>
            <button onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors">
              Create Your First Key
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k: any) => {
              const spendDollars = ((k.monthlySpend || 0) / 100).toFixed(2);
              const budgetDollars = ((k.monthlyBudget || 2500) / 100).toFixed(2);
              const spendPercent = k.monthlyBudget > 0 ? Math.min(100, Math.round(((k.monthlySpend || 0) / k.monthlyBudget) * 100)) : 0;
              const isOverBudget = spendPercent >= 100;
              const tierColors: Record<string, string> = { free: 'text-gray-400', pro: 'text-blue-400', research: 'text-purple-400', enterprise: 'text-yellow-400' };
              const tierBg: Record<string, string> = { free: 'bg-gray-500/10 border-gray-500/20', pro: 'bg-blue-500/10 border-blue-500/20', research: 'bg-purple-500/10 border-purple-500/20', enterprise: 'bg-yellow-500/10 border-yellow-500/20' };

              return (
                <div key={k.id} className={`rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] p-5 hover:border-[#222] transition-colors ${!k.isActive ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.isActive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        <Key className={`h-4 w-4 ${k.isActive ? 'text-emerald-400' : 'text-red-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{k.name}</h3>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${tierBg[k.tier] || tierBg.free} ${tierColors[k.tier] || tierColors.free}`}>{k.tier}</span>
                          {k.keyType === 'admin' ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider flex items-center gap-1"><Shield className="h-2.5 w-2.5" />Admin</span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1"><Globe className="h-2.5 w-2.5" />Public</span>
                          )}
                        </div>
                        <code className="text-[10px] text-[#555] font-mono">{k.keyPrefix}•••••••••••</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {k.isActive ? (
                        isOverBudget ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">BUDGET USED</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
                        )
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">DISABLED</span>
                      )}
                      <button onClick={() => deleteMutation.mutate(k.id)}
                        className={`p-2 rounded-lg transition-colors ${k.isActive ? 'text-[#444] hover:text-yellow-400 hover:bg-yellow-500/10' : 'text-[#444] hover:text-red-400 hover:bg-red-500/10'}`}
                        title={k.isActive ? 'Disable this key' : 'Permanently remove this key'}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-3 bg-[#111] rounded-lg p-3 border border-[#1a1a1a]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-[#555] uppercase tracking-wider">Monthly Budget</span>
                      <span className={`text-xs font-bold ${isOverBudget ? 'text-orange-400' : 'text-emerald-400'}`}>${spendDollars} / ${budgetDollars}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-orange-500' : spendPercent > 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${spendPercent}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-[#444]">{spendPercent}% used</span>
                      <span className="text-[9px] text-[#444]">Resets {k.monthlyResetAt ? `${Math.max(0, 30 - Math.floor((Date.now() - new Date(k.monthlyResetAt).getTime()) / (1000 * 60 * 60 * 24)))}d` : '30d'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#111] rounded-lg p-3 border border-[#1a1a1a]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Activity className="h-3 w-3 text-[#555]" />
                        <span className="text-[10px] text-[#555] uppercase tracking-wider">Today</span>
                      </div>
                      <span className="text-sm font-bold text-white">{k.dailyUsage} <span className="text-[10px] text-[#444] font-normal">/ {k.rateLimit}</span></span>
                    </div>
                    <div className="bg-[#111] rounded-lg p-3 border border-[#1a1a1a]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <BarChart3 className="h-3 w-3 text-[#555]" />
                        <span className="text-[10px] text-[#555] uppercase tracking-wider">Total</span>
                      </div>
                      <span className="text-sm font-bold text-white">{k.totalUsage}</span>
                    </div>
                    <div className="bg-[#111] rounded-lg p-3 border border-[#1a1a1a]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="h-3 w-3 text-[#555]" />
                        <span className="text-[10px] text-[#555] uppercase tracking-wider">Last Used</span>
                      </div>
                      <span className="text-xs text-white">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] p-6 mb-6">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" /> Pricing &amp; Limits</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="text-left py-2 text-[#555] font-medium"></th>
                  <th className="text-center py-2 text-gray-400 font-bold">Free</th>
                  <th className="text-center py-2 text-blue-400 font-bold">Pro</th>
                  <th className="text-center py-2 text-purple-400 font-bold">Research</th>
                  <th className="text-center py-2 text-yellow-400 font-bold">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-[#aaa]">
                <tr className="border-b border-[#111]"><td className="py-2 text-[#555]">API Keys</td><td className="text-center">--</td><td className="text-center">3</td><td className="text-center">5</td><td className="text-center">10</td></tr>
                <tr className="border-b border-[#111]"><td className="py-2 text-[#555]">Admin Keys</td><td className="text-center">--</td><td className="text-center" colSpan={3}>Admin role required</td></tr>
                <tr className="border-b border-[#111]"><td className="py-2 text-[#555]">Daily Limit</td><td className="text-center">--</td><td className="text-center">200</td><td className="text-center">500</td><td className="text-center">2,000</td></tr>
                <tr className="border-b border-[#111]"><td className="py-2 text-[#555]">Monthly Budget</td><td className="text-center">--</td><td className="text-center">$25</td><td className="text-center">$25</td><td className="text-center">$25</td></tr>
                <tr className="border-b border-[#111]"><td className="py-2 text-[#555]">Analyze (per call)</td><td className="text-center">--</td><td className="text-center">5c</td><td className="text-center">4c</td><td className="text-center">2.5c</td></tr>
                <tr className="border-b border-[#111]"><td className="py-2 text-[#555]">Advice (per call)</td><td className="text-center">--</td><td className="text-center">2c</td><td className="text-center">1.6c</td><td className="text-center">1c</td></tr>
                <tr className="border-b border-[#111]"><td className="py-2 text-[#555]">Estimate (per call)</td><td className="text-center">--</td><td className="text-center">6c</td><td className="text-center">4.8c</td><td className="text-center">3c</td></tr>
                <tr className="border-b border-[#111]"><td className="py-2 text-[#555]">Permits (per call)</td><td className="text-center">--</td><td className="text-center">3c</td><td className="text-center">2.4c</td><td className="text-center">1.5c</td></tr>
                <tr><td className="py-2 text-[#555]">Schedule (per call)</td><td className="text-center">--</td><td className="text-center">8c</td><td className="text-center">6.4c</td><td className="text-center">4c</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] p-6 mb-6">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-orange-400" /> Admin vs Public Keys</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#111] rounded-xl p-4 border border-emerald-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-emerald-400">Public Keys</h4>
              </div>
              <ul className="text-[10px] text-[#666] space-y-1">
                <li>Consumer-friendly estimates and pricing</li>
                <li>Safe to embed in customer-facing websites</li>
                <li>Standard cost breakdowns (materials + labor totals)</li>
                <li>Perfect for contractor websites, quote forms</li>
              </ul>
            </div>
            <div className="bg-[#111] rounded-xl p-4 border border-orange-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-orange-400" />
                <h4 className="text-xs font-bold text-orange-400">Admin Keys (Employees Only)</h4>
              </div>
              <ul className="text-[10px] text-[#666] space-y-1">
                <li>Wholesale supplier pricing and sourcing</li>
                <li>Profit margin recommendations per line item</li>
                <li>Subcontractor rates and overhead allocation</li>
                <li>Permit fee schedules and expedite strategies</li>
                <li>Requires admin role to create</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2"><Code className="h-4 w-4 text-cyan-400" /> Website Integration</h3>
            <button onClick={() => setShowIntegration(!showIntegration)} className="text-xs text-[#555] hover:text-white transition-colors">
              {showIntegration ? 'Collapse' : 'Show Examples'}
            </button>
          </div>
          <p className="text-xs text-[#666] mb-4">Drop the construction AI directly into any website with a few lines of code. Your API key handles authentication automatically.</p>

          {showIntegration && (
            <div className="space-y-4">
              <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
                <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">Quick Estimate Widget (HTML + JavaScript)</h4>
                <pre className="text-[11px] text-[#aaa] bg-[#0a0a0a] rounded-lg p-3 overflow-x-auto">{`<div id="turbo-estimate"></div>
<script>
const TURBO_API_KEY = 'ta_your_public_key';
const BASE = 'https://turbo-answer.replit.app/api/v1/construction';

async function getEstimate(jobType, sqft, location) {
  const res = await fetch(BASE + '/estimate', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + TURBO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jobType, squareFootage: sqft, location
    }),
  });
  const data = await res.json();
  document.getElementById('turbo-estimate')
    .innerHTML = '<pre>' + data.estimate.content + '</pre>';
}

// Example: getEstimate('roof_replacement', 2000, 'Dallas, TX');
</script>`}</pre>
              </div>

              <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
                <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">React Component</h4>
                <pre className="text-[11px] text-[#aaa] bg-[#0a0a0a] rounded-lg p-3 overflow-x-auto">{`import { useState } from 'react';

const API_KEY = 'ta_your_public_key';
const BASE = 'https://turbo-answer.replit.app/api/v1/construction';

export function ConstructionEstimator() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const getEstimate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);
    const res = await fetch(BASE + '/estimate', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobType: form.get('jobType'),
        squareFootage: Number(form.get('sqft')),
        location: form.get('location'),
      }),
    });
    setResult(await res.json());
    setLoading(false);
  };

  return (
    <form onSubmit={getEstimate}>
      <input name="jobType" placeholder="Job type" />
      <input name="sqft" type="number" placeholder="Sq ft" />
      <input name="location" placeholder="City, State" />
      <button disabled={loading}>
        {loading ? 'Calculating...' : 'Get Estimate'}
      </button>
      {result && <pre>{result.estimate.content}</pre>}
    </form>
  );
}`}</pre>
              </div>

              <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
                <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">Permit Checker Widget</h4>
                <pre className="text-[11px] text-[#aaa] bg-[#0a0a0a] rounded-lg p-3 overflow-x-auto">{`async function checkPermits(jobType, location) {
  const res = await fetch(
    'https://turbo-answer.replit.app/api/v1/construction/permits',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TURBO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobType,
        location,
        propertyType: 'residential',
      }),
    }
  );
  return (await res.json()).permits.content;
}

// checkPermits('deck_build', 'Austin, TX')
//   .then(advice => console.log(advice));`}</pre>
              </div>

              <div className="bg-[#0a0a0a] rounded-xl p-4 border border-yellow-500/10">
                <h4 className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider mb-2">Security Tips</h4>
                <ul className="text-[10px] text-[#666] space-y-1.5">
                  <li>Use <strong className="text-[#888]">Public keys</strong> for customer-facing websites — they only show consumer-friendly data</li>
                  <li>Keep <strong className="text-orange-400">Admin keys</strong> on your backend only — never expose in browser JavaScript</li>
                  <li>Set conservative daily rate limits to prevent abuse on public widgets</li>
                  <li>Monitor your monthly budget usage on this page to avoid overages</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] p-6">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" /> What Can You Build?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
              <div className="text-2xl mb-2">📸</div>
              <h4 className="text-xs font-bold text-white mb-1">Photo-Based Analysis</h4>
              <p className="text-[10px] text-[#555]">Upload photos of damage and get instant repair assessments, materials lists, and cost estimates</p>
            </div>
            <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
              <div className="text-2xl mb-2">💰</div>
              <h4 className="text-xs font-bold text-white mb-1">Job Estimates</h4>
              <p className="text-[10px] text-[#555]">Calculate materials, labor costs, and total project estimates based on square footage and job scope</p>
            </div>
            <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
              <div className="text-2xl mb-2">📋</div>
              <h4 className="text-xs font-bold text-white mb-1">Smart Scheduling</h4>
              <p className="text-[10px] text-[#555]">Generate optimized work schedules with dependency tracking, crew assignments, and critical path analysis</p>
            </div>
            <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
              <div className="text-2xl mb-2">🏛️</div>
              <h4 className="text-xs font-bold text-white mb-1">Permit Guidance</h4>
              <p className="text-[10px] text-[#555]">Location-specific permit requirements, building codes, application process, and inspection checklists</p>
            </div>
            <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
              <div className="text-2xl mb-2">🔧</div>
              <h4 className="text-xs font-bold text-white mb-1">Expert Advice</h4>
              <p className="text-[10px] text-[#555]">Professional construction advice across 14 categories from plumbing to permits</p>
            </div>
            <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
              <div className="text-2xl mb-2">🌐</div>
              <h4 className="text-xs font-bold text-white mb-1">Website Widget</h4>
              <p className="text-[10px] text-[#555]">Embed instant estimates and permit checkers directly on your contractor website</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
