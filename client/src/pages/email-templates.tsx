import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Send, Mail, Loader2, CheckCircle, Ban, ShieldCheck, Search, KeyRound, Trash2, ShieldOff, ShieldPlus } from 'lucide-react';
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
  {
    id: 'blacklist-added',
    label: 'Added to Blacklist',
    icon: ShieldOff,
    color: '#7f1d1d',
    description: 'Notify a user they have been added to the TurboAnswer blacklist.',
    bannerBg: '#fef2f2',
    bannerColor: '#7f1d1d',
    bannerIcon: '\uD83D\uDEAB',
    bannerText: 'Added to Blacklist',
  },
  {
    id: 'blacklist-removed',
    label: 'Removed from Blacklist',
    icon: ShieldPlus,
    color: '#059669',
    description: 'Notify a user they have been removed from the TurboAnswer blacklist.',
    bannerBg: '#ecfdf5',
    bannerColor: '#065f46',
    bannerIcon: '\u2705',
    bannerText: 'Removed from Blacklist',
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
  'blacklist-added': (name, date) => ({
    paragraphs: [
      `Dear ${name},`,
      `We are writing to inform you that your account has been added to the TurboAnswer blacklist effective ${date}.`,
      'This means the following restrictions are now in effect:',
    ],
    bullets: [
      'Your account has been permanently blocked from accessing TurboAnswer',
      'You will not be able to create new accounts using the same credentials',
      'Any active subscriptions have been cancelled and refunded where applicable',
      'All associated data will be retained for security purposes',
    ],
    afterBullets: [
      'This action was taken due to severe or repeated violations of our terms of service, community guidelines, or applicable laws.',
      'If you believe this decision was made in error, you may submit an appeal by contacting our support team. Please include your account email and a detailed explanation of the circumstances.',
    ],
    showLogin: false,
  }),
  'blacklist-removed': (name, date) => ({
    paragraphs: [
      `Dear ${name},`,
      `We are pleased to inform you that your account has been removed from the TurboAnswer blacklist as of ${date}.`,
      'Your access has been fully restored. Here\'s what this means for you:',
    ],
    bullets: [
      'Your account is now fully active and accessible',
      'You may log in and use all TurboAnswer services',
      'You are welcome to subscribe to any of our plans',
      'All platform features are available to you',
    ],
    afterBullets: [
      'We kindly ask that you review and continue to adhere to our community guidelines and terms of service to ensure a positive experience for everyone.',
      'Welcome back to TurboAnswer! We\'re glad to have you with us again.',
    ],
    showLogin: true,
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
          <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ maxWidth: '600px', margin: '32px auto', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>

              <div style={{
                padding: '32px 32px 24px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', letterSpacing: '-0.3px' }}>TurboAnswer</span>
              </div>

              <div style={{ padding: '32px' }}>
                <div style={{
                  backgroundColor: template.bannerBg,
                  borderLeft: `4px solid ${template.bannerColor}`,
                  padding: '14px 18px',
                  marginBottom: '24px',
                  borderRadius: '4px'
                }}>
                  <span style={{ color: template.bannerColor, fontWeight: 600, fontSize: '15px' }}>
                    {template.bannerText}
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
                  <div style={{ margin: '28px 0' }}>
                    <a href={`${APP_URL}/login`} style={{
                      display: 'inline-block',
                      backgroundColor: '#4f46e5',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '12px 28px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '15px'
                    }}>Log In to Your Account</a>
                  </div>
                )}

                <p style={{ color: '#374151', fontSize: '15px', lineHeight: 1.6, margin: '20px 0 0' }}>
                  If you have any questions, please do not hesitate to contact us.
                </p>
                <p style={{ color: '#374151', fontSize: '15px', lineHeight: 1.6, margin: '20px 0 4px' }}>Sincerely,</p>
                <p style={{ color: '#111827', fontSize: '15px', lineHeight: 1.6, margin: 0, fontWeight: 600 }}>The TurboAnswer Team</p>
              </div>

              <div style={{ padding: '24px 32px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 8px', fontWeight: 600 }}>Contact Support</p>
                <p style={{ color: '#374151', fontSize: '13px', margin: '0 0 4px' }}>
                  Email: <a href="mailto:support@turboanswer.it.com" style={{ color: '#4f46e5', textDecoration: 'none' }}>support@turboanswer.it.com</a>
                </p>
                <p style={{ color: '#374151', fontSize: '13px', margin: '0 0 4px' }}>
                  Phone: <a href="tel:+15182505405" style={{ color: '#4f46e5', textDecoration: 'none' }}>(518) 250-5405</a>
                </p>
                <p style={{ color: '#6b7280', fontSize: '12px', margin: '8px 0 0' }}>Monday - Friday, 10:00 AM - 4:00 PM EST</p>
              </div>

              <div style={{ padding: '16px 32px', borderTop: '1px solid #e5e7eb', textAlign: 'center' as const }}>
                <p style={{ color: '#9ca3af', fontSize: '11px', margin: 0 }}>
                  &copy; {new Date().getFullYear()} TurboAnswer. All rights reserved.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
