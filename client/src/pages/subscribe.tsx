import { useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Bot, Star, Loader2 } from "lucide-react";

export default function Subscribe() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (plan: 'pro' | 'research') => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20">
            <Bot className="text-white text-2xl" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Upgrade to Turbo Answer Pro
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Unlock the full power of Google Gemini 2.5 Pro for advanced AI assistance across all domains
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Free Plan</h3>
              <div className="text-3xl font-bold text-zinc-400 mb-4">$0<span className="text-base font-normal">/month</span></div>
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">Current Plan</Badge>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-zinc-300">Google Gemini 2.5 Flash</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-zinc-300">Basic AI responses</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-zinc-300">Voice commands</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-zinc-300">Unlimited conversations</span>
              </li>
            </ul>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/30 p-6 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Star className="w-3 h-3 mr-1" />
                Recommended
              </Badge>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Pro Plan</h3>
              <div className="text-3xl font-bold text-white mb-4">$6.99<span className="text-base font-normal">/month</span></div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">Google Gemini 2.5 Pro</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-zinc-200">Advanced AI reasoning</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-zinc-200">Superior code analysis</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-zinc-200">Enhanced problem solving</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-zinc-200">Priority support</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-zinc-200">Everything in Free</span>
              </li>
            </ul>
            <Button
              onClick={() => handleSubscribe('pro')}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Subscribe with PayPal - $6.99/mo"}
            </Button>
            <p className="text-center text-xs mt-3 text-zinc-500">Cancel anytime. Secure payment via PayPal.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
