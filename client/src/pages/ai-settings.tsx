import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Brain, Zap, CheckCircle, Star, FlaskConical, XCircle, AlertTriangle, Gift, Building2, Trash2, Copy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";

const AI_MODELS = {
  "gemini-flash": {
    name: "Gemini 2.5 Flash",
    description: "Ultra-fast responses for everyday questions. Lightning speed with great quality.",
    tier: "Free",
    icon: Zap,
    color: "from-green-500 to-emerald-600",
    borderColor: "border-green-600 hover:border-green-500",
    badgeClass: "bg-green-100 text-green-800",
    checkColor: "text-green-400",
  },
  "gemini-pro": {
    name: "Gemini 2.5 Flash Pro",
    description: "Premium quality responses with detailed, thorough answers for complex topics.",
    tier: "Pro - $6.99/mo",
    icon: Star,
    color: "from-purple-500 to-pink-600",
    borderColor: "border-purple-600 hover:border-purple-500",
    badgeClass: "bg-purple-100 text-purple-800",
    checkColor: "text-purple-400",
  },
  "claude-research": {
    name: "Gemini 2.5 Pro Research",
    description: "Most powerful model for deep research, comprehensive analysis, and expert-level detail.",
    tier: "Research - $15/mo",
    icon: FlaskConical,
    color: "from-blue-500 to-cyan-600",
    borderColor: "border-blue-600 hover:border-blue-500",
    badgeClass: "bg-blue-100 text-blue-800",
    checkColor: "text-blue-400",
  },
};

