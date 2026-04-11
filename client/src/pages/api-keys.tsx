import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, Key, Plus, Trash2, Copy, Check, Loader2, Eye, EyeOff, Activity, Shield, Code, Zap, Clock, BarChart3 } from "lucide-react";

export default function ApiKeysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [rateLimit, setRateLimit] = useState("100");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewingUsage, setViewingUsage] = useState<number | null>(null);
  const [showDocs, setShowDocs] = useState(false);

  const { data: keys = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/keys'],
  });

  const { data: usageData } = useQuery({
    queryKey: ['/api/keys', viewingUsage, 'usage'],
    enabled: !!viewingUsage,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/keys', { name: keyName, rateLimit: parseInt(rateLimit) });
      return res.json();
    },
    onSuccess: (data: any) => {
      setNewKey(data.key);
      setKeyName("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['/api/keys'] });
      toast({ title: "API key created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/keys'] });
      toast({ title: "API key deactivated" });
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
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20 p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">Your New API Key</span>
            </div>
            <p className="text-xs text-[#888] mb-3">Copy this key now. It will not be shown again.</p>
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
                <label className="text-xs text-[#666] mb-1 block">Daily Rate Limit</label>
                <input type="number" value={rateLimit} onChange={e => setRateLimit(e.target.value)} min="10" max="10000"
                  className="w-full px-4 py-3 rounded-xl bg-[#111] border border-[#222] text-sm text-white outline-none focus:border-emerald-500/50" />
                <p className="text-[10px] text-[#444] mt-1">Max requests per 24 hours (10–10,000)</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm text-[#666] hover:bg-white/5">Cancel</button>
                <button onClick={() => createMutation.mutate()} disabled={!keyName.trim() || createMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-30 flex items-center gap-2">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Key"}
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
            {keys.map((k: any) => (
              <div key={k.id} className="rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] p-5 hover:border-[#222] transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.isActive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      <Key className={`h-4 w-4 ${k.isActive ? 'text-emerald-400' : 'text-red-400'}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{k.name}</h3>
                      <code className="text-[10px] text-[#555] font-mono">{k.keyPrefix}•••••••••••</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {k.isActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">DISABLED</span>
                    )}
                    {k.isActive && (
                      <button onClick={() => deleteMutation.mutate(k.id)} className="p-2 rounded-lg text-[#444] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
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
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] p-6">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" /> What Can You Build?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
              <div className="text-2xl mb-2">📸</div>
              <h4 className="text-xs font-bold text-white mb-1">Photo-Based Estimates</h4>
              <p className="text-[10px] text-[#555]">Upload photos of damage and get instant repair assessments, materials lists, and cost estimates</p>
            </div>
            <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
              <div className="text-2xl mb-2">📋</div>
              <h4 className="text-xs font-bold text-white mb-1">Smart Scheduling</h4>
              <p className="text-[10px] text-[#555]">Generate optimized work schedules with dependency tracking, crew assignments, and critical path analysis</p>
            </div>
            <div className="bg-[#111] rounded-xl p-4 border border-[#1a1a1a]">
              <div className="text-2xl mb-2">🔧</div>
              <h4 className="text-xs font-bold text-white mb-1">Expert Advice</h4>
              <p className="text-[10px] text-[#555]">Get professional construction advice across 14 categories from plumbing to permits</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
