import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Send, Mail, Loader2, CheckCircle, Ban, ShieldCheck, Search, KeyRound, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";

const APP_URL = 'https://turbo-answer.replit.app';

const TEMPLATES = [
  {
    id: 'account-banned',
    label: 'Account Banned',
    icon: Ban,
    color: '#ef4444',
    description: 'Notify a user that their account has been banned for violating guidelines.',
    bannerBg: '#fef2f2',
    bannerColor: '#991b1b',
    bannerIcon: '\u2717',
    bannerText: 'Account Banned',
  },
  {
    id: 'account-unbanned',
    label: 'Account Unbanned',
    icon: ShieldCheck,
    color: '#22c55e',
    description: 'Notify a user that their account ban has been lifted and access restored.',
    bannerBg: '#ecfdf5',
    bannerColor: '#065f46',
    bannerIcon: '\u2713',
    bannerText: 'Account Unbanned',
  },
  {
    id: 'account-suspended',
    label: 'Suspended for Review',
    icon: Search,
    color: '#f59e0b',
    description: 'Notify a user their account is temporarily suspended and under review.',
    bannerBg: '#fffbeb',
    bannerColor: '#92400e',
    bannerIcon: '\u26A0',
    bannerText: 'Account Suspended for Review',
  },
  {
    id: 'account-recovered',
    label: 'Account Recovered',
    icon: KeyRound,
    color: '#3b82f6',
    description: 'Notify a user that their account has been successfully recovered.',
    bannerBg: '#eff6ff',
    bannerColor: '#1e40af',
    bannerIcon: '\uD83D\uDD12',
    bannerText: 'Account Recovered',
  },
  {
    id: 'account-deleted',
    label: 'Permanently Deleted',
    icon: Trash2,
    color: '#dc2626',
    description: 'Confirm to a user that their account and all data have been permanently deleted.',
    bannerBg: '#fef2f2',
    bannerColor: '#7f1d1d',
    bannerIcon: '\uD83D\uDDD1',
    bannerText: 'Account Permanently Deleted',
  },
];

const templateBodies: Record<string, (name: string, date: string) => { paragraphs: string[]; bullets: string[]; afterBullets: string[]; showLogin: boolean }> = {
  'account-banned': (name, date) => ({
    paragraphs: [
      `Dear ${name},`,
      `We regret to inform you that your TurboAnswer account has been banned effective ${date}.`,
      'This action was taken due to a violation of our community guidelines or terms of service. As a result:',
    ],
    bullets: [
      'Your account access has been revoked',
      'You will not be able to log in or use TurboAnswer services',
      'Any active subscriptions have been paused',
    ],
    afterBullets: [
      'If you believe this was done in error, you may appeal by contacting our support team. Please include your account email and a detailed explanation in your appeal.',
    ],
    showLogin: false,
  }),
  'account-unbanned': (name, date) => ({
    paragraphs: [
      `Dear ${name},`,
      `Great news! Your TurboAnswer account has been unbanned and fully restored as of ${date}.`,
      'Your access to all TurboAnswer services has been fully restored. You may now:',
    ],
    bullets: [
      'Log in and use TurboAnswer normally',
      'Access all AI features available to your subscription tier',
      'Engage with the community and all platform features',
    ],
    afterBullets: [
      'We kindly ask that you continue to adhere to our community guidelines and terms of service to ensure a positive experience for all users.',
    ],
    showLogin: true,
  }),
  'account-suspended': (name, date) => ({
    paragraphs: [
      `Dear ${name},`,
      `Your TurboAnswer account has been temporarily suspended and is currently under review as of ${date}.`,
      'During this review period:',
    ],
    bullets: [
      'Your account access is temporarily restricted',
      'Your data and conversations remain safe and intact',
      'Any active subscriptions are paused until the review is complete',
    ],
    afterBullets: [
      'Our team is reviewing your account activity. You will receive a follow-up email once the review is complete. This process typically takes 1-3 business days.',
      'If you have additional information that may assist in the review, please contact our support team.',
    ],
    showLogin: false,
  }),
  'account-recovered': (name, date) => ({
    paragraphs: [
      `Dear ${name},`,
      `Your TurboAnswer account has been successfully recovered as of ${date}.`,
      'Your account is now fully accessible. Here\'s what you should know:',
    ],
    bullets: [
      'All your data, conversations, and settings have been restored',
      'Your subscription status remains unchanged',
      'We recommend updating your password for security',
    ],
    afterBullets: [
      'For your security, if you did not request this recovery, please contact our support team immediately.',
    ],
    showLogin: true,
  }),
  'account-deleted': (name, date) => ({
    paragraphs: [
      `Dear ${name},`,
      `This email confirms that your TurboAnswer account has been permanently deleted as of ${date}.`,
      'The following actions have been completed:',
    ],
    bullets: [
      'All account data has been permanently removed from our systems',
      'All conversation history has been deleted',
      'Any active subscriptions have been cancelled',
      'This action is irreversible and cannot be undone',
    ],
    afterBullets: [
      'If you wish to use TurboAnswer again in the future, you are welcome to create a new account at any time.',
      'We\'re sorry to see you go. Thank you for being a part of the TurboAnswer community.',
    ],
    showLogin: false,
  }),
};

