import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Heart, Shield, Phone, ArrowLeft, Trash2, Plus, Lock, MessageCircleHeart, AlertTriangle, HandHeart } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";

interface CrisisConversation {
  id: number;
  userId: string;
  createdAt: string;
}

interface CrisisMessage {
  id: number;
  conversationId: number;
  content: string;
  role: string;
  timestamp: string;
}

export default function CrisisSupport() {
  const [hasAccepted, setHasAccepted] = useState(() => sessionStorage.getItem('crisis_accepted') === 'true');
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentLanguage] = useState(() => localStorage.getItem('turbo_language') || 'en');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { user } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isDark = theme === "dark";

  const { data: conversations } = useQuery<CrisisConversation[]>({
    queryKey: ["/api/crisis/conversations"],
  });

  const { data: messages = [] } = useQuery<CrisisMessage[]>({
    queryKey: ["/api/crisis/conversations", currentConversationId, "messages"],
    enabled: !!currentConversationId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/crisis/conversations", {});
      return response.json();
    },
    onSuccess: (conv: CrisisConversation) => {
      setCurrentConversationId(conv.id);
      queryClient.invalidateQueries({ queryKey: ["/api/crisis/conversations"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentConversationId) throw new Error("No conversation");
      const response = await apiRequest("POST", `/api/crisis/conversations/${currentConversationId}/messages`, {
        content,
        language: currentLanguage,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crisis/conversations", currentConversationId, "messages"] });
      setMessageContent("");
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
      toast({ title: "Connection Issue", description: "If you need immediate help, call or text 988.", variant: "destructive" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/crisis/conversations/${id}`);
    },
    onSuccess: () => {
      setCurrentConversationId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/crisis/conversations"] });
      toast({ title: "Deleted", description: "Conversation permanently removed" });
    },
  });

  const deleteAllDataMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/crisis/all-data");
    },
    onSuccess: () => {
      setCurrentConversationId(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/crisis/conversations"] });
      toast({ title: "All Data Deleted", description: "All crisis support conversations permanently removed" });
    },
  });

  useEffect(() => {
    if (!currentConversationId && conversations && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [messageContent]);

  const handleSendMessage = () => {
    if (!messageContent.trim() || sendMessageMutation.isPending) return;
    setIsTyping(true);
    sendMessageMutation.mutate(messageContent.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleAccept = () => {
    sessionStorage.setItem('crisis_accepted', 'true');
    setHasAccepted(true);
  };

  if (!hasAccepted) {
    return (
      <div className={`flex flex-col h-screen items-center justify-center px-4 ${isDark ? 'bg-gradient-to-b from-slate-950 via-indigo-950/30 to-slate-950' : 'bg-gradient-to-b from-blue-50 via-indigo-50 to-white'}`}>
        <div className={`max-w-lg w-full rounded-2xl p-8 ${isDark ? 'bg-slate-900/90 border border-indigo-800/30' : 'bg-white border border-indigo-200 shadow-lg'}`}>
          <div className="flex flex-col items-center mb-6">
            <div className={`p-4 rounded-full mb-4 ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-100'}`}>
              <HandHeart className={`h-10 w-10 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>Crisis Support Mode</h1>
            <p className={`text-sm ${isDark ? 'text-indigo-400/70' : 'text-indigo-500'}`}>A safe space for when you need it most</p>
          </div>

          <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-indigo-950/40 border border-indigo-800/20' : 'bg-indigo-50 border border-indigo-100'}`}>
            <h2 className={`text-sm font-semibold mb-3 ${isDark ? 'text-indigo-200' : 'text-indigo-700'}`}>What This Is For:</h2>
            <ul className={`text-sm space-y-2 ${isDark ? 'text-indigo-300/80' : 'text-indigo-600'}`}>
              <li className="flex items-start gap-2"><Heart className="h-4 w-4 mt-0.5 shrink-0 text-pink-400" /> Mental health support & emotional crisis</li>
              <li className="flex items-start gap-2"><Heart className="h-4 w-4 mt-0.5 shrink-0 text-pink-400" /> Anxiety, depression, stress, and burnout</li>
              <li className="flex items-start gap-2"><Heart className="h-4 w-4 mt-0.5 shrink-0 text-pink-400" /> Grief, loneliness, relationship struggles</li>
              <li className="flex items-start gap-2"><Heart className="h-4 w-4 mt-0.5 shrink-0 text-pink-400" /> Self-harm prevention & safety planning</li>
              <li className="flex items-start gap-2"><Heart className="h-4 w-4 mt-0.5 shrink-0 text-pink-400" /> Trauma, substance concerns, self-esteem</li>
            </ul>
          </div>

          <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-red-950/20 border border-red-800/20' : 'bg-red-50 border border-red-100'}`}>
            <h2 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
              <AlertTriangle className="h-4 w-4" /> Not For:
            </h2>
            <p className={`text-sm ${isDark ? 'text-red-300/70' : 'text-red-600'}`}>
              Math, homework, coding, trivia, general questions, or anything unrelated to emotional wellbeing. Use the main TurboAnswer chat for those topics.
            </p>
          </div>

          <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-green-950/20 border border-green-800/20' : 'bg-green-50 border border-green-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              <span className={`text-sm font-semibold ${isDark ? 'text-green-300' : 'text-green-700'}`}>Privacy & Encryption</span>
            </div>
            <p className={`text-xs ${isDark ? 'text-green-300/70' : 'text-green-600'}`}>
              All conversations are encrypted with AES-256-GCM military-grade encryption. No one can read your messages - not admins, not authorities, not anyone. You can permanently delete all your data at any time.
            </p>
          </div>

          <div className={`text-center text-xs mb-5 p-3 rounded-lg ${isDark ? 'bg-amber-950/20 border border-amber-800/20 text-amber-300/70' : 'bg-amber-50 border border-amber-100 text-amber-700'}`}>
            <Phone className="h-3 w-3 inline mr-1" />
            If you are in immediate danger, please call <strong>911</strong> or <strong>988</strong> (Suicide & Crisis Lifeline)
          </div>

          <div className="flex gap-3">
            <Link href="/chat" className="flex-1">
              <Button variant="outline" className={`w-full ${isDark ? 'border-indigo-700 text-indigo-300' : 'border-indigo-200 text-indigo-600'}`}>
                Go Back
              </Button>
            </Link>
            <Button onClick={handleAccept} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
              I Understand, Enter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isDark ? 'bg-gradient-to-b from-slate-950 via-indigo-950/30 to-slate-950' : 'bg-gradient-to-b from-blue-50 via-indigo-50 to-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'bg-slate-900/80 border-indigo-900/30' : 'bg-white/80 border-indigo-200/50'} backdrop-blur-sm`}>
        <div className="flex items-center gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="icon" className={`${isDark ? 'text-indigo-300 hover:bg-indigo-900/30' : 'text-indigo-600 hover:bg-indigo-100'}`}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
              <MessageCircleHeart className={`h-5 w-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <h1 className={`text-lg font-semibold ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>Crisis Support</h1>
              <p className={`text-xs ${isDark ? 'text-indigo-400/70' : 'text-indigo-500'}`}>
                <Lock className="h-3 w-3 inline mr-1" />AES-256 Encrypted & Private
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => createConversationMutation.mutate()}
            className={`${isDark ? 'text-indigo-300 hover:bg-indigo-900/30' : 'text-indigo-600 hover:bg-indigo-100'}`}
            title="New conversation"
          >
            <Plus className="h-5 w-5" />
          </Button>
          {currentConversationId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteConversationMutation.mutate(currentConversationId)}
              className={`${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-100'}`}
              title="Delete this conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Crisis Resources Banner */}
      <div className={`px-4 py-2 text-center text-xs border-b ${isDark ? 'bg-indigo-950/40 border-indigo-900/20 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
        <Phone className="h-3 w-3 inline mr-1" />
        <span className="font-medium">988 Suicide & Crisis Lifeline</span> (call/text 988) &bull; <span className="font-medium">Crisis Text Line</span> (text HOME to 741741) &bull; <span className="font-medium">Emergency</span>: 911
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className={`p-6 rounded-full mb-6 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
              <Heart className={`h-12 w-12 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
            </div>
            <h2 className={`text-2xl font-semibold mb-3 ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>
              You're Not Alone
            </h2>
            <p className={`text-sm max-w-md mb-6 leading-relaxed ${isDark ? 'text-indigo-300/80' : 'text-indigo-600'}`}>
              This is a safe, private space. Everything you share here is encrypted with AES-256 military-grade encryption. 
              No one can read your conversations - not administrators, not authorities, not anyone.
            </p>
            <div className={`rounded-xl p-4 max-w-sm w-full mb-4 ${isDark ? 'bg-indigo-900/20 border border-indigo-800/30' : 'bg-indigo-50 border border-indigo-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-indigo-200' : 'text-indigo-700'}`}>Privacy Guarantee</span>
              </div>
              <ul className={`text-xs space-y-1 ${isDark ? 'text-indigo-300/70' : 'text-indigo-500'}`}>
                <li>&#10003; AES-256-GCM encryption on all messages</li>
                <li>&#10003; No content moderation on crisis chats</li>
                <li>&#10003; No data shared with any third party</li>
                <li>&#10003; Delete your data anytime, permanently</li>
              </ul>
            </div>
            <p className={`text-xs ${isDark ? 'text-indigo-400/60' : 'text-indigo-400'}`}>
              Type anything to start talking. I'm here for you.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? isDark
                  ? 'bg-indigo-600/80 text-white'
                  : 'bg-indigo-500 text-white'
                : isDark
                  ? 'bg-slate-800/80 text-indigo-100 border border-indigo-800/30'
                  : 'bg-white text-gray-800 border border-indigo-100 shadow-sm'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Heart className={`h-3.5 w-3.5 ${isDark ? 'text-pink-400' : 'text-pink-500'}`} />
                  <span className={`text-xs font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>Turbo Crisis Support</span>
                </div>
              )}
              <span style={{ whiteSpace: 'pre-wrap' }} className="text-sm leading-relaxed">{msg.content}</span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-800/80 border border-indigo-800/30' : 'bg-white border border-indigo-100 shadow-sm'}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Heart className={`h-3.5 w-3.5 ${isDark ? 'text-pink-400' : 'text-pink-500'} animate-pulse`} />
                <span className={`text-xs font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>Turbo Crisis Support</span>
              </div>
              <div className="flex gap-1.5 py-1">
                <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`} style={{ animationDelay: '0ms' }} />
                <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`} style={{ animationDelay: '150ms' }} />
                <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`} style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`border-t px-4 py-3 ${isDark ? 'bg-slate-900/80 border-indigo-900/30' : 'bg-white/90 border-indigo-100'}`}>
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share what's on your mind... Everything here is private and encrypted."
            className={`flex-1 resize-none min-h-[44px] max-h-[150px] rounded-xl border-2 ${
              isDark
                ? 'bg-slate-800/50 border-indigo-800/40 text-indigo-100 placeholder:text-indigo-400/50 focus:border-indigo-600'
                : 'bg-white border-indigo-200 text-gray-800 placeholder:text-indigo-400 focus:border-indigo-400'
            }`}
            rows={1}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageContent.trim() || sendMessageMutation.isPending}
            className={`rounded-xl h-11 w-11 p-0 ${
              isDark
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
            }`}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between max-w-3xl mx-auto mt-2">
          <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-indigo-400/50' : 'text-indigo-300'}`}>
            <Lock className="h-3 w-3" />
            <span>End-to-end encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            {conversations && conversations.length > 1 && (
              <select
                value={currentConversationId || ''}
                onChange={(e) => setCurrentConversationId(Number(e.target.value))}
                className={`text-xs rounded px-2 py-1 ${isDark ? 'bg-slate-800 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-600 border-indigo-200'} border`}
              >
                {conversations.map((conv, i) => (
                  <option key={conv.id} value={conv.id}>
                    Session {conversations.length - i}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className={`text-xs ${isDark ? 'text-red-400/60 hover:text-red-400' : 'text-red-400 hover:text-red-500'}`}
            >
              Delete All Data
            </button>
          </div>
        </div>
      </div>

      {/* Delete All Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 max-w-sm w-full ${isDark ? 'bg-slate-900 border border-indigo-800/30' : 'bg-white border border-indigo-200'}`}>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>Delete All Crisis Data?</h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-indigo-300/70' : 'text-indigo-600'}`}>
              This will permanently delete all your crisis support conversations. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => deleteAllDataMutation.mutate()}
                disabled={deleteAllDataMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteAllDataMutation.isPending ? "Deleting..." : "Delete Everything"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
