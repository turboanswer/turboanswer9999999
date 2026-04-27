import { useState } from "react";
import { ArrowLeft, Mail, Phone, Clock, HelpCircle, Ticket, Send, Loader2, CheckCircle2, MessageCircle, Plus, X } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface SupportTicket {
  id: number;
  subject: string;
  context: string | null;
  status: string;
  priority: string;
  category: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  createdAt: string;
}

interface TicketMessage {
  id: number;
  ticketId: number;
  senderId: string;
  senderName: string | null;
  content: string;
  createdAt: string;
}

const card: React.CSSProperties = {
  backgroundColor: '#111111',
  border: '1px solid #333333',
  borderRadius: '16px',
  padding: '24px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  backgroundColor: '#0a0a0a',
  border: '1px solid #333',
  borderRadius: '8px',
  color: 'white',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#d4d4d8',
  marginBottom: '6px',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 18px',
  backgroundColor: '#7c3aed',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const priorityColor = (p: string) =>
  p === 'urgent' ? '#dc2626' : p === 'high' ? '#ea580c' : p === 'low' ? '#6b7280' : '#3b82f6';

const statusColor = (s: string) =>
  s === 'resolved' ? '#10b981' : s === 'in_progress' ? '#f59e0b' : '#3b82f6';

function formatDate(d: string) {
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

function TicketDetail({ ticketId, onClose }: { ticketId: number; onClose: () => void }) {
  const { toast } = useToast();
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery<{ ticket: SupportTicket; messages: TicketMessage[] }>({
    queryKey: ['/api/general-support/tickets', ticketId],
    refetchInterval: 8000,
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest('POST', `/api/general-support/tickets/${ticketId}/messages`, { content });
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ['/api/general-support/tickets', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['/api/general-support/tickets'] });
    },
    onError: (err: any) => toast({ title: "Couldn't send", description: err?.message || 'Try again', variant: 'destructive' }),
  });

  const resolveMutation = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/general-support/tickets/${ticketId}/resolve`),
    onSuccess: () => {
      toast({ title: "Ticket closed", description: "Thanks for letting us help!" });
      queryClient.invalidateQueries({ queryKey: ['/api/general-support/tickets', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['/api/general-support/tickets'] });
    },
    onError: (err: any) => toast({ title: "Couldn't close", description: err?.message || 'Try again', variant: 'destructive' }),
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={onClose}>
      <div style={{ ...card, maxWidth: 720, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>
            Ticket #{ticketId}
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {isLoading || !data ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 8px' }} />
            Loading…
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'white', marginBottom: 6 }}>{data.ticket.subject}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: 'white', background: statusColor(data.ticket.status) }}>{data.ticket.status.toUpperCase()}</span>
                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: 'white', background: priorityColor(data.ticket.priority) }}>{data.ticket.priority.toUpperCase()}</span>
                {data.ticket.category && <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, color: '#d4d4d8', border: '1px solid #444' }}>{data.ticket.category}</span>}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #2a2a2a', borderBottom: '1px solid #2a2a2a', padding: '12px 0', marginBottom: 12 }}>
              {data.messages.map((m) => (
                <div key={m.id} style={{ marginBottom: 14, padding: 12, background: '#0a0a0a', borderRadius: 8, border: '1px solid #2a2a2a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>{m.senderName || 'User'}</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{formatDate(m.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#e5e7eb', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.content}</div>
                </div>
              ))}
              {data.messages.length === 0 && <div style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>No messages yet.</div>}
            </div>

            {data.ticket.status === 'resolved' ? (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: 12, color: '#6ee7b7', textAlign: 'center', fontSize: 13 }}>
                <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                This ticket is closed. Open a new one if you need more help.
              </div>
            ) : (
              <>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply…"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', marginBottom: 8 }}
                  disabled={replyMutation.isPending}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => resolveMutation.mutate()}
                    disabled={resolveMutation.isPending}
                    style={{ ...btnPrimary, background: 'transparent', color: '#9ca3af', border: '1px solid #444' }}
                  >
                    {resolveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Mark resolved
                  </button>
                  <button
                    onClick={() => reply.trim() && replyMutation.mutate(reply.trim())}
                    disabled={!reply.trim() || replyMutation.isPending}
                    style={{ ...btnPrimary, opacity: !reply.trim() || replyMutation.isPending ? 0.5 : 1 }}
                  >
                    {replyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send reply
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GuestTicketForm() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [submitted, setSubmitted] = useState<number | null>(null);

  const submit = useMutation({
    mutationFn: async () =>
      apiRequest('POST', '/api/general-support/guest-tickets', {
        name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(), category,
      }).then(r => r.json()),
    onSuccess: (data: any) => {
      setSubmitted(data?.ticketId ?? null);
      setName(""); setEmail(""); setSubject(""); setMessage(""); setCategory("general");
      toast({ title: "Ticket submitted!", description: `We'll reply by email shortly.` });
    },
    onError: (err: any) => toast({ title: "Couldn't submit", description: err?.message || 'Try again', variant: 'destructive' }),
  });

  if (submitted !== null) {
    return (
      <div style={{ ...card, textAlign: 'center' }}>
        <CheckCircle2 size={42} color="#10b981" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 8 }}>Ticket #{submitted} received</h3>
        <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 18 }}>
          We'll reply to your email as soon as we can. <br />
          <span style={{ color: '#a78bfa' }}>Sign in</span> next time to track replies right here on this page.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <a href="/api/login" style={{ ...btnPrimary, textDecoration: 'none' }}>Sign in</a>
          <button onClick={() => setSubmitted(null)} style={{ ...btnPrimary, background: 'transparent', border: '1px solid #444', color: '#d4d4d8' }}>
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Ticket size={22} color="#a855f7" />
        <h3 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0 }}>Open a Support Ticket</h3>
      </div>
      <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>
        Anyone can open a ticket — no account required. Want to track replies in your dashboard?{" "}
        <a href="/api/login" style={{ color: '#a78bfa', textDecoration: 'underline' }}>Sign in</a>.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Your name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" maxLength={100} style={inputStyle} disabled={submit.isPending} />
        </div>
        <div>
          <label style={labelStyle}>Your email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={200} style={inputStyle} disabled={submit.isPending} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Subject *</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="A short summary of your issue" maxLength={200} style={inputStyle} disabled={submit.isPending} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} disabled={submit.isPending}>
          <option value="general">General</option>
          <option value="billing">Billing or refund</option>
          <option value="bug">A bug or error</option>
          <option value="account">Account or login</option>
          <option value="feature">Feature request</option>
          <option value="abuse">Report abuse</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>What's going on? *</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe what happened, what you expected, and any error messages…" rows={5} maxLength={5000} style={{ ...inputStyle, resize: 'vertical' }} disabled={submit.isPending} />
        <div style={{ textAlign: 'right', color: '#6b7280', fontSize: 11, marginTop: 4 }}>{message.length} / 5000</div>
      </div>

      <button
        onClick={() => submit.mutate()}
        disabled={!email.trim() || !subject.trim() || !message.trim() || submit.isPending}
        style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: (!email.trim() || !subject.trim() || !message.trim() || submit.isPending) ? 0.5 : 1 }}
      >
        {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        Submit ticket
      </button>
    </div>
  );
}

