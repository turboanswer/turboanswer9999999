import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send, Bot, User, FileText, X, Settings, LogOut, Camera,
  Globe, Zap, Crown, Calculator, Code, BookOpen, Palette, Sparkles
} from "lucide-react";
import { Link } from "wouter";
import turboLogo from "@assets/file_00000000d40c61f9a186294bbf2c842a_1752427622475.png";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import CameraCapture from "@/components/CameraCapture";
import LanguageSelector from "@/components/LanguageSelector";
import LiveCameraFeed from "@/components/LiveCameraFeed";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Conversation, Message } from "@shared/schema";

export default function Chat() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [selectedServer, setSelectedServer] = useState("auto");
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const userData = localStorage.getItem('turbo_user');
    if (userData) {
      try { setUser(JSON.parse(userData)); } catch (e) { localStorage.removeItem('turbo_user'); }
    }
    const savedLang = localStorage.getItem('turbo_language');
    if (savedLang) setCurrentLanguage(savedLang);
  }, []);

  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    localStorage.setItem('turbo_language', lang);
  };

  const handleLogout = () => {
    localStorage.removeItem('turbo_user');
    setUser(null);
    toast({ title: "Logged Out", description: "You have been successfully logged out" });
  };

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentConversationId, "messages"],
    enabled: !!currentConversationId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", { title: "New Conversation" });
      return response.json();
    },
    onSuccess: (conversation: Conversation) => {
      setCurrentConversationId(conversation.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentConversationId) throw new Error("No conversation selected");
      const response = await apiRequest("POST", `/api/conversations/${currentConversationId}/messages`, {
        content,
        selectedModel: selectedServer,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", currentConversationId, "messages"] });
      setMessageContent("");
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (!currentConversationId && conversations.length === 0) {
      createConversationMutation.mutate();
    } else if (!currentConversationId && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px';
    }
  }, [messageContent]);

  const handleSendMessage = () => {
    if (!messageContent.trim() || sendMessageMutation.isPending) return;
    setIsTyping(true);
    sendMessageMutation.mutate(messageContent.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMarkdown = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).split('\n');
        const lang = lines[0]?.trim() || '';
        const code = lines.slice(lang ? 1 : 0).join('\n').trim();
        return (
          <div key={i} className="my-3 rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
            {lang && <div className="px-3 py-1 text-xs text-gray-400 bg-gray-800 border-b border-gray-700">{lang}</div>}
            <pre className="p-3 overflow-x-auto text-sm"><code className="text-green-300">{code}</code></pre>
          </div>
        );
      }
      const formatted = part
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-1 py-0.5 rounded text-sm text-green-300">$1</code>');
      return <span key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-black fixed inset-0">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 px-3 sm:px-4 py-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <img src={turboLogo} alt="Turbo Answer" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white">Turbo Answer</h1>
              <p className="text-[10px] sm:text-xs text-gray-400">Never Stop Innovating</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-3">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span className="text-xs text-gray-400 hidden sm:block">AI:</span>
              <Select value={selectedServer} onValueChange={setSelectedServer}>
                <SelectTrigger className="w-20 sm:w-24 h-8 bg-gray-900 border-gray-700 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="math">Math</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="knowledge">Knowledge</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-yellow-400 hover:text-yellow-300" title="Premium">
                <Crown className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/ai-settings">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white" title="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>

            {user ? (
              <Button onClick={handleLogout} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-400" title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm text-blue-400 hover:text-white px-2">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Quick Action Bar */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-3 sm:px-4 py-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Button
              onClick={() => { setShowDocumentUpload(!showDocumentUpload); setShowCamera(false); setShowLiveCamera(false); }}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${showDocumentUpload ? 'text-blue-400' : 'text-gray-400'} hover:text-white`}
              title="Upload Document"
            >
              <FileText className="h-4 w-4" />
              <span className="text-xs ml-1 hidden sm:inline">Document</span>
            </Button>
            <Button
              onClick={() => { setShowCamera(!showCamera); setShowDocumentUpload(false); setShowLiveCamera(false); }}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${showCamera ? 'text-blue-400' : 'text-gray-400'} hover:text-white`}
              title="Camera"
            >
              <Camera className="h-4 w-4" />
              <span className="text-xs ml-1 hidden sm:inline">Camera</span>
            </Button>
            <Button
              onClick={() => { setShowLiveCamera(!showLiveCamera); setShowDocumentUpload(false); setShowCamera(false); }}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${showLiveCamera ? 'text-red-400' : 'text-gray-400'} hover:text-white`}
              title="Live Camera"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs ml-1 hidden sm:inline">Live</span>
            </Button>
          </div>

          <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} />
        </div>
      </div>

      {/* Document Upload Panel */}
      {showDocumentUpload && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-3 sm:px-6 py-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              Upload Document
            </h3>
            <Button onClick={() => setShowDocumentUpload(false)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400">
              <X className="h-3 w-3" />
            </Button>
          </div>
          <DocumentUpload conversationId={currentConversationId || undefined} onAnalysisComplete={(analysis: any) => {
            if (analysis?.text) setMessageContent(analysis.text);
            setShowDocumentUpload(false);
          }} />
        </div>
      )}

      {/* Camera Panel */}
      {showCamera && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-3 sm:px-6 py-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Camera className="h-4 w-4 text-blue-400" />
              Camera Capture
            </h3>
            <Button onClick={() => setShowCamera(false)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400">
              <X className="h-3 w-3" />
            </Button>
          </div>
          <CameraCapture
            onCapture={(imageData: string) => {
              setMessageContent(`[Camera Photo] Describe what you need help with`);
              setShowCamera(false);
            }}
            onAnalyze={(imageData: string) => {
              setMessageContent(`[Camera Analysis] Analyzing captured image...`);
            }}
            isAnalyzing={false}
            language={currentLanguage}
            onContinuousMode={() => {}}
            continuousMode={false}
          />
        </div>
      )}

      {/* Live Camera Panel */}
      {showLiveCamera && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-3 sm:px-6 py-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-red-400" />
              Live Camera Feed
            </h3>
            <Button onClick={() => setShowLiveCamera(false)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400">
              <X className="h-3 w-3" />
            </Button>
          </div>
          <LiveCameraFeed
            language={currentLanguage}
            onAnalysisResult={(analysis: string) => {
              setMessageContent(analysis);
              setShowLiveCamera(false);
            }}
            voiceEnabled={false}
          />
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {/* Welcome / Empty State */}
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <img src={turboLogo} alt="Turbo Answer" className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-4" />
              <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Welcome to Turbo Answer</h2>
              <p className="text-xs sm:text-sm text-gray-400 mb-6 text-center max-w-md">
                Your self-hosted AI assistant. Ask me anything about math, coding, science, or just chat.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-md">
                {[
                  { text: "Solve a math problem", icon: Calculator, color: "text-green-400" },
                  { text: "Write some code", icon: Code, color: "text-yellow-400" },
                  { text: "Explain a concept", icon: BookOpen, color: "text-purple-400" },
                  { text: "Help me brainstorm", icon: Palette, color: "text-pink-400" },
                ].map(({ text, icon: Icon, color }) => (
                  <button
                    key={text}
                    onClick={() => setMessageContent(text)}
                    className="flex items-center gap-2 p-3 bg-gray-900 hover:bg-gray-800 rounded-xl text-xs sm:text-sm text-gray-300 text-left border border-gray-800"
                  >
                    <Icon className={`h-4 w-4 ${color} flex-shrink-0`} />
                    <span>{text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div key={message.id} className="mb-4 sm:mb-6">
              <div className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[80%]`}>
                  <div className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-gray-900 text-gray-200 border border-gray-800'
                  }`}>
                    {message.role === 'assistant' ? renderMarkdown(message.content) : message.content}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-300" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-black border-t border-gray-800 p-3 sm:p-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-12 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[44px] max-h-32 text-sm"
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || sendMessageMutation.isPending}
              className="absolute right-2 bottom-2 h-8 w-8 p-0 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-1.5 text-[10px] sm:text-xs text-gray-500">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full"></div>
                <span>AI Ready</span>
              </span>
              <span className="hidden sm:inline">Press Enter to send</span>
            </div>
            <span>{messageContent.length}/2000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
