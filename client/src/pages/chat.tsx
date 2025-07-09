import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Settings, History, Send, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, Message } from "@shared/schema";

export default function Chat() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get or create conversation
  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentConversationId, "messages"],
    enabled: !!currentConversationId,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", {
        title: "New Conversation"
      });
      return response.json();
    },
    onSuccess: (conversation: Conversation) => {
      setCurrentConversationId(conversation.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentConversationId) throw new Error("No conversation selected");
      const response = await apiRequest("POST", `/api/conversations/${currentConversationId}/messages`, {
        content
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", currentConversationId, "messages"] 
      });
      setMessageContent("");
      setIsTyping(false);
    },
    onError: (error: any) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  });

  // Initialize conversation on first load
  useEffect(() => {
    if (!currentConversationId && conversations && conversations.length === 0) {
      createConversationMutation.mutate();
    } else if (!currentConversationId && conversations && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [messageContent]);

  const handleSendMessage = async () => {
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

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-lg">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-violet-500 rounded-full flex items-center justify-center">
              <Bot className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">AI Knowledge Assistant</h1>
              <p className="text-sm text-gray-500">Always ready to help</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-gray-600">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-gray-600">
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-4 py-6 sm:px-6">
          {messages.length === 0 && !isTyping && (
            <div className="flex items-start space-x-3 mb-8">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="text-white text-sm" />
              </div>
              <div className="flex-1">
                <Card className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100">
                  <p className="text-gray-800 leading-relaxed">
                    Hello! I'm your AI knowledge assistant. I have access to a vast amount of information and I'm here to help you with questions, explanations, research, problem-solving, and much more. What would you like to know today?
                  </p>
                </Card>
                <div className="text-xs text-gray-500 mt-2 ml-1">
                  Just now
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex items-start space-x-3 mb-6 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="text-white text-sm" />
                </div>
              )}
              
              <div className={`flex-1 ${message.role === 'user' ? 'max-w-xs sm:max-w-md' : ''}`}>
                <Card className={`px-4 py-3 shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-brand-500 text-white rounded-2xl rounded-tr-md' 
                    : 'bg-white rounded-2xl rounded-tl-md border border-gray-100'
                }`}>
                  <p className={`leading-relaxed ${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                    {message.content}
                  </p>
                </Card>
                <div className={`text-xs text-gray-500 mt-2 ${message.role === 'user' ? 'mr-1 text-right' : 'ml-1'}`}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="text-gray-600 text-sm" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="text-white text-sm" />
              </div>
              <div className="flex-1">
                <Card className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    <span className="text-gray-500 text-sm">AI is thinking...</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 sm:px-6">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="w-full px-4 py-3 pr-12 text-gray-800 placeholder-gray-500 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 min-h-[48px]"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || sendMessageMutation.isPending}
                className="absolute right-2 bottom-2 w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center hover:bg-brand-600 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Input Helper Text */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span><span className="mr-1">ℹ️</span>Press Enter to send</span>
            <span><span className="mr-1">🛡️</span>Secure & Private</span>
          </div>
          <div className="text-xs text-gray-400">
            {messageContent.length}/2000
          </div>
        </div>
      </div>
    </div>
  );
}
