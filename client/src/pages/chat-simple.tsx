import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Send, Mic, Plus, HelpCircle, DollarSign, Home, Settings, Zap, LogOut } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { VoiceInterface, useSpeakText } from '@/components/VoiceInterface';

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

export default function ChatSimple() {
  const [message, setMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState('auto');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('male');
  const queryClient = useQueryClient();

  // Use the voice function
  const speakText = useSpeakText(selectedLanguage, voiceGender);
  
  // Debug voice function
  useEffect(() => {
    console.log('Voice function initialized:', typeof speakText);
  }, [speakText]);

  // Load AI model preference
  useEffect(() => {
    const savedModel = localStorage.getItem('preferredAIModel');
    if (savedModel) {
      setSelectedAIModel(savedModel);
    }
  }, []);

  console.log('ChatSimple rendered, currentConversationId:', currentConversationId);

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
    mutationFn: () => apiRequest('POST', '/api/conversations', { title: 'New Conversation' }),
    onSuccess: (data) => {
      console.log('Conversation created successfully:', data);
      const conversationId = data?.id || (conversations.length + 1); // Fallback to next ID
      setCurrentConversationId(conversationId);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      
      // If there's a pending message, send it now
      const pendingMessage = message.trim();
      if (pendingMessage) {
        setTimeout(() => {
          console.log('Auto-sending pending message to conversation:', conversationId);
          setIsTyping(true);
          sendMessageMutation.mutate({
            message: pendingMessage,
            aiModel: selectedAIModel,
          });
        }, 200);
      }
    },
    onError: (error) => {
      console.error('Failed to create conversation:', error);
      setIsTyping(false);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ message: msg, aiModel }: { message: string; aiModel: string }) =>
      apiRequest('POST', `/api/conversations/${currentConversationId}/messages`, {
        content: msg,
        aiModel,
      }),
    onSuccess: (data) => {
      console.log('Message sent successfully:', data);
      setMessage('');
      setIsTyping(false);
      queryClient.invalidateQueries({
        queryKey: ['/api/conversations', currentConversationId, 'messages'],
      });
      
      // Auto-speak AI response
      if (data.aiMessage && data.aiMessage.content) {
        console.log('🔊 Attempting to speak AI response:', data.aiMessage.content.substring(0, 50) + '...');
        try {
          speakText(data.aiMessage.content);
        } catch (error) {
          console.error('❌ Speech synthesis error:', error);
        }
      }
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      setIsTyping(false);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/logout', {}),
    onSuccess: () => {
      // Clear any stored user data
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      
      // Clear React Query cache
      queryClient.clear();
      
      // Redirect to login page
      window.location.href = '/login';
    },
    onError: (error) => {
      console.error('Logout failed:', error);
      // Even if logout fails, clear local data and redirect
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with message:', message.trim());
    
    if (!message.trim()) return;

    if (!currentConversationId) {
      console.log('No conversation, creating one first');
      setIsTyping(true);
      createConversationMutation.mutate();
      return;
    }

    console.log('Sending message to conversation:', currentConversationId);
    setIsTyping(true);
    sendMessageMutation.mutate({
      message: message.trim(),
      aiModel: selectedAIModel,
    });
  };

  const createNewConversation = () => {
    console.log('Creating new conversation');
    setCurrentConversationId(null);
    setMessage('');
    setIsTyping(false);
    createConversationMutation.mutate();
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#000000', 
      color: 'white', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '16px', 
        borderBottom: '1px solid #1a1a1a' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            backgroundColor: '#2563eb', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>T</span>
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Turbo</h1>
            <p style={{ fontSize: '12px', color: '#60a5fa', margin: 0 }}>AI Assistant</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/home">
            <button
              style={{
                padding: '8px',
                backgroundColor: '#1a1a1a',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Home"
            >
              <Home size={16} />
            </button>
          </Link>

          <Link href="/ai-settings">
            <button
              style={{
                padding: '8px',
                backgroundColor: '#1a1a1a',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="AI Settings"
            >
              <Settings size={16} />
            </button>
          </Link>
          
          <Link href="/pricing">
            <button
              style={{
                padding: '8px',
                backgroundColor: '#1a1a1a',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Pricing"
            >
              <DollarSign size={16} />
            </button>
          </Link>
          
          <button
            onClick={() => {
              console.log('New conversation button clicked');
              createNewConversation();
            }}
            style={{
              padding: '8px',
              backgroundColor: '#1a1a1a',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
            title="New Conversation"
          >
            <Plus size={16} />
          </button>
          
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            style={{
              padding: '8px',
              backgroundColor: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: logoutMutation.isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: logoutMutation.isPending ? 0.6 : 1
            }}
            title={logoutMutation.isPending ? 'Logging out...' : 'Logout'}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>



      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '50px' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: '#2563eb', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 24px' 
            }}>
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>T</span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Welcome to Turbo</h2>
            <p style={{ color: '#9ca3af', fontSize: '16px' }}>Your AI assistant for conversations</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    backgroundColor: msg.role === 'user' ? '#2563eb' : '#1a1a1a',
                    color: 'white'
                  }}
                >
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {isTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '16px' }}>
            <div style={{
              backgroundColor: '#1a1a1a',
              padding: '12px 16px',
              borderRadius: '16px'
            }}>
              <span style={{ fontSize: '14px', color: '#9ca3af' }}>Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Voice Interface */}
      <div style={{ padding: '16px', borderTop: '1px solid #1a1a1a' }}>
        <VoiceInterface
          onMessage={(voiceMessage) => {
            setMessage(voiceMessage);
            // Auto-send voice messages
            if (voiceMessage.trim()) {
              if (!currentConversationId) {
                // Create conversation first, then send
                setMessage(voiceMessage);
                createConversationMutation.mutate();
              } else {
                setIsTyping(true);
                sendMessageMutation.mutate({
                  message: voiceMessage,
                  aiModel: selectedAIModel,
                });
              }
            }
          }}
          isProcessing={isTyping}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          voiceGender={voiceGender}
          onVoiceGenderChange={setVoiceGender}
        />
        
        {/* Text Input */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
          <input
            type="text"
            value={message}
            onChange={(e) => {
              console.log('Input changed:', e.target.value);
              setMessage(e.target.value);
            }}
            placeholder="Message Turbo"
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '24px',
              color: 'white',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          
          <button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending || isTyping}
            style={{
              padding: '12px',
              backgroundColor: message.trim() ? '#2563eb' : '#374151',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              cursor: message.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            <Send size={20} />
          </button>
        </form>
        
        <p style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          textAlign: 'center', 
          marginTop: '8px', 
          margin: '8px 0 0 0' 
        }}>
          Turbo AI can make mistakes, so double-check it
        </p>
      </div>
    </div>
  );
}