import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star } from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Basic AI assistance with limited models",
    icon: Zap,
    color: "from-gray-500 to-gray-600",
    features: [
      "Google Gemini 2.5 Flash",
      "OpenAI GPT-4o Mini", 
      "Voice commands",
      "Basic chat history",
      "Standard support"
    ],
    limitations: [
      "Limited daily usage",
      "Basic AI models only"
    ]
  },
  pro: {
    name: "Pro",
    price: "$3.99",
    period: "/month",
    description: "Advanced AI models and premium features",
    icon: Crown,
    color: "from-purple-500 to-pink-500",
    popular: true,
    features: [
      "Google Gemini 2.5 Pro",
      "OpenAI GPT-4o",
      "Anthropic Claude 4.0 Sonnet",
      "Unlimited voice commands", 
      "Extended chat history",
      "Priority support",
      "Model selection"
    ]
  },
  premium: {
    name: "Premium",
    price: "$9.99", 
    period: "/month",
    description: "Ultimate AI experience with cutting-edge models",
    icon: Star,
    color: "from-yellow-500 to-orange-500",
    features: [
      "OpenAI GPT-4 Turbo",
      "Anthropic Claude 3 Opus",
      "Google Gemini Ultra",
      "Unlimited everything",
      "Advanced analytics",
      "24/7 priority support",
      "Early access to new models",
      "Custom AI training"
    ]
  }
};

const CheckoutForm = ({ planId }: { planId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
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
        title: "Subscription Active!",
        description: `Welcome to Turbo Answer ${planId}!`,
      });
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isLoading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        {isLoading ? "Processing..." : `Subscribe to ${planId}`}
      </Button>
    </form>
  );
};

export default function EnhancedSubscribe() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();

  const handlePlanSelect = async (planId: string) => {
    if (planId === 'free') {
      toast({
        title: "Already on Free Plan",
        description: "You're currently using the free plan with basic AI models.",
      });
      return;
    }

    setSelectedPlan(planId);
    
    try {
      const response = await apiRequest("POST", "/api/create-subscription", { 
        planId,
        priceId: planId === 'pro' ? 'price_pro_monthly' : 'price_premium_monthly'
      });
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (selectedPlan && clientSecret) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Complete Your Subscription</h1>
            <p className="text-gray-400">
              Upgrading to {SUBSCRIPTION_PLANS[selectedPlan as keyof typeof SUBSCRIPTION_PLANS].name} Plan
            </p>
          </div>
          
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm planId={selectedPlan} />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="text-center py-12 px-6">
        <h1 className="text-4xl font-bold mb-4">
          Choose Your AI Experience
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Unlock the power of multiple language models with our flexible subscription plans
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(SUBSCRIPTION_PLANS).map(([planId, plan]) => {
            const IconComponent = plan.icon;
            
            return (
              <Card 
                key={planId}
                className={`relative bg-gray-900 border-gray-700 hover:border-gray-600 transition-all duration-300 ${
                  plan.popular ? 'ring-2 ring-purple-500 scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className={`mx-auto w-16 h-16 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center mb-4`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-400">{plan.description}</CardDescription>
                  
                  <div className="text-center">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-400">{plan.period}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {plan.limitations && (
                    <div className="pt-4 border-t border-gray-700">
                      <p className="text-xs text-gray-500 mb-2">Limitations:</p>
                      {plan.limitations.map((limitation, index) => (
                        <p key={index} className="text-xs text-gray-500">• {limitation}</p>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  <Button 
                    onClick={() => handlePlanSelect(planId)}
                    className={`w-full ${
                      planId === 'free' 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : `bg-gradient-to-r ${plan.color} hover:opacity-90`
                    }`}
                  >
                    {planId === 'free' ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center mb-8">AI Models Available</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4 text-gray-300">Free Plan</h3>
            <div className="space-y-2">
              <div className="p-3 bg-gray-800 rounded-lg">Google Gemini 2.5 Flash</div>
              <div className="p-3 bg-gray-800 rounded-lg">OpenAI GPT-4o Mini</div>
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4 text-purple-300">Pro Plan</h3>
            <div className="space-y-2">
              <div className="p-3 bg-purple-900/50 rounded-lg">Google Gemini 2.5 Pro</div>
              <div className="p-3 bg-purple-900/50 rounded-lg">OpenAI GPT-4o</div>
              <div className="p-3 bg-purple-900/50 rounded-lg">Anthropic Claude 4.0 Sonnet</div>
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4 text-yellow-300">Premium Plan</h3>
            <div className="space-y-2">
              <div className="p-3 bg-yellow-900/50 rounded-lg">OpenAI GPT-4 Turbo</div>
              <div className="p-3 bg-yellow-900/50 rounded-lg">Anthropic Claude 3 Opus</div>
              <div className="p-3 bg-yellow-900/50 rounded-lg">Google Gemini Ultra</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}