function TicketWidget() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");

  const { data: tickets = [], isLoading: listLoading } = useQuery<SupportTicket[]>({
    queryKey: ['/api/general-support/tickets'],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/general-support/tickets', { subject: subject.trim(), message: message.trim(), category }),
    onSuccess: () => {
      toast({ title: "Ticket submitted!", description: "We'll get back to you as soon as we can." });
      setSubject(""); setMessage(""); setCategory("general"); setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/general-support/tickets'] });
    },
    onError: (err: any) => toast({ title: "Couldn't submit", description: err?.message || 'Try again', variant: 'destructive' }),
  });

  if (authLoading) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: '#9ca3af', margin: '0 auto' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <GuestTicketForm />;
  }

  return (
    <>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ticket size={22} color="#a855f7" />
            <h3 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0 }}>Support Tickets</h3>
          </div>
          <button onClick={() => setShowForm((s) => !s)} style={btnPrimary}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'New Ticket'}
          </button>
        </div>

        {showForm && (
          <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 18, marginBottom: 18 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="A short summary of your issue"
                maxLength={200}
                style={inputStyle}
                disabled={createMutation.isPending}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} disabled={createMutation.isPending}>
                <option value="general">General</option>
                <option value="billing">Billing or refund</option>
                <option value="bug">A bug or error</option>
                <option value="account">Account or login</option>
                <option value="feature">Feature request</option>
                <option value="abuse">Report abuse</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>What's going on?</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what happened, what you expected, and any error messages…"
                rows={5}
                maxLength={5000}
                style={{ ...inputStyle, resize: 'vertical' }}
                disabled={createMutation.isPending}
              />
              <div style={{ textAlign: 'right', color: '#6b7280', fontSize: 11, marginTop: 4 }}>{message.length} / 5000</div>
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!subject.trim() || !message.trim() || createMutation.isPending}
              style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: (!subject.trim() || !message.trim() || createMutation.isPending) ? 0.5 : 1 }}
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Submit ticket
            </button>
          </div>
        )}

        {listLoading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
            <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: 13 }}>Loading your tickets…</div>
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#6b7280', fontSize: 14 }}>
            <MessageCircle size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            No tickets yet. Click <strong style={{ color: '#a78bfa' }}>New Ticket</strong> to open one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setOpenTicketId(t.id)}
                style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 14, textAlign: 'left', cursor: 'pointer', color: 'white' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'white', flex: 1 }}>
                    <span style={{ color: '#6b7280', fontWeight: 400, marginRight: 6 }}>#{t.id}</span>
                    {t.subject}
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, color: 'white', background: statusColor(t.status), flexShrink: 0 }}>
                    {t.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: '#9ca3af' }}>
                  <span style={{ color: priorityColor(t.priority) }}>● {t.priority}</span>
                  {t.category && <span>· {t.category}</span>}
                  <span>· {formatDate(t.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #2a2a2a', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
          Signed in as <strong style={{ color: '#d4d4d8' }}>{user?.email}</strong>. Replies appear here automatically.
        </div>
      </div>

      {openTicketId !== null && <TicketDetail ticketId={openTicketId} onClose={() => setOpenTicketId(null)} />}
    </>
  );
}

