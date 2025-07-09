import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Bot, Star } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Welcome to Turbo Answer Pro! You now have access to Google Gemini 2.5 Pro.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        disabled={!stripe || !elements}
      >
        Subscribe to Turbo Answer Pro
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create subscription as soon as the page loads
    apiRequest("POST", "/api/get-or-create-subscription")
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
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
          {/* Free Plan */}
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

          {/* Pro Plan */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/30 p-6 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Star className="w-3 h-3 mr-1" />
                Recommended
              </Badge>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Pro Plan</h3>
              <div className="text-3xl font-bold text-white mb-4">$3.99<span className="text-base font-normal">/month</span></div>
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
          </Card>
        </div>

        {/* Payment Form */}
        {clientSecret && (
          <Card className="bg-zinc-900 border-zinc-800 p-8 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-white mb-6 text-center">Subscribe to Pro Plan</h3>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SubscribeForm />
            </Elements>
          </Card>
        )}
      </div>
    </div>
  );
}