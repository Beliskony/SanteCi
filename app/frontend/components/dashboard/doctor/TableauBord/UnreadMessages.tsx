"use client";

import { ChevronRight, MessageSquare } from "lucide-react";
import { useNotificationStore } from "@/app/frontend/store/otherStore";

// ─── Message item ─────────────────────────────────────────────────────────────

function MessageItem({
  sender,
  preview,
  time,
  unread,
  onClick,
}: {
  sender:  string;
  preview: string;
  time:    string;
  unread:  boolean;
  onClick: () => void;
}) {
  const initials = sender.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
        unread ? "bg-blue-50/40" : ""
      }`}
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-xs font-bold text-[#1e3a8a] shrink-0 mt-0.5">
        {initials}
      </div>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${unread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
            {sender}
          </p>
          <span className="text-[10px] text-slate-400 shrink-0">{time}</span>
        </div>
        <p className="text-xs text-slate-500 truncate mt-0.5">{preview}</p>
      </div>

      {/* Point non lu */}
      {unread && (
        <span className="w-2 h-2 rounded-full bg-[#1e3a8a] shrink-0 mt-1.5" />
      )}
    </button>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface UnreadMessagesProps {
  onViewAll:    () => void;
  onOpenMessage:(id: string) => void;
}

export function UnreadMessages({ onViewAll, onOpenMessage }: UnreadMessagesProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount   = useNotificationStore((s) => s.unreadCount);
  const isLoading     = useNotificationStore((s) => s.isLoading);

  // On prend les 3 premières notifs comme messages (à remplacer par un chatStore dédié)
  const messages = notifications.slice(0, 3);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900">Messages non lus</h2>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#1e3a8a] text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 flex flex-col divide-y divide-slate-50">
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-2.5 bg-slate-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <MessageSquare size={24} className="text-slate-200" />
            <p className="text-xs text-slate-400">Aucun message</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg._id}
              sender={msg._id}        // ← à remplacer par msg.sender quand chatStore sera branché
              preview={msg._id}       // ← à remplacer par msg.content
              time="—"               // ← à remplacer par msg.createdAt formaté
              unread={!msg.read}
              onClick={() => onOpenMessage(msg._id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100">
        <button
          onClick={onViewAll}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#1e3a8a] bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
        >
          Voir tous les messages
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}