export default function AISettings() {
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('selectedAIModel') || 'gemini-flash';
  });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [, setLocation] = useLocation();

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({
    queryKey: ["/api/subscription-status"],
  });

  const { data: enterpriseData } = useQuery<{ hasCode: boolean; code?: string; maxUses?: number; currentUses?: number; redemptions?: Array<{ email: string; date: string }> }>({
    queryKey: ["/api/enterprise-code"],
  });

  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [enterpriseCodeInput, setEnterpriseCodeInput] = useState('');

  const promoMutation = useMutation({
    mutationFn: async ({ promoCode }: { promoCode: string }) => {
      const res = await apiRequest('POST', '/api/apply-promo', {
        promoCode: promoCode.toUpperCase()
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise-code"] });
      setPromoCode('');
      setShowPromoInput(false);
      let msg = data.message;
      if (data.enterpriseCode) {
        msg += ` Your enterprise code is: ${data.enterpriseCode}`;
      }
      toast({ title: "Promo Code Applied!", description: msg });
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Code",
        description: error.message || "This promo code is not valid",
        variant: "destructive",
      });
    },
  });

  const enterpriseRedeemMutation = useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const res = await apiRequest('POST', '/api/redeem-enterprise-code', {
        code: code.toUpperCase()
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
      setEnterpriseCodeInput('');
      toast({ title: "Enterprise Code Redeemed!", description: data.message });
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Code",
        description: error.message || "This enterprise code is not valid",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cancel-subscription");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
      setShowCancelConfirm(false);
      setSelectedModel('gemini-flash');
      localStorage.setItem('selectedAIModel', 'gemini-flash');
      toast({
        title: data.refunded ? "Subscription Cancelled & Refunded" : "Subscription Cancelled",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/delete-account");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account Deleted", description: "Your account and all data have been permanently deleted." });
      setTimeout(() => { setLocation('/'); window.location.reload(); }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    localStorage.setItem('selectedAIModel', selectedModel);
  }, [selectedModel]);

  const hasPaidSubscription = subscriptionData?.tier === 'pro' || subscriptionData?.tier === 'research' || subscriptionData?.tier === 'enterprise';
  const tierLabel = subscriptionData?.tier === 'enterprise' ? 'Enterprise ($50/mo)' : subscriptionData?.tier === 'research' ? 'Research ($15/mo)' : 'Pro ($6.99/mo)';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`border-b ${isDark ? 'border-gray-800 bg-black/50' : 'border-gray-200 bg-white/80'} backdrop-blur`}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-400" />
            <h1 className="text-xl font-semibold">AI Model</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Choose Your AI Model</h2>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Select the model that fits your needs</p>
        </div>

        <RadioGroup value={selectedModel} onValueChange={setSelectedModel} className="space-y-4">
          {Object.entries(AI_MODELS).map(([key, model]) => {
            const Icon = model.icon;
            const isSelected = selectedModel === key;
            return (
              <Card key={key} className={`${isDark ? 'bg-gray-900' : 'bg-white'} ${isSelected ? model.borderColor.split(' ')[0].replace('border', 'border-2 border') : isDark ? 'border-gray-700' : 'border-gray-200'} ${model.borderColor.split(' ').slice(1).join(' ')} transition-all cursor-pointer`}>
                <CardContent className="p-5">
                  <div className="flex items-start space-x-4">
                    <RadioGroupItem value={key} id={key} className="mt-1" />
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={key} className="cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{model.name}</span>
                          <Badge variant="secondary" className={model.badgeClass}>
                            {model.tier}
                          </Badge>
                        </div>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {model.description}
                        </p>
                      </Label>
                    </div>
                    {isSelected && (
                      <CheckCircle className={`h-5 w-5 ${model.checkColor} mt-1 flex-shrink-0`} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </RadioGroup>

        {/* Enterprise Code Entry Box */}
        <div className="mt-10">
          <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} pt-8`}>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-400" />
              Enterprise Code
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Have a 6-digit enterprise code from your organization? Enter it below to unlock Research-level access.
            </p>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={enterpriseCodeInput}
                onChange={(e) => setEnterpriseCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => { if (e.key === 'Enter' && enterpriseCodeInput.length === 6) enterpriseRedeemMutation.mutate({ code: enterpriseCodeInput }); }}
                maxLength={6}
                className={`flex-1 px-4 py-3 rounded-lg border text-lg font-mono tracking-widest text-center ${isDark ? 'bg-gray-900 border-amber-800/50 text-white placeholder-gray-500' : 'bg-white border-amber-300 text-gray-900 placeholder-gray-400'}`}
              />
              <Button
                onClick={() => enterpriseRedeemMutation.mutate({ code: enterpriseCodeInput })}
                disabled={enterpriseCodeInput.length !== 6 || enterpriseRedeemMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6"
              >
                {enterpriseRedeemMutation.isPending ? "Redeeming..." : "Redeem"}
              </Button>
            </div>
          </div>
        </div>

        {/* Show enterprise code for enterprise subscribers */}
        {enterpriseData?.hasCode && (
          <div className="mt-8">
            <Card className={`${isDark ? 'bg-amber-950/30 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-amber-400" />
                  <h4 className="font-semibold text-amber-400">Your Enterprise Code</h4>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-3xl font-mono tracking-[0.3em] font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {enterpriseData.code}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(enterpriseData.code || '');
                      toast({ title: "Copied!", description: "Enterprise code copied to clipboard." });
                    }}
                    className="text-amber-400 hover:text-amber-300"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-amber-400" />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {enterpriseData.currentUses || 0} / {enterpriseData.maxUses || 5} codes used
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Share this code with up to 5 team members to give them Research-level access.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Promo Code Section */}
        <div className="mt-10">
          <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} pt-8`}>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-400" />
              Promo Code
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Have a promo code? Enter it below to unlock premium features.
            </p>
            {!showPromoInput ? (
              <Button
                variant="outline"
                onClick={() => setShowPromoInput(true)}
                className={isDark ? 'border-purple-800 text-purple-400 hover:bg-purple-950 hover:text-purple-300' : 'border-purple-300 text-purple-600 hover:bg-purple-50'}
              >
                <Gift className="h-4 w-4 mr-2" />
                Enter Promo Code
              </Button>
            ) : (
              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && promoCode.trim()) promoMutation.mutate({ promoCode }); }}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm ${isDark ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
                <Button
                  onClick={() => promoMutation.mutate({ promoCode })}
                  disabled={!promoCode.trim() || promoMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {promoMutation.isPending ? "Applying..." : "Apply"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setShowPromoInput(false); setPromoCode(''); }}
                  className={isDark ? 'text-gray-400 hover:text-gray-200' : ''}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Subscription Management */}
        {hasPaidSubscription && (
          <div className="mt-10">
            <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} pt-8`}>
              <h3 className="text-lg font-semibold mb-2">Subscription Management</h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                You are currently on the <span className="font-medium text-purple-400">{tierLabel}</span> plan.
              </p>

              {!showCancelConfirm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelConfirm(true)}
                  className={`${isDark ? 'border-red-800 text-red-400 hover:bg-red-950 hover:text-red-300' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </Button>
              ) : (
                <Card className={`${isDark ? 'bg-red-950/30 border-red-800' : 'bg-red-50 border-red-200'}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-400 mb-1">Cancel your subscription?</h4>
                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          If you cancel within 3 days of subscribing, you will receive a full automatic refund. After 3 days, your subscription will be cancelled but no refund will be issued.
                        </p>
                        <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          You will lose access to premium AI models immediately after cancellation.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        onClick={() => cancelMutation.mutate()}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel Subscription"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCancelConfirm(false)}
                        className={isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : ''}
                      >
                        Keep Subscription
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Delete Account */}
        <div className="mt-10">
          <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} pt-8`}>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className={`${isDark ? 'border-red-800 text-red-400 hover:bg-red-950 hover:text-red-300' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </Button>
            ) : (
              <Card className={`${isDark ? 'bg-red-950/30 border-red-800' : 'bg-red-50 border-red-200'}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-red-400 mb-1">Are you sure you want to delete your account?</h4>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        This will permanently delete all your conversations, messages, and account data. If you have an active subscription, it will be cancelled automatically through PayPal.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Yes, Delete Everything"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      className={isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : ''}
                    >
                      Keep My Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