export default function Support() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000000', color: 'white', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingTop: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '14px', cursor: 'pointer', textDecoration: 'none' }}>
              <ArrowLeft size={16} /> Back
            </span>
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '44px', fontWeight: 'bold', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px' }}>
            Customer Support
          </h1>
          <p style={{ fontSize: '18px', color: '#9ca3af' }}>
            We're here to help. Open a ticket, email us, or call.
          </p>
        </div>

        {/* NEW: ticket widget */}
        <div style={{ marginBottom: 32 }}>
          <TicketWidget />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Mail size={28} color="white" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'white' }}>Email Support</h3>
            <p style={{ color: '#9ca3af', marginBottom: '14px', fontSize: '14px' }}>Send us an email and we'll get back to you as soon as possible.</p>
            <a href="mailto:support@turboanswer.it.com" style={{ display: 'inline-block', padding: '10px 18px', backgroundColor: '#2563eb', color: 'white', textDecoration: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600 }}>
              support@turboanswer.it.com
            </a>
          </div>

          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Phone size={28} color="white" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'white' }}>Phone Support</h3>
            <p style={{ color: '#9ca3af', marginBottom: '14px', fontSize: '14px' }}>Call us directly during business hours.</p>
            <a href="tel:+18664677269" style={{ display: 'inline-block', padding: '10px 18px', backgroundColor: '#10b981', color: 'white', textDecoration: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600 }}>
              (866) 467-7269
            </a>
          </div>
        </div>

        <div style={{ ...card, background: '#0f172a', borderColor: '#1e293b', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Clock size={22} color="#60a5fa" style={{ marginRight: '10px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: 0 }}>Support Hours</h3>
          </div>
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px', lineHeight: 1.6 }}>
            <p style={{ margin: '4px 0' }}><strong style={{ color: 'white' }}>Monday – Friday:</strong> 9:30 AM – 6:00 PM EST</p>
            <p style={{ margin: '4px 0' }}><strong style={{ color: 'white' }}>Saturday – Sunday:</strong> Closed</p>
            <p style={{ marginTop: '12px', fontSize: '13px' }}>
              Tickets and email are accepted 24/7 — we'll respond as soon as possible.
            </p>
          </div>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <HelpCircle size={22} color="#a855f7" style={{ marginRight: '10px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: 0 }}>Common Questions</h3>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ padding: '14px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
              <h4 style={{ color: 'white', marginBottom: '6px', fontSize: '15px', fontWeight: 600 }}>How do I upgrade to premium?</h4>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Visit the Pricing page and select your preferred plan. You can also apply promo codes for special offers.</p>
            </div>
            <div style={{ padding: '14px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
              <h4 style={{ color: 'white', marginBottom: '6px', fontSize: '15px', fontWeight: 600 }}>What is the Enterprise plan?</h4>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>The Enterprise plan ($100/month) gives you a special 6-digit code that up to 5 team members can use to get Research-level access — a 33% savings vs. 5 individual Research plans. Need more than 5? Email support@turboanswer.it.com.</p>
            </div>
            <div style={{ padding: '14px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
              <h4 style={{ color: 'white', marginBottom: '6px', fontSize: '15px', fontWeight: 600 }}>Can I cancel my subscription?</h4>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Yes, anytime from your AI Settings page. If you cancel within 3 days you'll get a full automatic refund.</p>
            </div>
            <div style={{ padding: '14px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
              <h4 style={{ color: 'white', marginBottom: '6px', fontSize: '15px', fontWeight: 600 }}>How do I delete my account?</h4>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Go to AI Settings, scroll to the bottom, click "Delete My Account" and confirm. Your subscription is automatically cancelled and all data permanently removed.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
