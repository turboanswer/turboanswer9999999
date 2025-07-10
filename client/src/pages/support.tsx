import { Mail, Phone, MessageCircle, Clock, HelpCircle } from "lucide-react";
import { Link } from "wouter";

export default function Support() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: 'white',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        paddingTop: '40px'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '48px'
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '16px'
          }}>
            Support
          </h1>
          <p style={{
            fontSize: '20px',
            color: '#9ca3af',
            marginBottom: '32px'
          }}>
            Get help with Turbo Answer - we're here to assist you
          </p>
        </div>

        {/* Contact Information */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          {/* Email Support */}
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #333333',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#2563eb',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <Mail size={32} color="white" />
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: 'white'
            }}>
              Email Support
            </h3>
            <p style={{
              color: '#9ca3af',
              marginBottom: '16px',
              fontSize: '16px'
            }}>
              Send us an email and we'll get back to you within 24 hours
            </p>
            <a
              href="mailto:turboaswer@hotmail.com"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            >
              turboaswer@hotmail.com
            </a>
          </div>

          {/* Phone Support */}
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #333333',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <Phone size={32} color="white" />
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: 'white'
            }}>
              Phone Support
            </h3>
            <p style={{
              color: '#9ca3af',
              marginBottom: '16px',
              fontSize: '16px'
            }}>
              Call us directly for immediate assistance
            </p>
            <a
              href="tel:+12016918466"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
            >
              (201) 691-8466
            </a>
          </div>
        </div>

        {/* Support Hours */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <Clock size={24} color="#60a5fa" style={{ marginRight: '12px' }} />
            <h3 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'white'
            }}>
              Support Hours
            </h3>
          </div>
          <div style={{
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '16px',
            lineHeight: '1.6'
          }}>
            <p><strong style={{ color: 'white' }}>Monday - Friday:</strong> 9:00 AM - 6:00 PM EST</p>
            <p><strong style={{ color: 'white' }}>Saturday:</strong> 10:00 AM - 4:00 PM EST</p>
            <p><strong style={{ color: 'white' }}>Sunday:</strong> Closed</p>
            <p style={{ marginTop: '16px', fontSize: '14px' }}>
              Email support is available 24/7 - we'll respond within 24 hours
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{
          backgroundColor: '#111111',
          border: '1px solid #333333',
          borderRadius: '16px',
          padding: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <HelpCircle size={24} color="#a855f7" style={{ marginRight: '12px' }} />
            <h3 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'white'
            }}>
              Common Questions
            </h3>
          </div>
          <div style={{
            display: 'grid',
            gap: '16px'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px'
            }}>
              <h4 style={{ color: 'white', marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
                How do I upgrade to premium?
              </h4>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                Visit the Pricing page and select your preferred plan. You can also apply promo codes for special offers.
              </p>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px'
            }}>
              <h4 style={{ color: 'white', marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
                What AI models are available?
              </h4>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                Premium users get access to Gemini 2.0 Flash Experimental, Claude 4.0 Sonnet, GPT-4o, and all advanced models.
              </p>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px'
            }}>
              <h4 style={{ color: 'white', marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
                Can I cancel my subscription?
              </h4>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                Yes, you can cancel anytime. Contact our support team for assistance with subscription management.
              </p>
            </div>
            
            {/* Privacy Policy Link */}
            <div style={{
              padding: '16px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              textAlign: 'center',
              marginTop: '16px'
            }}>
              <h4 style={{ color: 'white', marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
                Privacy Policy & Terms
              </h4>
              <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '12px' }}>
                Review our comprehensive privacy policy and terms of use
              </p>
              <Link
                to="/privacy-policy"
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                📋 View Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}