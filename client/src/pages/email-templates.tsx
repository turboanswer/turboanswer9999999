import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';
import { ArrowLeft, Copy, Check, Mail, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";

export default function EmailTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recipientName, setRecipientName] = useState('');
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const generateEmailHTML = () => {
    const name = recipientName.trim() || '[Recipient Name]';
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blacklist Removal Notice - TurboAnswer</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px;text-align:center;">
<img src="https://turbo-answer.replit.app/assets/logo.png" alt="TurboAnswer" width="64" height="64" style="border-radius:16px;margin-bottom:12px;display:inline-block;" />
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:bold;">TurboAnswer</h1>
<p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Advanced AI Assistant</p>
</td></tr>

<tr><td style="padding:40px 32px;">
<div style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
<span style="color:#065f46;font-weight:bold;font-size:16px;">&#10003; Blacklist Removal Confirmed</span>
</div>

<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear ${name},</p>

<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">We are writing to officially inform you that your account has been <strong>removed from the blacklist</strong> on TurboAnswer, effective as of <strong>${currentDate}</strong>.</p>

<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Your access to all TurboAnswer services has been fully restored. You may now:</p>

<ul style="color:#374151;font-size:16px;line-height:1.8;margin:0 0 16px;padding-left:20px;">
<li>Log in and use TurboAnswer normally</li>
<li>Access all AI features available to your subscription tier</li>
<li>Engage with the community and all platform features</li>
</ul>

<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">We kindly ask that you continue to adhere to our community guidelines and terms of service to ensure a positive experience for all users.</p>

<div style="text-align:center;margin:32px 0;">
<a href="https://turbo-answer.replit.app/login" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;">Log In to TurboAnswer</a>
</div>

<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">If you have any questions or concerns, please don't hesitate to reach out to our support team.</p>

<p style="color:#374151;font-size:16px;line-height:1.6;margin:24px 0 4px;">Best regards,</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0;font-weight:bold;">The TurboAnswer Team</p>
</td></tr>

<tr><td style="background-color:#f9fafb;padding:32px;border-top:1px solid #e5e7eb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;">
<p style="color:#6b7280;font-size:14px;font-weight:bold;margin:0 0 12px;">Contact Us</p>
<p style="color:#6b7280;font-size:13px;line-height:1.8;margin:0;">
&#9993; <a href="mailto:support@turboanswer.it.com" style="color:#667eea;text-decoration:none;">support@turboanswer.it.com</a><br/>
&#9742; <a href="tel:+15182505405" style="color:#667eea;text-decoration:none;">518-250-5405</a><br/>
&#128339; Mon - Fri, 10:00 AM - 4:00 PM EST
</p>
<div style="margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb;">
<p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} TurboAnswer. All rights reserved.</p>
</div>
</td></tr>
</table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
  };

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(generateEmailHTML());
    setCopied(true);
    toast({ title: "Copied!", description: "Email HTML copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHTML = () => {
    const blob = new Blob([generateEmailHTML()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blacklist-removal-${recipientName.trim().replace(/\s+/g, '-').toLowerCase() || 'template'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Email template saved as HTML file" });
  };

  const name = recipientName.trim() || '[Recipient Name]';

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
          <p style={{ color: '#9ca3af', fontSize: '16px' }}>Generate professional email notifications</p>
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
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Input
              placeholder="Enter recipient's full name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="flex-1 min-w-[250px] bg-black/50 border-gray-700 text-white"
            />
            <Button onClick={handleCopyHTML} className="bg-purple-600 hover:bg-purple-700">
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy HTML'}
            </Button>
            <Button onClick={handleDownloadHTML} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <Download className="w-4 h-4 mr-1" /> Download
            </Button>
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
            Preview:
          </p>
          <div
            ref={previewRef}
            style={{
              backgroundColor: '#f4f4f7',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
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
                  <a href="https://turbo-answer.replit.app/login" style={{
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
