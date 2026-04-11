import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTheme } from "@/hooks/use-theme";
import { X, TicketCheck, MessageCircle, Bell } from "lucide-react";

export default function NotificationPopup() {
  const { isDark } = useTheme();
  const [visible, setVisible] = useState<any[]>([]);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 5000,
  });

  useEffect(() => {
    const newNotifs = notifications.filter((n: any) => !seenIds.has(n.id));
    if (newNotifs.length > 0) {
      setVisible(prev => {
        const existingIds = new Set(prev.map((p: any) => p.id));
        const fresh = newNotifs.filter((n: any) => !existingIds.has(n.id));
        return [...prev, ...fresh].slice(-5);
      });
    }
  }, [notifications]);

  const dismissMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('POST', `/api/notifications/${id}/dismiss`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  const handleDismiss = (id: number) => {
    setSeenIds(prev => new Set([...prev, id]));
    setVisible(prev => prev.filter(n => n.id !== id));
    dismissMutation.mutate(id);
  };

  useEffect(() => {
    const timers = visible.map(n => {
      return setTimeout(() => handleDismiss(n.id), 8000);
    });
    return () => timers.forEach(clearTimeout);
  }, [visible.length]);

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {visible.map((n, i) => (
        <div
          key={n.id}
          className={`pointer-events-auto rounded-2xl border shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-right-5 fade-in duration-300 ${
            isDark ? 'bg-[#1e1f20] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
            n.type === 'new_ticket' ? 'bg-amber-500/20' : 'bg-blue-500/20'
          }`}>
            {n.type === 'new_ticket' ? (
              <TicketCheck className="h-4 w-4 text-amber-400" />
            ) : (
              <MessageCircle className="h-4 w-4 text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{n.title}</p>
            {n.body && <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-[#9aa0a6]' : 'text-gray-500'}`}>{n.body}</p>}
            <p className={`text-[10px] mt-1 ${isDark ? 'text-[#555]' : 'text-gray-400'}`}>
              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button onClick={() => handleDismiss(n.id)} className={`shrink-0 p-1 rounded-full ${isDark ? 'hover:bg-white/10 text-[#666]' : 'hover:bg-gray-100 text-gray-400'}`}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
