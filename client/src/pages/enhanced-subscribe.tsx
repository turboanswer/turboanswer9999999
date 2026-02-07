import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star, Brain, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Basic AI assistance powered by Gemini Flash",
    icon: Zap,
    color: "from-gray-500 to-gray-600",
    features: [
      "Google Gemini 2.5 Flash",
      "Voice commands",
      "Unlimited conversations",
      "Standard support"
    ],
    limitations: [
      "Basic AI model only"
    ]
  },
  pro: {
    name: "Pro",
    price: "$6.99",
    period: "/month",
    description: "Advanced AI with Gemini Pro power",
    icon: Crown,
    color: "from-purple-500 to-pink-500",
    popular: true,
    apiPlan: 'pro' as const,
    features: [
      "Google Gemini Flash Pro",
      "Advanced AI reasoning",
      "Superior code analysis",
      "Enhanced problem solving",
      "Priority support",
      "Everything in Free"
    ]
  },
  research: {
    name: "Research",
    price: "$15",
    period: "/month",
    description: "Ultimate AI with deep research capabilities",
    icon: Brain,
    color: "from-blue-500 to-cyan-500",
    apiPlan: 'research' as const,
    features: [
      "Google Gemini 2.5 Pro",
      "Deep research & analysis",
      "Comprehensive reasoning",
      "All Pro features included",
      "Maximum AI intelligence",
      "Priority support"
    ]
  }
};

export default function EnhancedSubscribe() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePlanSelect = async (planId: string) => {
    if (planId === 'free') {
      toast({
        title: "Already on Free Plan",
        description: "You're currently using the free plan with basic AI models.",
      });
      return;
    }

    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
    if (!('apiPlan' in plan)) return;

    setIsLoading(planId);
    try {
      const response = await apiRequest("POST", "/api/checkout", { plan: plan.apiPlan });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="text-center py-12 px-6">
        <h1 className="text-4xl font-bold mb-4">
          Choose Your AI Experience
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Unlock the power of advanced AI models with our flexible subscription plans
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(SUBSCRIPTION_PLANS).map(([planId, plan]) => {
            const IconComponent = plan.icon;
            const isPopular = 'popular' in plan && plan.popular;
            
            return (
              <Card 
                key={planId}
                className={`relative bg-gray-900 border-gray-700 hover:border-gray-600 transition-all duration-300 ${
                  isPopular ? 'ring-2 ring-purple-500 scale-105' : ''
                }`}
              >
                {isPopular && (
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
                  
                  {'limitations' in plan && plan.limitations && (
                    <div className="pt-4 border-t border-gray-700">
                      <p className="text-xs text-gray-500 mb-2">Limitations:</p>
                      {plan.limitations.map((limitation: string, index: number) => (
                        <p key={index} className="text-xs text-gray-500">- {limitation}</p>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex-col gap-2">
                  <Button 
                    onClick={() => handlePlanSelect(planId)}
                    disabled={isLoading === planId}
                    className={`w-full ${
                      planId === 'free' 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : `bg-gradient-to-r ${plan.color} hover:opacity-90`
                    }`}
                  >
                    {isLoading === planId ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : planId === 'free' ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </Button>
                  {planId !== 'free' && (
                    <p className="text-xs text-gray-500 text-center">Secure payment via PayPal</p>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
