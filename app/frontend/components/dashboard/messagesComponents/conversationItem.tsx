"use client";

import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { PlainConversationSummary } from "@/app/frontend/store/chatStore";

interface Props {
  conversation: PlainConversationSummary;
  isActive:     boolean;
  currentUserId: string
  onClick:      () => void;
}

export default function ConversationItem({ conversation, isActive, currentUserId, onClick }: Props) {
  const { interlocutor, lastMessage, unreadCount } = conversation;

  const timeLabel = lastMessage
    ? formatDistanceToNow(new Date(lastMessage.metadata.createdAt), { addSuffix: false, locale: fr })
    : "";

  const preview = lastMessage
    ? lastMessage.messageType === "text"
      ? lastMessage.content
      : lastMessage.messageType === "audio"
      ? "🎵 Message vocal"
      : lastMessage.messageType === "image"
      ? "📷 Image"
      : `📎 ${lastMessage.content}`
    : "Aucun message";

  const isMine = lastMessage?.senderId === currentUserId;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 text-left ${
        isActive
          ? "bg-blue-50 border border-blue-100"
          : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      {/* Avatar + statut */}
      <div className="relative shrink-0">
        {interlocutor.avatar ? (
          <Image
            src={interlocutor.avatar}
            alt={interlocutor.name}
            width={44}
            height={44}
            className="rounded-full object-cover w-11 h-11"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-[#1e3a8a] font-bold text-sm">
            {interlocutor.name.charAt(0)}
          </div>
        )}
        {interlocutor.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={`text-sm font-semibold truncate ${isActive ? "text-[#1e3a8a]" : "text-gray-900"}`}>
            {interlocutor.name}
          </span>
          <span className="text-[11px] text-gray-400 shrink-0">{timeLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-gray-500 truncate">
            {isMine && <span className="text-gray-400">Vous : </span>}
            {preview}
          </p>
          {unreadCount > 0 && (
            <span className="shrink-0 min-w-4.5 h-4.5 px-1 bg-[#1e3a8a] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}