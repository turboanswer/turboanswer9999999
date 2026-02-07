import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Zap, MessageSquare, Headphones, Loader2 } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  apiPlan?: 'pro' | 'research';
}

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with basic AI conversations',
    features: [
      'Google Gemini 2.5 Flash',
      'Voice commands',
      'Unlimited conversations',
      'Community support',
      'Basic conversation history'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$6.99',
    period: 'per month',
    description: 'Advanced AI with Gemini Pro power',
    features: [
      'Google Gemini Flash Pro',
      'Advanced AI reasoning',
      'Superior code analysis',
      'Enhanced problem solving',
      'Priority support',
      'Everything in Free'
    ],
    popular: true,
    apiPlan: 'pro'
  },
  {
    id: 'research',
    name: 'Research',
    price: '$15',
    period: 'per month',
    description: 'Ultimate AI with deep research capabilities',
    features: [
      'Google Gemini 2.5 Pro',
      'Deep research & analysis',
      'Comprehensive reasoning',
      'All Pro features included',
      'Maximum AI intelligence',
      'Priority support'
    ],
    apiPlan: 'research'
  }
];

export default function Pricing() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const applyPromoMutation = useMutation({
    mutationFn: async ({ promoCode }: { promoCode: string }) => {
      const demoUserResponse = await apiRequest('POST', '/api/create-demo-user', {});
      const demoUserData = await demoUserResponse.json();
      const demoUser = demoUserData.user;
      
      const promoResponse = await apiRequest('POST', '/api/apply-promo', {
        userId: demoUser.id,
        promoCode: promoCode.toUpperCase()
      });
      
      return await promoResponse.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setPromoCode('');
      setShowPromoCode(false);
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Code",
        description: error.message || "This promo code is not valid",
        variant: "destructive",
      });
    }
  });

  const handleCheckout = async (plan: PricingPlan) => {
    if (!plan.apiPlan) return;
    setCheckoutLoading(plan.id);
    try {
      const res = await apiRequest("POST", "/api/checkout", { plan: plan.apiPlan });
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
      setCheckoutLoading(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: 'white',
      padding: '40px 20px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#2563eb',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)'
        }}>
          <Crown size={32} color="white" />
        </div>
        
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #60a5fa, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Choose Your Plan
        </h1>
        
        <p style={{
          fontSize: '20px',
          color: '#9ca3af',
          maxWidth: '600px',
          margin: '0 auto 24px'
        }}>
          Unlock the full power of AI with our premium plans. Start free or upgrade for unlimited access.
        </p>

        <button
          onClick={() => setShowPromoCode(!showPromoCode)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#60a5fa',
            border: '1px solid #60a5fa',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          Have a promo code?
        </button>

        {showPromoCode && (
          <div style={{
            maxWidth: '400px',
            margin: '0 auto 32px',
            padding: '20px',
            backgroundColor: '#111111',
            borderRadius: '8px',
            border: '1px solid #333333'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => applyPromoMutation.mutate({ promoCode })}
                disabled={!promoCode.trim() || applyPromoMutation.isPending}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: applyPromoMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: (!promoCode.trim() || applyPromoMutation.isPending) ? 0.5 : 1
                }}
              >
                {applyPromoMutation.isPending ? 'Applying...' : 'Apply Code'}
              </button>
              <button
                onClick={() => { setShowPromoCode(false); setPromoCode(''); }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  border: '1px solid #333333',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              backgroundColor: plan.popular ? '#1e1b4b' : '#111111',
              border: plan.popular ? '2px solid #3b82f6' : '1px solid #333333',
              borderRadius: '16px',
              padding: '32px',
              position: 'relative',
              transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.2s'
            }}
          >
            {plan.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '6px 20px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Most Popular
              </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {plan.name}
              </h3>
              <div style={{ marginBottom: '8px' }}>
                <span style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: plan.popular ? '#60a5fa' : '#ffffff'
                }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: '16px', color: '#9ca3af', marginLeft: '8px' }}>
                  {plan.period}
                </span>
              </div>
              <p style={{ fontSize: '16px', color: '#9ca3af' }}>
                {plan.description}
              </p>
            </div>

            <div style={{ marginBottom: '32px' }}>
              {plan.features.map((feature, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <Check size={20} style={{ color: '#10b981', marginRight: '12px', flexShrink: 0 }} />
                  <span style={{ fontSize: '16px' }}>{feature}</span>
                </div>
              ))}
            </div>

            {plan.id === 'free' ? (
              <button
                onClick={() => { window.location.href = '/'; }}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Start Free
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleCheckout(plan)}
                  disabled={checkoutLoading === plan.id}
                  style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: plan.popular ? '#3b82f6' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: checkoutLoading === plan.id ? 'not-allowed' : 'pointer',
                    opacity: checkoutLoading === plan.id ? 0.7 : 1
                  }}
                >
                  {checkoutLoading === plan.id ? 'Loading...' : `Subscribe with PayPal - ${plan.price}/mo`}
                </button>
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                  Cancel anytime. Secure payment via PayPal.
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '80px auto 0',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '48px' }}>
          Why Choose Turbo AI?
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '32px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <Zap size={48} style={{ color: '#3b82f6', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Lightning Fast
            </h3>
            <p style={{ color: '#9ca3af' }}>
              Get instant responses from the most advanced AI models
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <MessageSquare size={48} style={{ color: '#10b981', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Unlimited Conversations
            </h3>
            <p style={{ color: '#9ca3af' }}>
              Chat as much as you want with no daily limits
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <Headphones size={48} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Priority Support
            </h3>
            <p style={{ color: '#9ca3af' }}>
              Get help when you need it with our dedicated support team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
