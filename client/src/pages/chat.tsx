import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Mic, MicOff, Volume2, FileText, X, Brain, Settings, LogOut, Camera, Globe } from "lucide-react";
import { Link } from "wouter";
// Logo integrated directly in component
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import CameraCapture from "@/components/CameraCapture";
import LanguageSelector from "@/components/LanguageSelector";
import ContinuousConversation from "@/components/ContinuousConversation";
import LiveCameraFeed from "@/components/LiveCameraFeed";
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
  const [showLiveCamera, setShowLiveCamera] = useState(false);
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

  // Live camera analysis result handler
  const handleLiveCameraAnalysis = (analysis: string) => {
    // Add the analysis result as a message in the current conversation
    if (currentConversationId && analysis) {
      const analysisMessage = `📹 **Live Camera**: ${analysis}`;
      sendMessageMutation.mutate(analysisMessage);
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
              <div className="relative">
                <img 
                  src="/src/assets/turboanswer-logo.png" 
                  alt="TURBOANSWER AI Robot" 
                  className="w-16 h-16 object-contain animate-pulse hover:animate-bounce transition-all duration-300"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-wide">TURBOANSWER</h1>
                <p className="text-sm text-cyan-400 font-medium">NEVER STOP INNOVATING</p>
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
                <Button
                  onClick={() => setShowLiveCamera(!showLiveCamera)}
                  variant={showLiveCamera ? "default" : "outline"}
                  size="sm"
                  className={showLiveCamera ? 
                    "bg-red-600 hover:bg-red-700 text-white" : 
                    "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                  }
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Live Feed
                </Button>
                {(showDocumentUpload || showCamera || showLiveCamera) && (
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

              {/* AI Brain Selector - Enhanced Creative Design */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Brain className="h-5 w-5 text-cyan-400 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                  </div>
                  <label className="text-sm text-cyan-300 font-medium bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    AI Brain:
                  </label>
                </div>
                
                <div className="relative group">
                  <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                    <SelectTrigger className="w-64 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-600 text-white text-sm hover:border-cyan-500 transition-all duration-300 shadow-lg hover:shadow-cyan-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
                        <SelectValue placeholder="🧠 Select Intelligence Level" />
                        <div className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </SelectTrigger>
                    
                    <SelectContent className="bg-zinc-950 border border-zinc-700 shadow-2xl max-h-80 overflow-y-auto">
                      {/* Ultimate Power Tier */}
                      <div className="p-3 border-b border-zinc-800 bg-gradient-to-r from-amber-950/30 to-red-950/30">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                          </div>
                          <span className="text-xs font-bold text-amber-400 tracking-wide">🔥 ULTIMATE POWER</span>
                        </div>
                        
                        <SelectItem value="mega-fusion" className="bg-gradient-to-r from-amber-900/40 to-red-900/40 border border-amber-600/30 mb-2 hover:from-amber-800/50 hover:to-red-800/50">
                          <div className="flex items-center space-x-3 p-1">
                            <div className="relative">
                              <span className="text-2xl animate-bounce">🚀</span>
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-amber-100 text-sm">Mega Fusion AI</div>
                              <div className="text-xs text-amber-300">20+ Models • Ultimate Intelligence</div>
                              <div className="flex items-center space-x-1 mt-1">
                                <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
                                <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                                <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                                <span className="text-xs text-amber-400 ml-1">MAX POWER</span>
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        
                        <SelectItem value="research-pro" className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-600/30 hover:from-purple-800/50 hover:to-blue-800/50">
                          <div className="flex items-center space-x-3 p-1">
                            <span className="text-xl text-purple-400">📚</span>
                            <div className="flex-1">
                              <div className="font-bold text-purple-100 text-sm">Research Pro Ultra</div>
                              <div className="text-xs text-purple-300">Premium • Deep Analysis</div>
                            </div>
                            <div className="px-2 py-1 bg-purple-600/30 rounded-full text-xs text-purple-200">PRO</div>
                          </div>
                        </SelectItem>
                      </div>
                      
                      {/* Specialized Tier */}
                      <div className="p-3 border-b border-zinc-800">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-cyan-400 tracking-wide">⚡ SPECIALIZED</span>
                        </div>
                        
                        <SelectItem value="auto" className="mb-2 bg-zinc-800/50 hover:bg-zinc-700/50">
                          <div className="flex items-center space-x-3 p-1">
                            <span className="text-lg">🤖</span>
                            <div className="flex-1">
                              <div className="font-medium text-white text-sm">Auto-Select</div>
                              <div className="text-xs text-zinc-400">Smart Routing • Adaptive</div>
                            </div>
                            <div className="text-xs text-cyan-400">AUTO</div>
                          </div>
                        </SelectItem>
                        
                        <SelectItem value="conversational" className="mb-2 bg-green-900/20 hover:bg-green-800/30">
                          <div className="flex items-center space-x-3 p-1">
                            <span className="text-lg text-green-400">💬</span>
                            <div className="flex-1">
                              <div className="font-medium text-green-100 text-sm">Conversational AI</div>
                              <div className="text-xs text-green-400">Ultra-Fast • Human-like</div>
                            </div>
                            <div className="text-xs text-green-400">FAST</div>
                          </div>
                        </SelectItem>
                        
                        <SelectItem value="emotional" className="bg-pink-900/20 hover:bg-pink-800/30">
                          <div className="flex items-center space-x-3 p-1">
                            <span className="text-lg text-pink-400 animate-pulse">❤️</span>
                            <div className="flex-1">
                              <div className="font-medium text-pink-100 text-sm">Emotional AI</div>
                              <div className="text-xs text-pink-400">Empathetic • Supportive</div>
                            </div>
                            <div className="text-xs text-pink-400">CARE</div>
                          </div>
                        </SelectItem>
                      </div>
                      
                      {/* Premium Models Tier */}
                      <div className="p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-xs font-medium text-blue-400 tracking-wide">🎯 PREMIUM MODELS</span>
                        </div>
                        
                        <div className="space-y-1">
                          <SelectItem value="claude-3-opus" className="hover:bg-zinc-800/50">
                            <div className="flex items-center space-x-3 p-1">
                              <span className="text-lg">🧠</span>
                              <div className="flex-1">
                                <div className="font-medium text-white text-sm">Claude 3 Opus</div>
                                <div className="text-xs text-zinc-400">Advanced Reasoning</div>
                              </div>
                            </div>
                          </SelectItem>
                          
                          <SelectItem value="gpt-4" className="hover:bg-zinc-800/50">
                            <div className="flex items-center space-x-3 p-1">
                              <span className="text-lg">🎯</span>
                              <div className="flex-1">
                                <div className="font-medium text-white text-sm">GPT-4</div>
                                <div className="text-xs text-zinc-400">Multimodal Intelligence</div>
                              </div>
                            </div>
                          </SelectItem>
                          
                          <SelectItem value="claude-3-sonnet" className="hover:bg-zinc-800/50">
                            <div className="flex items-center space-x-3 p-1">
                              <span className="text-lg">⚖️</span>
                              <div className="flex-1">
                                <div className="font-medium text-white text-sm">Claude 3 Sonnet</div>
                                <div className="text-xs text-zinc-400">Balanced Performance</div>
                              </div>
                            </div>
                          </SelectItem>
                          
                          <SelectItem value="gpt-3.5-turbo" className="hover:bg-zinc-800/50">
                            <div className="flex items-center space-x-3 p-1">
                              <span className="text-lg">⚡</span>
                              <div className="flex-1">
                                <div className="font-medium text-white text-sm">GPT-3.5 Turbo</div>
                                <div className="text-xs text-zinc-400">Fast & Efficient</div>
                              </div>
                            </div>
                          </SelectItem>
                          
                          <SelectItem value="gemini-pro" className="hover:bg-zinc-800/50">
                            <div className="flex items-center space-x-3 p-1">
                              <span className="text-lg">🔬</span>
                              <div className="flex-1">
                                <div className="font-medium text-white text-sm">Gemini Pro</div>
                                <div className="text-xs text-zinc-400">Google Advanced</div>
                              </div>
                            </div>
                          </SelectItem>
                        </div>
                      </div>
                    </SelectContent>
                  </Select>
                  
                  {/* Active indicator */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full animate-ping opacity-75"></div>
                </div>
              </div>
            </div>

            {/* Enhanced AI Status Display */}
            <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-zinc-900/50 to-zinc-800/50 rounded-lg border border-zinc-700/50">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Brain className="h-4 w-4 text-cyan-400" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <span className="text-sm font-medium text-cyan-300">Active AI:</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="px-2 py-1 bg-zinc-800 rounded-md border border-zinc-600">
                  <span className="text-sm font-medium text-white">
                    {selectedAIModel === 'auto' ? '🤖 Auto-Select' : 
                     selectedAIModel === 'mega-fusion' ? '🚀 Mega Fusion' :
                     selectedAIModel === 'research-pro' ? '📚 Research Pro' :
                     selectedAIModel === 'conversational' ? '💬 Conversational' :
                     selectedAIModel === 'emotional' ? '❤️ Emotional' :
                     selectedAIModel}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="AI System Online"></div>
                  <span className="text-xs text-green-400 font-medium">ONLINE</span>
                </div>
              </div>
              
              {selectedAIModel === 'mega-fusion' && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-amber-900/30 to-red-900/30 rounded-md border border-amber-600/30">
                  <div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-amber-400 font-bold">20+ MODELS</span>
                </div>
              )}
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

      {/* Live Camera Feed Panel */}
      {showLiveCamera && (
        <div className="bg-gradient-to-r from-red-950 to-red-900 border-b border-red-800 px-4 py-4 sm:px-6 relative z-30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <Camera className="h-5 w-5 mr-2 text-red-400" />
              Live Camera Feed - Real-time AI Analysis
            </h3>
            <Button
              onClick={() => setShowLiveCamera(false)}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <LiveCameraFeed 
            language={currentLanguage}
            onAnalysisResult={handleLiveCameraAnalysis}
            voiceEnabled={voiceEnabled}
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
                placeholder="Ask me anything or click the camera to start live feed..."
                className={`w-full px-4 py-3 pr-20 text-zinc-100 placeholder-zinc-500 bg-zinc-900 border border-zinc-700 rounded-2xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[48px] ${showLiveCamera ? 'ring-2 ring-red-400 border-red-400' : ''}`}
                rows={1}
              />
              <Button
                onClick={() => setShowLiveCamera(!showLiveCamera)}
                disabled={sendMessageMutation.isPending}
                className={`absolute right-11 bottom-2 w-8 h-8 rounded-full flex items-center justify-center focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed p-0 ${
                  showLiveCamera 
                    ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500' 
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 focus:ring-zinc-500'
                }`}
                title={showLiveCamera ? "Stop live camera" : "Start live camera feed"}
              >
                <Camera className="h-4 w-4" />
              </Button>
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
            <span>{showLiveCamera ? 'Live camera active...' : 'Live camera available'}</span>
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
