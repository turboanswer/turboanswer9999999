import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Users, Send, Copy, Plus, LogIn, Crown, Bot, User } from "lucide-react";

export default function CollabRooms() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: rooms = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/collab-rooms'],
  });

  const { data: activeRoom, isLoading: roomLoading } = useQuery({
    queryKey: ['/api/collab-rooms', activeRoomId],
    enabled: !!activeRoomId,
    refetchInterval: activeRoomId ? 3000 : false,
  });

  const room = activeRoom as any;

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [room?.messages]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/collab-rooms', { name: roomName });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab-rooms'] });
      setActiveRoomId(data.id);
      setRoomName("");
      setShowCreate(false);
      toast({ title: `Room created! Code: ${data.code}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/collab-rooms/join', { code: joinCode });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab-rooms'] });
      setActiveRoomId(data.id);
      setJoinCode("");
      toast({ title: "Joined room!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/collab-rooms/${activeRoomId}/messages`, { content: msgInput });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab-rooms', activeRoomId] });
      setMsgInput("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Room code copied!" });
  };

  if (activeRoomId && room) {
    const messages = room.messages || [];
    const members = room.members || [];
    const currentUserId = (user as any)?.id;

    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="border-b border-[#1a1a1a] px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => { setActiveRoomId(null); queryClient.invalidateQueries({ queryKey: ['/api/collab-rooms'] }); }}
            className="text-[#888] hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{room.name}</h2>
            <div className="flex items-center gap-2 text-xs text-[#666]">
              <Users className="h-3 w-3" />
              <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <button onClick={() => copyCode(room.code)} className="flex items-center gap-1 hover:text-[#8ab4f8] transition-colors">
                Code: {room.code} <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m: any, i: number) => (
              <div key={m.id} className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold border-2 border-black"
                title={m.userName}>
                {(m.userName || 'U')[0].toUpperCase()}
              </div>
            ))}
            {members.length > 5 && <div className="w-7 h-7 rounded-full bg-[#333] flex items-center justify-center text-[10px] border-2 border-black">+{members.length - 5}</div>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12 text-[#555] text-sm">
              <Bot className="h-8 w-8 mx-auto mb-3 text-[#333]" />
              <p>Room is empty. Start chatting!</p>
              <p className="text-xs mt-1 text-[#444]">Type @ai followed by your question to ask the AI</p>
            </div>
          )}
          {messages.map((msg: any) => {
            const isSystem = msg.role === 'system';
            const isAI = msg.role === 'assistant';
            const isMe = msg.senderId === currentUserId;

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center">
                  <span className="text-xs text-[#555] bg-[#111] px-3 py-1 rounded-full">{msg.content}</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isAI ? 'bg-gradient-to-br from-[#8ab4f8] to-[#4285f4]' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                  {isAI ? <Bot className="h-4 w-4" /> : (msg.senderName || 'U')[0].toUpperCase()}
                </div>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${isAI ? 'text-[#8ab4f8]' : 'text-[#888]'}`}>
                      {isAI ? 'TurboAnswer AI' : msg.senderName}
                    </span>
                    <span className="text-[10px] text-[#444]">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isAI ? 'bg-[#0f1a2e] border border-[#1a2a4a] text-[#ccc]'
                    : isMe ? 'bg-[#1a3a5c] text-white'
                    : 'bg-[#1a1a1a] border border-[#222] text-[#ccc]'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-[#1a1a1a] px-4 py-3 shrink-0">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
              placeholder="Type a message... (use @ai to ask AI)"
              className="flex-1 px-4 py-3 rounded-xl bg-[#111] border border-[#333] text-sm text-white placeholder-[#555] outline-none focus:border-[#8ab4f8]"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && msgInput.trim()) { e.preventDefault(); sendMutation.mutate(); } }}
            />
            <button onClick={() => sendMutation.mutate()} disabled={!msgInput.trim() || sendMutation.isPending}
              className="px-4 py-3 rounded-xl bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-30">
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => setLocation('/chat')} className="text-[#888] hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Users className="h-6 w-6 text-purple-400" />
              <h1 className="text-2xl font-bold">Collaborative AI Rooms</h1>
            </div>
            <p className="text-sm text-[#666] ml-8">Chat together with friends and AI in real-time</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Room
          </button>
        </div>

        {showCreate && (
          <div className="rounded-2xl bg-[#111] border border-[#222] p-6 mb-6">
            <h3 className="font-semibold text-sm mb-4">Create a Room</h3>
            <input value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Room name"
              className="w-full px-4 py-3 rounded-xl bg-black border border-[#333] text-sm text-white placeholder-[#555] outline-none focus:border-[#8ab4f8] mb-3" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm text-[#888] hover:bg-white/5">Cancel</button>
              <button onClick={() => createMutation.mutate()} disabled={!roomName.trim() || createMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-30">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Room"}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-[#111] border border-[#222] p-6 mb-6">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><LogIn className="h-4 w-4 text-[#8ab4f8]" /> Join a Room</h3>
          <div className="flex gap-2">
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter room code"
              className="flex-1 px-4 py-3 rounded-xl bg-black border border-[#333] text-sm text-white placeholder-[#555] outline-none focus:border-[#8ab4f8] uppercase tracking-widest font-mono" maxLength={6} />
            <button onClick={() => joinMutation.mutate()} disabled={joinCode.length < 4 || joinMutation.isPending}
              className="px-5 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30">
              {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#8ab4f8]" /></div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 mx-auto mb-4 text-[#333]" />
            <p className="text-sm text-[#888] mb-1">No rooms yet</p>
            <p className="text-xs text-[#555]">Create a room and invite others with the code</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map((r: any) => (
              <button key={r.id} onClick={() => setActiveRoomId(r.id)}
                className="w-full text-left rounded-xl bg-[#111] border border-[#222] hover:border-[#333] p-4 transition-all flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate text-white">{r.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#666]">
                    <span>{r.memberCount || 1} member{(r.memberCount || 1) !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span className="font-mono">{r.code}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#444] shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
