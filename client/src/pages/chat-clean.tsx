import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Send, Mic, MicOff, Volume2, Settings, Plus, MessageSquare, FileText, Zap } from 'lucide-react';

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

export default function ChatClean() {
  const [message, setMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState('auto');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const wakeWordRef = useRef<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  // Fetch messages for current conversation
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/conversations', currentConversationId, 'messages'],
    enabled: !!currentConversationId,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/conversations', {}),
    onSuccess: (data) => {
      setCurrentConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { message: string; aiModel: string }) =>
      apiRequest('POST', `/api/conversations/${currentConversationId}/messages`, messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', currentConversationId, 'messages'] 
      });
      setMessage('');
      setIsTyping(false);
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
      setIsTyping(false);
    },
  });

  // Create initial conversation - fixed to prevent multiple calls
  useEffect(() => {
    if (conversations.length === 0 && !createConversationMutation.isPending && !currentConversationId) {
      createConversationMutation.mutate();
    } else if (!currentConversationId && conversations.length > 0) {
      setCurrentConversationId(conversations[conversations.length - 1].id);
    }
  }, [conversations]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentConversationId || sendMessageMutation.isPending) return;

    setIsTyping(true);
    sendMessageMutation.mutate({
      message: message.trim(),
      aiModel: selectedAIModel,
    });
  };

  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
        
        // Auto-send after voice input
        setTimeout(() => {
          if (currentConversationId) {
            setIsTyping(true);
            sendMessageMutation.mutate({
              message: transcript,
              aiModel: selectedAIModel,
            });
          }
        }, 100);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [currentConversationId, selectedAIModel]);

  // Voice functions
  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const newConversation = () => {
    createConversationMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Turbo Answer</h1>
                <p className="text-sm text-slate-400">Maximum Power AI System</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={newConversation}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
            
            <div className="relative group">
              <select
                value={selectedAIModel}
                onChange={(e) => setSelectedAIModel(e.target.value)}
                className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 rounded-lg border border-slate-500 text-white font-medium appearance-none pr-10 transition-all duration-200 shadow-lg"
              >
                <optgroup label="🔥 ULTIMATE POWER" className="bg-slate-900">
                  <option value="mega-fusion">🚀 Mega Fusion AI (20+ Models)</option>
                  <option value="research-pro">📚 Research Pro Ultra</option>
                </optgroup>
                <optgroup label="⚡ SPECIALIZED" className="bg-slate-900">
                  <option value="auto">🤖 Auto-Select</option>
                  <option value="conversational">💬 Conversational AI</option>
                  <option value="emotional">❤️ Emotional AI</option>
                </optgroup>
                <optgroup label="🎯 PREMIUM" className="bg-slate-900">
                  <option value="claude-3-opus">🧠 Claude 3 Opus</option>
                  <option value="gpt-4">🎯 GPT-4</option>
                  <option value="claude-3-sonnet">⚖️ Claude 3 Sonnet</option>
                  <option value="gpt-3.5-turbo">⚡ GPT-3.5 Turbo</option>
                  <option value="gemini-pro">🔬 Gemini Pro</option>
                </optgroup>
              </select>
              
              {/* Custom dropdown arrow */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              
              {/* Status indicator */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
            </div>
            
            <button className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 p-4">
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 ${
                  currentConversationId === conv.id
                    ? 'bg-slate-700 text-white'
                    : 'hover:bg-slate-700/50 text-slate-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="truncate">{conv.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative mx-auto mb-4">
                  <img 
                    src="/src/assets/turboanswer-logo.png" 
                    alt="TURBOANSWER AI Robot" 
                    className="w-20 h-20 object-contain animate-pulse hover:animate-bounce transition-all duration-300 mx-auto"
                  />
                  <div className="absolute -top-2 -right-2 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Welcome to TURBOANSWER</h2>
                <p className="text-cyan-400 mb-6 font-medium">NEVER STOP INNOVATING</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <h3 className="font-semibold mb-2">Voice Commands</h3>
                    <p className="text-sm text-slate-400">Click the microphone to talk to Turbo</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <h3 className="font-semibold mb-2">Document Analysis</h3>
                    <p className="text-sm text-slate-400">Upload files for AI analysis</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <h3 className="font-semibold mb-2">Multi-AI Models</h3>
                    <p className="text-sm text-slate-400">Choose from 7 powerful AI models</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <h3 className="font-semibold mb-2">Emotional Intelligence</h3>
                    <p className="text-sm text-slate-400">AI that understands your feelings</p>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl px-4 py-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-100'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                          <Zap className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-slate-300">Turbo</span>
                        <button
                          onClick={() => speakText(msg.content)}
                          className="p-1 hover:bg-slate-700 rounded"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-slate-300">Turbo is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-slate-800 border-t border-slate-700 p-6">
            <form onSubmit={handleSubmit} className="flex items-center space-x-4 max-w-4xl mx-auto">
              <label className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer">
                <FileText className="w-5 h-5" />
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.pdf,.doc,.docx,.md"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('analysisType', 'comprehensive');
                      
                      try {
                        const response = await fetch('/api/analyze-document', {
                          method: 'POST',
                          body: formData,
                        });
                        const result = await response.json();
                        setMessage(result.analysis);
                      } catch (error) {
                        toast({
                          title: "Error uploading file",
                          description: "Please try again",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                />
              </label>
              
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`p-3 rounded-lg ${
                  isListening 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <button
                type="submit"
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>Send</span>
              </button>
            </form>
            
            {isListening && (
              <div className="text-center mt-4">
                <div className="inline-flex items-center space-x-2 text-sm text-slate-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Listening...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}