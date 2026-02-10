import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Send, Mail, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";

const APP_URL = 'https://turbo-answer.replit.app';

export default function EmailTemplates() {
  const { toast } = useToast();
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const name = recipientName.trim() || '[Recipient Name]';

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
        templateType: 'blacklist-removal',
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        toast({ title: "Email sent!", description: `Blacklist removal notice sent to ${recipientEmail.trim()}` });
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
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#a78bfa' }}>
            Blacklist Removal Notice
          </h2>
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
                  <><Send className="w-4 h-4 mr-2" /> Send Email</>
                )}
              </Button>
              {sent && (
                <span style={{ color: '#22c55e', fontSize: '14px' }}>
                  Email delivered to {recipientEmail}
                </span>
              )}
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
              Sends a professional HTML email with the TurboAnswer logo directly from your Spacemail account.
            </p>
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
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'center' as const }}>
                  <span style={{ color: '#065f46', fontWeight: 'bold', fontSize: '16px' }}>&#10003; Blacklist Removal Confirmed</span>
                </div>

                <p style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px' }}>Dear {name},</p>
                <p style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px' }}>We are writing to officially inform you that your account has been <strong>removed from the blacklist</strong> on TurboAnswer, effective as of <strong>{currentDate}</strong>.</p>
                <p style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px' }}>Your access to all TurboAnswer services has been fully restored. You may now:</p>
                <ul style={{ color: '#374151', fontSize: '16px', lineHeight: 1.8, margin: '0 0 16px', paddingLeft: '20px' }}>
                  <li>Log in and use TurboAnswer normally</li>
                  <li>Access all AI features available to your subscription tier</li>
                  <li>Engage with the community and all platform features</li>
                </ul>
                <p style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px' }}>We kindly ask that you continue to adhere to our community guidelines and terms of service to ensure a positive experience for all users.</p>

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

                <p style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px' }}>If you have any questions or concerns, please don't hesitate to reach out to our support team.</p>
                <p style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: '24px 0 4px' }}>Best regards,</p>
                <p style={{ color: '#374151', fontSize: '16px', lineHeight: 1.6, margin: 0, fontWeight: 'bold' }}>The TurboAnswer Team</p>
              </div>

              <div style={{ backgroundColor: '#f9fafb', padding: '32px', borderTop: '1px solid #e5e7eb', textAlign: 'center' as const }}>
                <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px' }}>Contact Us</p>
                <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.8, margin: 0 }}>
                  &#9993; <a href="mailto:support@turboanswer.it.com" style={{ color: '#667eea', textDecoration: 'none' }}>support@turboanswer.it.com</a><br/>
                  &#9742; <a href="tel:+15182505405" style={{ color: '#667eea', textDecoration: 'none' }}>518-250-5405</a><br/>
                  &#128339; Mon - Fri, 10:00 AM - 4:00 PM EST
                </p>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>&copy; {new Date().getFullYear()} TurboAnswer. All rights reserved.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
