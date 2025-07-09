import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Zap, Clock, Users, MessageSquare, Headphones } from 'lucide-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  priceId?: string;
}

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with basic AI conversations',
    features: [
      '50 messages per day',
      'Basic AI models',
      'Standard response time',
      'Community support',
      'Basic conversation history'
    ]
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: '$6.99',
    period: 'per month',
    description: 'Perfect for regular users who want full access',
    features: [
      'Unlimited messages',
      'All premium AI models (GPT-4, Claude Opus, Gemini Pro)',
      'Priority response time',
      'Advanced voice features',
      'Priority email support',
      'Extended conversation history',
      'Custom AI personalities',
      'Document analysis'
    ],
    popular: true,
    priceId: 'price_monthly_699' // This should be set in Stripe dashboard
  },
  {
    id: 'lifetime',
    name: 'Lifetime Pro',
    price: '$159.99',
    period: 'one-time',
    description: 'Best value for power users - pay once, use forever',
    features: [
      'Everything in Pro Monthly',
      'Lifetime access to all features',
      'No recurring payments',
      'Future feature updates included',
      'Premium priority support',
      'Early access to new AI models',
      'Advanced customization options',
      'API access (coming soon)'
    ],
    priceId: 'price_lifetime_15999' // This should be set in Stripe dashboard
  }
];

function SubscribeForm({ plan }: { plan: PricingPlan }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);

  const handlePromoApply = async () => {
    if (!promoCode.trim()) return;
    
    setIsProcessing(true);
    try {
      // First ensure demo user exists
      const demoUserResponse = await apiRequest('POST', '/api/create-demo-user', {});
      const demoUserData = await demoUserResponse.json();
      console.log('Demo user response:', demoUserData);
      
      if (!demoUserData.user || !demoUserData.user.id) {
        throw new Error('Failed to create demo user');
      }
      
      const demoUser = demoUserData.user;
      
      const promoResponse = await apiRequest('POST', '/api/apply-promo', {
        userId: demoUser.id,
        promoCode: promoCode.toUpperCase()
      });
      
      const result = await promoResponse.json();

      if (result.success) {
        setPromoApplied(true);
        toast({
          title: "Promo Code Applied!",
          description: result.message,
        });
        
        // If lifetime access, redirect to chat
        if (result.user && result.user.subscriptionStatus === 'lifetime') {
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error('Promo code error:', error);
      toast({
        title: "Invalid Code",
        description: error.message || "This promo code is not valid",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const response = await apiRequest('POST', '/api/create-payment-intent', {
        planId: plan.id,
        priceId: plan.priceId,
        amount: plan.id === 'monthly' ? 699 : 15999 // Amount in cents
      });

      const { clientSecret } = response;

      // Confirm payment
      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success!",
          description: `You're now subscribed to ${plan.name}!`,
        });
        // Redirect to chat or refresh user data
        window.location.href = '/';
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Payment failed",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (promoApplied) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '32px',
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        border: '1px solid #10b981'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          backgroundColor: '#10b981',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          ✓
        </div>
        <h3 style={{ color: '#10b981', marginBottom: '8px' }}>
          Promo Code Applied!
        </h3>
        <p style={{ color: '#9ca3af', marginBottom: '16px' }}>
          You now have lifetime premium access
        </p>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '12px 24px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Start Using Turbo AI
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
      {/* Promo Code Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>
            Have a promo code?
          </span>
          <button
            type="button"
            onClick={() => setShowPromoInput(!showPromoInput)}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {showPromoInput ? 'Hide' : 'Apply Code'}
          </button>
        </div>

        {showPromoInput && (
          <div style={{
            padding: '16px',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Enter promo code (e.g. LIFETIME_FREE)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#111111',
                  border: '1px solid #333333',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </div>
            <button
              type="button"
              onClick={handlePromoApply}
              disabled={!promoCode.trim() || isProcessing}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: (!promoCode.trim() || isProcessing) ? 'not-allowed' : 'pointer',
                opacity: (!promoCode.trim() || isProcessing) ? 0.5 : 1
              }}
            >
              {isProcessing ? 'Applying...' : 'Apply Promo Code'}
            </button>
            
            {/* Hint for available codes */}
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#1e1b4b',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#a855f7'
            }}>
              💡 Try: LIFETIME_FREE, FOUNDER_ACCESS, or PREMIUM_YEAR
            </div>
          </div>
        )}
      </div>

      {/* Payment Section */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          color: '#9ca3af',
          marginBottom: '8px'
        }}>
          Payment Details
        </label>
        <div style={{
          padding: '16px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px'
        }}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': {
                    color: '#9ca3af',
                  },
                },
              },
            }}
          />
        </div>
      </div>
      
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        style={{
          width: '100%',
          padding: '12px 24px',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          opacity: isProcessing ? 0.7 : 1
        }}
      >
        {isProcessing ? 'Processing...' : `Subscribe to ${plan.name}`}
      </button>
    </form>
  );
}

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create demo user first
  const createDemoUserMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/create-demo-user', {});
      return await response.json();
    },
  });

  const applyPromoMutation = useMutation({
    mutationFn: async ({ promoCode }: { promoCode: string }) => {
      // First ensure demo user exists
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: 'white',
      padding: '40px 20px'
    }}>
      {/* Header */}
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

        {/* Promo Code Button */}
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

        {/* Promo Code Input */}
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
                placeholder="Enter promo code (e.g. LIFETIME_FREE)"
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
                onClick={() => {
                  setShowPromoCode(false);
                  setPromoCode('');
                }}
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
            
            {/* Hint for available codes */}
            <div style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: '#1e1b4b',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#a855f7'
            }}>
              💡 Try: LIFETIME_FREE, FOUNDER_ACCESS, or PREMIUM_YEAR
            </div>
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '30px',
        maxWidth: '1200px',
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

            {/* Plan Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
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
                <span style={{
                  fontSize: '16px',
                  color: '#9ca3af',
                  marginLeft: '8px'
                }}>
                  {plan.period}
                </span>
              </div>
              
              <p style={{
                fontSize: '16px',
                color: '#9ca3af'
              }}>
                {plan.description}
              </p>
            </div>

            {/* Features List */}
            <div style={{ marginBottom: '32px' }}>
              {plan.features.map((feature, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}
                >
                  <Check
                    size={20}
                    style={{
                      color: '#10b981',
                      marginRight: '12px',
                      flexShrink: 0
                    }}
                  />
                  <span style={{ fontSize: '16px' }}>{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            {plan.id === 'free' ? (
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
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
              <button
                onClick={() => setSelectedPlan(plan)}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: plan.popular ? '#3b82f6' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Choose {plan.name}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#111111',
            padding: '32px',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '500px',
            border: '1px solid #333333'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              Subscribe to {selectedPlan.name}
            </h2>
            
            <p style={{
              fontSize: '16px',
              color: '#9ca3af',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              {selectedPlan.price} {selectedPlan.period}
            </p>

            <Elements stripe={stripePromise}>
              <SubscribeForm plan={selectedPlan} />
            </Elements>

            <button
              onClick={() => setSelectedPlan(null)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'transparent',
                color: '#9ca3af',
                border: '1px solid #333333',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div style={{
        maxWidth: '1200px',
        margin: '80px auto 0',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          marginBottom: '48px'
        }}>
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