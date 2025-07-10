import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Mic, MicOff, Volume2, FileText, X, Brain, Settings, LogOut, Camera, Globe } from "lucide-react";
import { Link } from "wouter";
import { TurboLogo } from "@/components/TurboLogo";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import CameraCapture from "@/components/CameraCapture";
import LanguageSelector from "@/components/LanguageSelector";
import ContinuousConversation from "@/components/ContinuousConversation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Conversation, Message } from "@shared/schema";

export default function Chat() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState("auto");
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for user authentication and handle loading
  useEffect(() => {
    const userData = localStorage.getItem('turbo_user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        localStorage.removeItem('turbo_user');
      }
    }
    
    // Load saved language preference
    const savedLanguage = localStorage.getItem('turbo_language');
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    }
    
    // Load voice settings
    const voiceSettings = localStorage.getItem('turbo_voice_settings');
    if (voiceSettings) {
      try {
        const settings = JSON.parse(voiceSettings);
        setVoiceEnabled(settings.voiceEnabled || false);
        setWakeWordEnabled(settings.wakeWordEnabled || false);
      } catch (e) {
        console.error('Failed to load voice settings:', e);
      }
    }
    
    // Show loading screen for 2 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('turbo_user');
    setUser(null);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  };

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
        content,
        selectedModel: selectedAIModel,
        language: currentLanguage // Include language support
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", currentConversationId, "messages"] 
      });
      setMessageContent("");
      setIsTyping(false);
      
      // Automatically speak the AI response for conversational models
      if (data.aiMessage && data.aiMessage.content) {
        console.log('🤖 AI Response received, selected model:', selectedAIModel);
        console.log('🤖 Response content:', data.aiMessage.content.substring(0, 100) + '...');
        
        // Auto-speak for conversational and emotional AI models
        if (selectedAIModel === 'conversational' || selectedAIModel === 'emotional') {
          console.log('🗣️ Auto-speaking enabled for', selectedAIModel);
          setTimeout(() => {
            speakResponse(data.aiMessage.content);
          }, 800); // Longer delay to ensure message is fully rendered
        } else {
          console.log('🗣️ Auto-speak disabled for model:', selectedAIModel);
        }
      }
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

  // Initialize speech recognition
  useEffect(() => {
    const initializeSpeechRecognition = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsRecognitionSupported(true);
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsListening(true);
        };
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            setMessageContent(finalTranscript.trim());
          } else if (interimTranscript) {
            setMessageContent(interimTranscript.trim());
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access to use voice commands",
              variant: "destructive",
            });
          } else if (event.error === 'no-speech') {
            toast({
              title: "No Speech Detected",
              description: "Please try speaking again",
              variant: "destructive",
            });
          }
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      } else {
        setIsRecognitionSupported(false);
      }
    };
    
    initializeSpeechRecognition();
  }, [toast]);

  const handleSendMessage = async () => {
    if (!messageContent.trim() || sendMessageMutation.isPending) return;

    setIsTyping(true);
    sendMessageMutation.mutate(messageContent.trim());
  }

  const handleDocumentAnalysis = (analysis: any) => {
    // Add the analysis result as a message in the current conversation
    if (currentConversationId && analysis) {
      const analysisMessage = `📄 **Document Analysis: ${analysis.filename}**\n\n**Analysis Type:** ${analysis.analysisType}\n\n**Result:**\n${analysis.analysis}`;
      
      // Send the analysis as a regular message
      sendMessageMutation.mutate(analysisMessage);
      setShowDocumentUpload(false);
    }
  };;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        toast({
          title: "Voice Command Error",
          description: "Unable to start voice recognition. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      console.log('🗣️ Speaking:', text.substring(0, 50) + '...');
      
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => {
        console.log('🗣️ Speech started');
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        console.log('🗣️ Speech ended');
        setIsSpeaking(false);
      };
      utterance.onerror = (error) => {
        console.error('🗣️ Speech error:', error);
        setIsSpeaking(false);
      };
      
      // Try to use a more natural voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.includes('en') && 
        (voice.name.includes('Natural') || voice.name.includes('Enhanced') || voice.name.includes('Premium'))
      ) || voices.find(voice => voice.lang.includes('en'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
        console.log('🗣️ Using voice:', englishVoice.name);
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.log('🗣️ Speech synthesis not supported');
    }
  };

  // Auto-speak AI responses for conversational models
  const autoSpeakResponse = (text: string) => {
    if (selectedAIModel === 'conversational' || selectedAIModel === 'emotional') {
      setTimeout(() => {
        speakResponse(text);
      }, 500); // Small delay to ensure message is displayed first
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Language change handler
  const handleLanguageChange = (languageCode: string) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem('turbo_language', languageCode);
    toast({
      title: "Language Changed",
      description: `Switched to ${languageCode.toUpperCase()}`,
    });
  };

  // Voice settings handlers
  const handleToggleVoice = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    const settings = { voiceEnabled: enabled, wakeWordEnabled };
    localStorage.setItem('turbo_voice_settings', JSON.stringify(settings));
  };

  const handleToggleWakeWord = (enabled: boolean) => {
    setWakeWordEnabled(enabled);
    const settings = { voiceEnabled, wakeWordEnabled: enabled };
    localStorage.setItem('turbo_voice_settings', JSON.stringify(settings));
  };

  // Camera analysis handlers
  const handleCameraCapture = (imageData: string) => {
    console.log('Camera captured image');
  };

  const handleImageAnalysis = async (imageData: string) => {
    try {
      const response = await apiRequest("POST", "/api/analyze-image", {
        imageData,
        query: "What do you see in this image?"
      });
      const analysis = await response.json();
      
      if (analysis.description) {
        // Send the analysis as a message
        sendMessageMutation.mutate(`📸 **Camera Analysis**: ${analysis.description}`);
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      toast({
        title: "Camera Analysis Failed",
        description: "Unable to analyze the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Speech input handler for continuous conversation
  const handleSpeechInput = (text: string) => {
    setMessageContent(text);
    if (text.trim()) {
      handleSendMessage();
    }
  };

  // Speech output handler
  const handleSpeechOutput = (text: string) => {
    speakResponse(text);
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

  // Show loading screen on app start
  if (isLoading) {
    return <LoadingScreen message="Activating Maximum Power AI System..." />;
  }

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto bg-black shadow-2xl">
      {/* Enhanced Header with Integrated Controls */}
      <header className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 sm:px-6 relative z-40 shrink-0">
        <div className="flex flex-col space-y-4">
          {/* Top Row: Logo and User Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <TurboLogo size={60} />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wide">TURBO ANSWER</h1>
                <p className="text-sm text-purple-300 font-medium">Maximum Power AI System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* User Authentication */}
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400">Welcome, {user.username}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="p-2 text-zinc-400 hover:text-red-400"
                  >
                    <LogOut size={16} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                      Create Account
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Second Row: AI Controls Always Visible */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Document Upload & Camera Section */}
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setShowDocumentUpload(!showDocumentUpload)}
                  variant={showDocumentUpload ? "default" : "outline"}
                  size="sm"
                  className={showDocumentUpload ? 
                    "bg-purple-600 hover:bg-purple-700 text-white" : 
                    "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                  }
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Doc
                </Button>
                <Button
                  onClick={() => setShowCamera(!showCamera)}
                  variant={showCamera ? "default" : "outline"}
                  size="sm"
                  className={showCamera ? 
                    "bg-purple-600 hover:bg-purple-700 text-white" : 
                    "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                  }
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
                {(showDocumentUpload || showCamera) && (
                  <div className="text-xs text-purple-300">• Active</div>
                )}
              </div>

              {/* Language & Voice Controls */}
              <div className="flex items-center space-x-2">
                <LanguageSelector 
                  currentLanguage={currentLanguage} 
                  onLanguageChange={handleLanguageChange} 
                />
                <Button
                  onClick={() => setContinuousMode(!continuousMode)}
                  variant={continuousMode ? "default" : "outline"}
                  size="sm"
                  className={continuousMode ? 
                    "bg-green-600 hover:bg-green-700 text-white" : 
                    "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                  }
                  title="Continuous conversation mode"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Live Chat
                </Button>
              </div>

              {/* AI Model Selection */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-zinc-300 font-medium">AI Model:</label>
                <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                  <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-white text-sm">
                    <SelectValue placeholder="Choose AI model" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="auto">🤖 Auto-Select</SelectItem>
                    <SelectItem value="research-pro">📚 Research Pro Ultra (Premium)</SelectItem>
                    <SelectItem value="conversational">💬 Conversational AI</SelectItem>
                    <SelectItem value="emotional">❤️ Emotional AI</SelectItem>
                    <SelectItem value="claude-3-opus">🧠 Claude 3 Opus</SelectItem>
                    <SelectItem value="gpt-4">🎯 GPT-4</SelectItem>
                    <SelectItem value="claude-3-sonnet">⚖️ Claude 3 Sonnet</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">⚡ GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="gemini-pro">🔬 Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Current AI Status */}
            <div className="flex items-center space-x-2 text-xs text-zinc-400">
              <Brain className="h-3 w-3" />
              <span>Current: {selectedAIModel === 'auto' ? 'Auto-Select' : selectedAIModel}</span>
              <div className="w-2 h-2 bg-green-400 rounded-full" title="AI System Online"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Document Upload Panel */}
      {showDocumentUpload && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 sm:px-6 relative z-30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Document Analysis</h3>
            <Button
              onClick={() => setShowDocumentUpload(false)}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DocumentUpload 
            conversationId={currentConversationId} 
            onAnalysisComplete={handleDocumentAnalysis}
          />
        </div>
      )}

      {/* Camera Panel */}
      {showCamera && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 sm:px-6 relative z-30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Camera Analysis</h3>
            <Button
              onClick={() => setShowCamera(false)}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CameraCapture 
            onCapture={handleCameraCapture}
            onAnalysis={handleImageAnalysis}
          />
        </div>
      )}

      {/* Continuous Conversation Panel */}
      {continuousMode && (
        <div className="bg-gradient-to-r from-green-950 to-green-900 border-b border-green-800 px-4 py-4 sm:px-6 relative z-30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <Globe className="h-5 w-5 mr-2 text-green-400" />
              Live Conversation Mode - Speak naturally!
            </h3>
            <Button
              onClick={() => setContinuousMode(false)}
              variant="ghost"
              size="sm"
              className="text-green-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ContinuousConversation
            onSpeechInput={handleSpeechInput}
            onSpeechOutput={handleSpeechOutput}
            isListening={isListening}
            isSpeaking={isSpeaking}
            language={currentLanguage}
            onToggleListening={() => setIsListening(!isListening)}
            onToggleSpeaking={() => setIsSpeaking(!isSpeaking)}
            onToggleWakeWord={handleToggleWakeWord}
            wakeWordEnabled={wakeWordEnabled}
            voiceEnabled={voiceEnabled}
            onToggleVoice={handleToggleVoice}
          />
        </div>
      )}



      {/* Messages - Stable container */}
      <div className="flex-1 overflow-y-auto bg-zinc-900 relative z-10">
        <div className="px-4 py-6 sm:px-6">
          {messages.length === 0 && !isTyping && (
            <div className="flex items-start space-x-3 mb-8">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                <Bot className="text-white text-sm" />
              </div>
              <div className="flex-1">
                <Card className="bg-zinc-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-xl border border-zinc-700">
                  <p className="text-zinc-100 leading-relaxed">
                    🚀 Welcome to <strong>TURBO ANSWER</strong> - The Ultimate AI Assistant! I can have natural conversations, understand your emotions, and talk back to you like a real person. Choose "Conversational AI" for natural chat or "Emotional AI" for deep emotional support. Ready to experience ultimate AI power?
                  </p>
                  <div className="mt-3 flex items-center space-x-2 text-xs text-zinc-400">
                    <Brain className="h-3 w-3" />
                    <span>AI Model: {selectedAIModel === 'auto' ? 'Auto-Select (Intelligent Routing)' : selectedAIModel}</span>
                  </div>
                </Card>
                <div className="text-xs text-zinc-500 mt-2 ml-1">
                  Just now
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex items-start space-x-3 mb-6 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                  <Bot className="text-white text-sm" />
                </div>
              )}
              
              <div className={`flex-1 ${message.role === 'user' ? 'max-w-xs sm:max-w-md' : ''}`}>
                <Card className={`px-4 py-3 shadow-xl relative group ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-2xl rounded-tr-md' 
                    : 'bg-zinc-800 rounded-2xl rounded-tl-md border border-zinc-700'
                }`}>
                  <p className={`leading-relaxed ${message.role === 'user' ? 'text-white' : 'text-zinc-100'}`}>
                    {message.content}
                  </p>
                  {message.role === 'assistant' && 'speechSynthesis' in window && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 w-6 h-6 p-0 text-zinc-400 hover:text-purple-400"
                      onClick={() => speakResponse(message.content)}
                      title="Read aloud"
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                  )}
                </Card>
                <div className={`text-xs text-zinc-500 mt-2 ${message.role === 'user' ? 'mr-1 text-right' : 'ml-1'}`}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="text-zinc-300 text-sm" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                <Bot className="text-white text-sm" />
              </div>
              <div className="flex-1">
                <Card className="bg-zinc-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-xl border border-zinc-700">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    </div>
                    <span className="text-zinc-400 text-sm">AI is processing...</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Enhanced Input Area - Fixed position */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-t border-purple-800/30 px-6 py-6 relative z-40 shrink-0 shadow-2xl">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask me anything or click the mic to speak..."}
                className={`w-full px-4 py-3 pr-20 text-zinc-100 placeholder-zinc-500 bg-zinc-900 border border-zinc-700 rounded-2xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[48px] ${isListening ? 'ring-2 ring-red-400 border-red-400' : ''}`}
                rows={1}
              />
              {isRecognitionSupported && (
                <Button
                  onClick={isListening ? stopListening : startListening}
                  disabled={sendMessageMutation.isPending}
                  className={`absolute right-11 bottom-2 w-8 h-8 rounded-full flex items-center justify-center focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed p-0 ${
                    isListening 
                      ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500' 
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 focus:ring-zinc-500'
                  }`}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || sendMessageMutation.isPending}
                className="absolute right-2 bottom-2 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Input Helper Text */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>Press Enter to send</span>
            {isRecognitionSupported && (
              <span>{isListening ? 'Listening for voice...' : 'Voice commands available'}</span>
            )}
            <span>Secure & Private</span>
          </div>
          <div className="text-xs text-gray-400">
            {messageContent.length}/2000
          </div>
        </div>
      </div>
    </div>
  );
}
