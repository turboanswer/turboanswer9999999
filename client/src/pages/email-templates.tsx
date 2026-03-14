import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Send, Mail, Loader2, CheckCircle, Ban, ShieldCheck, Search, KeyRound, Trash2, ShieldOff, ShieldPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const APP_URL = 'https://turbo-answer.replit.app';

const TEMPLATES = [
  {
    id: 'account-banned',
    label: 'Account Banned',
    icon: Ban,
    color: '#ef4444',
    description: 'Notify a user that their account has been banned for violating guidelines.',
  },
  {
    id: 'account-unbanned',
    label: 'Account Unbanned',
    icon: ShieldCheck,
    color: '#22c55e',
    description: 'Notify a user that their account ban has been lifted and access restored.',
  },
  {
    id: 'account-suspended',
    label: 'Suspended for Review',
    icon: Search,
    color: '#f59e0b',
    description: 'Notify a user their account is temporarily suspended and under review.',
  },
  {
    id: 'account-recovered',
    label: 'Account Recovered',
    icon: KeyRound,
    color: '#3b82f6',
    description: 'Notify a user that their account has been successfully recovered.',
  },
  {
    id: 'account-deleted',
    label: 'Permanently Deleted',
    icon: Trash2,
    color: '#dc2626',
    description: 'Confirm to a user that their account and all data have been permanently deleted.',
  },
  {
    id: 'blacklist-added',
    label: 'Added to Blacklist',
    icon: ShieldOff,
    color: '#7f1d1d',
    description: 'Notify a user they have been added to the TurboAnswer blacklist.',
  },
  {
    id: 'blacklist-removed',
    label: 'Removed from Blacklist',
    icon: ShieldPlus,
    color: '#059669',
    description: 'Notify a user they have been removed from the TurboAnswer blacklist.',
  },
];

function getEmailBody(templateId: string, name: string, date: string): string {
  const appUrl = APP_URL;
  const bodies: Record<string, string> = {
    'account-banned': `Dear ${name},

We regret to inform you that your TurboAnswer account has been banned effective ${date}.

This action was taken due to a violation of our community guidelines or terms of service. As a result:

- Your account access has been revoked
- You will not be able to log in or use TurboAnswer services
- Any active subscriptions have been paused

If you believe this was done in error, you may appeal by contacting our appeals team at appeals@turboanswer.it.com. Please include your account email and a detailed explanation in your appeal.`,

    'account-unbanned': `Dear ${name},

Your TurboAnswer account has been unbanned and fully restored as of ${date}.

Your access to all TurboAnswer services has been fully restored. You may now:

- Log in and use TurboAnswer normally
- Access all AI features available to your subscription tier
- Engage with the community and all platform features

We kindly ask that you continue to adhere to our community guidelines and terms of service.

You can log in at: ${appUrl}/login`,

    'account-suspended': `Dear ${name},

Your TurboAnswer account has been temporarily suspended and is currently under review as of ${date}.

During this review period:

- Your account access is temporarily restricted
- Your data and conversations remain safe and intact
- Any active subscriptions are paused until the review is complete

Our team is reviewing your account activity. You will receive a follow-up email once the review is complete. This process typically takes 1-3 business days.

If you have additional information that may assist in the review, please contact our appeals team at appeals@turboanswer.it.com.`,

    'account-recovered': `Dear ${name},

Your TurboAnswer account has been successfully recovered as of ${date}.

Your account is now fully accessible:

- All your data, conversations, and settings have been restored
- Your subscription status remains unchanged
- We recommend updating your password for security

For your security, if you did not request this recovery, please contact our appeals team immediately at appeals@turboanswer.it.com.

You can log in at: ${appUrl}/login`,

    'account-deleted': `Dear ${name},

This email confirms that your TurboAnswer account has been permanently deleted as of ${date}.

The following actions have been completed:

- All account data has been permanently removed from our systems
- All conversation history has been deleted
- Any active subscriptions have been cancelled
- This action is irreversible and cannot be undone

If you wish to use TurboAnswer again in the future, you are welcome to create a new account at any time.

Thank you for being a part of the TurboAnswer community.`,

    'blacklist-added': `Dear ${name},

We are writing to inform you that your account has been added to the TurboAnswer blacklist effective ${date}.

The following restrictions are now in effect:

- Your account has been permanently blocked from accessing TurboAnswer
- You will not be able to create new accounts using the same credentials
- Any active subscriptions have been cancelled and refunded where applicable
- All associated data will be retained for security purposes

This action was taken due to severe or repeated violations of our terms of service.

If you believe this decision was made in error, you may submit an appeal by contacting appeals@turboanswer.it.com. Please include your account email and a detailed explanation.`,

    'blacklist-removed': `Dear ${name},

We are pleased to inform you that your account has been removed from the TurboAnswer blacklist as of ${date}.

Your access has been fully restored:

- Your account is now fully active and accessible
- You may log in and use all TurboAnswer services
- You are welcome to subscribe to any of our plans
- All platform features are available to you

We kindly ask that you continue to adhere to our community guidelines and terms of service.

You can log in at: ${appUrl}/login`,
  };
  return bodies[templateId] || '';
}

export default function EmailTemplates() {
  const { toast } = useToast();
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('account-banned');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [useHtml, setUseHtml] = useState(true);

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const name = recipientName.trim() || '[Recipient Name]';
  const template = TEMPLATES.find(t => t.id === selectedTemplate)!;
  const emailBody = getEmailBody(selectedTemplate, name, currentDate);

  const fullPreview = `${emailBody}

--
TurboAnswer Support
Email: support@turboanswer.it.com
Phone: (866) 467-7269
Hours: Mon-Fri, 9:30 AM - 6:00 PM EST

To stop receiving these emails, reply with "Unsubscribe" in the subject line.`;

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
        useHtml,
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

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#9ca3af' }}>
                <input
                  type="checkbox"
                  checked={useHtml}
                  onChange={(e) => setUseHtml(e.target.checked)}
                  style={{ accentColor: '#7c3aed' }}
                />
                Include HTML formatting
              </label>
              <span style={{ fontSize: '12px', color: useHtml ? '#f59e0b' : '#22c55e', padding: '2px 8px', borderRadius: '4px', backgroundColor: useHtml ? '#f59e0b15' : '#22c55e15' }}>
                {useHtml ? 'HTML + Plain Text (standard)' : 'Plain Text Only (best deliverability)'}
              </span>
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
            Email Preview (exactly what the recipient will see):
          </p>
          <div style={{ backgroundColor: '#000000', borderRadius: '8px', overflow: 'hidden', padding: '32px', maxWidth: '600px', margin: '0 auto', border: '1px solid #333' }}>
            <pre style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '15px',
              lineHeight: 1.6,
              color: '#ffffff',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              margin: 0,
            }}>
              {fullPreview}
            </pre>
          </div>
        </div>

        <div style={{
          backgroundColor: '#0a0a0a',
          border: '1px solid #222',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '40px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '12px' }}>
            Deliverability Tips
          </h3>
          <ul style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.8, margin: 0, paddingLeft: '20px' }}>
            <li>Uncheck "Include HTML formatting" to send plain-text only emails (best chance of avoiding spam)</li>
            <li>Ask recipients to check their spam/junk folder and mark as "Not Spam"</li>
            <li>Ask recipients to add support@turboanswer.it.com to their contacts</li>
            <li>Emails are sent via Brevo for reliable inbox delivery</li>
            <li>Verify your sender domain in Brevo dashboard for best results</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
