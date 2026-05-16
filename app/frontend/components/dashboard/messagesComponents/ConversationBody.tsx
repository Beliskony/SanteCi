"use client";

import { useEffect, useRef, useCallback } from "react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useChatStore, type ChatMessageData } from "@/app/frontend/store/chatStore";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import MessageBubble from "./MessageBubble";

interface Props {
  roomId: string;
}

function DateSeparator({ date }: { date: Date }) {
  const label = isToday(date)
    ? "Aujourd'hui"
    : isYesterday(date)
    ? "Hier"
    : format(date, "d MMMM yyyy", { locale: fr });

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-[11px] text-gray-400 font-medium px-2">{label}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

export default function ConversationBody({ roomId }: Props) {
  const bottomRef   = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    hasMore,
    isLoading,
    activeInterlocutor,
    activeChatRoomId,
    loadMoreMessages,
    markRoomAsRead,
    deleteMessage,
    openRoom,
  } = useChatStore();

  const currentUserId = useAuthStore((s) => s.user?._id ?? "");

  // Ouvrir la room et marquer comme lu
  useEffect(() => {
    if (roomId && roomId !== activeChatRoomId) {
      openRoom(roomId).then(() => markRoomAsRead(roomId));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Scroll au bas à l'ouverture
  useEffect(() => {
    if (messages.length > 0 && activeChatRoomId === roomId) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatRoomId]);

  // Scroll au bas à chaque nouveau message entrant
  useEffect(() => {
    const lastMsg = messages[0];
    if (lastMsg && lastMsg.chatRoomId === roomId) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages[0]?._id]);

  // Infinite scroll (scroll vers le haut)
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || !hasMore || isLoading) return;
    if (el.scrollTop < 80) loadMoreMessages();
  }, [hasMore, isLoading, loadMoreMessages]);

  // Regrouper les messages par date pour les séparateurs
  // messages est trié du plus récent (index 0) au plus ancien — on inverse pour l'affichage
  const sorted = [...messages].reverse();

  const handleDelete = (messageId: string, scope: "me" | "everyone") => {
    deleteMessage(roomId, messageId, scope);
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col gap-3 px-5 py-4 overflow-y-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
            <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse shrink-0" />
            <div
              className="h-10 bg-gray-200 animate-pulse rounded-2xl"
              style={{ width: `${100 + (i % 3) * 60}px` }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1"
    >
      {/* Loader infinite scroll */}
      {hasMore && isLoading && (
        <div className="flex justify-center py-2">
          <span className="w-5 h-5 border-2 border-gray-200 border-t-[#1e3a8a] rounded-full animate-spin" />
        </div>
      )}

      {sorted.map((msg, idx) => {
        const msgDate  = new Date(msg.metadata.createdAt);
        const prevMsg  = sorted[idx - 1];
        const prevDate = prevMsg ? new Date(prevMsg.metadata.createdAt) : null;
        const showDate = !prevDate || !isSameDay(msgDate, prevDate);
        const isMine   = msg.senderId === currentUserId;

        return (
          <div key={msg._id}>
            {showDate && <DateSeparator date={msgDate} />}
            <MessageBubble
              message={msg}
              isMine={isMine}
              senderAvatar={!isMine ? activeInterlocutor?.avatar : undefined}
              onDelete={handleDelete}
            />
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}