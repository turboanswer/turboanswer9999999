import { useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  CheckCircle, Zap, Bot, Star, Loader2, Film, Sparkles, Users, ArrowLeft
} from "lucide-react";

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    badge: null,
    gradient: 'from-zinc-800 to-zinc-900',
    border: 'border-zinc-700',
    icon: <Bot className="h-5 w-5 text-zinc-400" />,
    features: [
      'TurboAnswer AI',
      'Basic AI responses',
      'Voice commands',
      'Unlimited conversations',
    ],
    cta: null,
    note: null,
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$6.99',
    period: '/month',
    badge: null,
    gradient: 'from-purple-900/60 to-pink-900/60',
    border: 'border-purple-500/40',
    icon: <Zap className="h-5 w-5 text-purple-400" />,
    features: [
      'Advanced Pro AI model',
      'Advanced AI reasoning',
      'Superior code analysis',
      'Image Studio (Google AI)',
      'Priority phone support — call (866) 567-7269',
      'Everything in Free',
    ],
    cta: 'Subscribe — $6.99/mo',
    note: '7-day free trial · Cancel anytime',
    highlight: false,
  },
  {
    id: 'research',
    name: 'Research',
    price: '$30',
    period: '/month',
    badge: 'MOST POWERFUL',
    gradient: 'from-indigo-900/70 to-violet-900/70',
    border: 'border-indigo-400/50',
    icon: <Sparkles className="h-5 w-5 text-indigo-300" />,
    features: [
      'Matrix AI Research engine',
      'AI Video Studio — powered by Google Veo',
      'Deep expert-level responses',
      'Image Studio (Google AI)',
      'Max-depth analysis & research',
      'Everything in Pro',
    ],
    videoFeature: true,
    cta: 'Subscribe — $30/mo',
    note: '7-day free trial · Cancel anytime',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$100',
    period: '/month',
    badge: 'TEAMS',
    gradient: 'from-cyan-900/60 to-blue-900/60',
    border: 'border-cyan-500/40',
    icon: <Users className="h-5 w-5 text-cyan-400" />,
    features: [
      'Everything in Research',
      'Up to 5 team members included',
      'Shareable 6-digit team code',
      '33% savings vs 5 individual Research plans',
      'Dedicated team support',
    ],
    cta: 'Subscribe — $100/mo',
    note: '7-day free trial · Cancel anytime',
    highlight: false,
  },
];

export default function Subscribe() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async (plan: 'pro' | 'research' | 'enterprise') => {
    setLoadingPlan(plan);
    try {
      const res = await apiRequest("POST", "/api/checkout", { plan });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      toast({
        title: "Checkout Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Back */}
        <Link href="/chat">
          <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-8 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Chat
          </button>
        </Link>

        {/* Header */}
        <div className="text-center mb-14">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30">
            <Sparkles className="text-white h-8 w-8" />
          </div>
          <h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-zinc-400 text-base max-w-xl mx-auto">
            All paid plans include a 7-day free trial — no charge until your trial ends.
          </p>
        </div>

        {/* Video Studio spotlight banner */}
        <div className="mb-10 rounded-2xl bg-gradient-to-r from-indigo-900/50 via-violet-900/50 to-cyan-900/50 border border-indigo-500/30 p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
            <Film className="h-6 w-6 text-white" />
          </div>
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-0.5">
              <span className="font-bold text-white text-sm">AI Video Studio — exclusive to Research & Enterprise</span>
              <Badge className="bg-indigo-500/25 text-indigo-300 border-indigo-500/30 text-[10px] font-bold px-1.5">NEW</Badge>
            </div>
            <p className="text-zinc-400 text-xs">Generate AI videos from text prompts using Google Veo. Up to 8 seconds, multiple styles, landscape & portrait formats.</p>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border bg-gradient-to-b ${plan.gradient} ${plan.border} p-6 flex flex-col ${plan.highlight ? 'ring-2 ring-indigo-500/60 shadow-2xl shadow-indigo-500/20 scale-[1.02]' : ''}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={`text-[10px] font-black px-2.5 py-0.5 ${plan.highlight ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white' : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'}`}>
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4 mt-1">
                {plan.icon}
                <span className="font-bold text-white text-sm">{plan.name}</span>
              </div>

              <div className="mb-5">
                <span className="text-3xl font-black text-white">{plan.price}</span>
                <span className="text-zinc-400 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {feat.includes('Video Studio') ? (
                      <Film className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-xs leading-snug ${feat.includes('Video Studio') ? 'text-violet-300 font-semibold' : 'text-zinc-300'}`}>
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.cta ? (
                <div className="space-y-2">
                  <Button
                    onClick={() => handleSubscribe(plan.id as 'pro' | 'research' | 'enterprise')}
                    disabled={loadingPlan !== null}
                    className={`w-full h-10 rounded-xl font-bold text-sm ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 hover:from-indigo-500 hover:via-violet-500 hover:to-cyan-500 shadow-lg shadow-indigo-500/25'
                        : plan.id === 'pro'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                    }`}
                  >
                    {loadingPlan === plan.id ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Processing...</>
                    ) : plan.cta}
                  </Button>
                  {plan.note && <p className="text-center text-[10px] text-zinc-500">{plan.note}</p>}
                </div>
              ) : (
                <div className="h-10 flex items-center justify-center">
                  <span className="text-xs text-zinc-500 font-medium">Your current plan</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-8">
          Need a custom team plan for more than 5 users?{' '}
          <a href="mailto:support@turboanswer.it.com" className="text-zinc-400 underline hover:text-white transition-colors">Contact support</a>
        </p>
      </div>
    </div>
  );
}
