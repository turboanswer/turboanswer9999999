import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Brain, Zap, CheckCircle, Star, FlaskConical, XCircle, AlertTriangle } from "lucide-react";
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

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({
    queryKey: ["/api/subscription-status"],
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

  useEffect(() => {
    localStorage.setItem('selectedAIModel', selectedModel);
  }, [selectedModel]);

  const hasPaidSubscription = subscriptionData?.tier === 'pro' || subscriptionData?.tier === 'research';
  const tierLabel = subscriptionData?.tier === 'research' ? 'Research ($15/mo)' : 'Pro ($6.99/mo)';

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
      </main>
    </div>
  );
}