export default function EmailTemplates() {
  const { toast } = useToast();
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('account-banned');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const name = recipientName.trim() || '[Recipient Name]';
  const template = TEMPLATES.find(t => t.id === selectedTemplate)!;
  const body = templateBodies[selectedTemplate](name, currentDate);

  const handleSendEmail = async () => {
    if (!recipientName.trim() || !recipientEmail.trim()) {
      toast({ title: "Missing info", description: "Please enter both the name and email address", variant: "destructive" });
      return;
    }
    setSending(true);
    setSent(false);
    try {
      const res = await apiRequest('POST', '/api/admin/send-email', {
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
        templateType: selectedTemplate,
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        toast({ title: "Email sent!", description: data.message || `Email sent to ${recipientEmail.trim()}` });
      } else {
        toast({ title: "Failed to send", description: data.error || "Something went wrong", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000000', color: 'white', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <Link href="/employee/dashboard">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Admin
            </Button>
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
            <Mail className="w-8 h-8 text-purple-400" />
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Email Templates
            </h1>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '16px' }}>Send professional email notifications from support@turboanswer.it.com</p>
        </div>

        <div style={{
          backgroundColor: '#111111',
          border: '1px solid #333333',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#a78bfa' }}>
            Choose Email Template
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {TEMPLATES.map(t => {
              const Icon = t.icon;
              const isSelected = selectedTemplate === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTemplate(t.id); setSent(false); }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '14px 10px',
                    borderRadius: '10px',
                    border: isSelected ? `2px solid ${t.color}` : '2px solid #333',
                    backgroundColor: isSelected ? `${t.color}15` : '#0a0a0a',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon style={{ width: '22px', height: '22px', color: t.color }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? t.color : '#ccc', textAlign: 'center' }}>{t.label}</span>
                </button>
              );
            })}
          </div>

          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>{template.description}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Input
                placeholder="Recipient's full name"
                value={recipientName}
                onChange={(e) => { setRecipientName(e.target.value); setSent(false); }}
                className="flex-1 min-w-[200px] bg-black/50 border-gray-700 text-white"
              />
              <Input
                placeholder="Recipient's email address"
                type="email"
                value={recipientEmail}
                onChange={(e) => { setRecipientEmail(e.target.value); setSent(false); }}
                className="flex-1 min-w-[200px] bg-black/50 border-gray-700 text-white"
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                onClick={handleSendEmail}
                disabled={!recipientName.trim() || !recipientEmail.trim() || sending}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold px-8"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : sent ? (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Sent!</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send {template.label} Email</>
                )}
              </Button>
              {sent && (
                <span style={{ color: '#22c55e', fontSize: '14px' }}>
                  Email delivered to {recipientEmail}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#111111',
          border: '1px solid #333333',
          borderRadius: '12px',
          padding: '8px',
          marginBottom: '40px'
        }}>
          <p style={{ color: '#9ca3af', fontSize: '13px', padding: '8px 16px', marginBottom: '8px' }}>
            Email Preview (this is what the recipient will see):
          </p>
          <div style={{ backgroundColor: '#f4f4f7', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ maxWidth: '600px', margin: '40px auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '32px',
                textAlign: 'center' as const
              }}>
                <img src={turboLogo} alt="TurboAnswer" width="64" height="64" style={{ borderRadius: '16px', marginBottom: '12px' }} />
                <h1 style={{ color: '#ffffff', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>TurboAnswer</h1>
                <p style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 0', fontSize: '14px' }}>Advanced AI Assistant</p>
              </div>

              <div style={{ padding: '40px 32px' }}>
                <div style={{
                  backgroundColor: template.bannerBg,
                  border: `1px solid ${template.bannerColor}33`,
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                  textAlign: 'center' as const
                }}>
                  <span style={{ color: template.bannerColor, fontWeight: 'bold', fontSize: '16px' }}>
                    {template.bannerIcon} {template.bannerText}
                  </span>
                </div>

                {body.paragraphs.map((p, i) => (
                  <p key={i} style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px' }}>{p}</p>
                ))}
                <ul style={{ color: '#374151', fontSize: '16px', lineHeight: 1.8, margin: '0 0 16px', paddingLeft: '20px' }}>
                  {body.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>

                {body.afterBullets.map((p, i) => (
                  <p key={`after-${i}`} style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px' }}>{p}</p>
                ))}

                {body.showLogin && (
                  <div style={{ textAlign: 'center' as const, margin: '32px 0' }}>
                    <a href={`${APP_URL}/login`} style={{
                      display: 'inline-block',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '14px 32px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>Log In to TurboAnswer</a>
                  </div>
                )}

                <p style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: '16px 0 0' }}>
                  If you have any questions or concerns, please reach out to our support team using the contact information below.
                </p>
                <p style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: '24px 0 4px' }}>Best regards,</p>
                <p style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: 0, fontWeight: 'bold' }}>The TurboAnswer Team</p>
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '28px 32px', textAlign: 'center' as const }}>
                <p style={{ color: '#ffffff', fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px', letterSpacing: '0.5px' }}>
                  Need Help? Contact Us
                </p>
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '10px' }}>
                  <a href="mailto:support@turboanswer.it.com" style={{
                    display: 'inline-block',
                    backgroundColor: '#667eea',
                    color: '#ffffff',
                    textDecoration: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '15px',
                  }}>support@turboanswer.it.com</a>
                  <a href="tel:+15182505405" style={{
                    display: 'inline-block',
                    backgroundColor: '#764ba2',
                    color: '#ffffff',
                    textDecoration: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '15px',
                  }}>Call Us: (518) 250-5405</a>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: '16px 0 0' }}>Mon - Fri, 10:00 AM - 4:00 PM EST</p>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #334155' }}>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                    &copy; {new Date().getFullYear()} TurboAnswer. All rights reserved.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
