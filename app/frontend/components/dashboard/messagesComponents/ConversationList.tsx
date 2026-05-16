"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useChatStore } from "@/app/frontend/store/chatStore";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import ConversationItem from "./conversationItem";

interface Props {
  onSelectRoom: (roomId: string) => void;
}

export default function ConversationList({ onSelectRoom }: Props) {
  const [query, setQuery] = useState("");

  const { conversations, activeChatRoomId, isLoading, fetchConversations } = useChatStore();
  const currentUserId = useAuthStore((s) => s.user?._id ?? "") as string;

  useEffect(() => {
    fetchConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = conversations.filter((c) =>
    c.interlocutor.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="w-72 shrink-0 flex flex-col h-full border-r border-gray-100 bg-white">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-base font-bold text-gray-900 mb-3">Messagerie</h2>

        {/* Recherche */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {isLoading && conversations.length === 0 ? (
          /* Skeleton */
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-11 h-11 rounded-full bg-gray-200 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <p className="text-center text-xs text-gray-400 mt-10">
            {query ? "Aucun résultat" : "Aucune conversation"}
          </p>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.chatRoomId}
              conversation={conv}
              isActive={conv.chatRoomId === activeChatRoomId}
              currentUserId={currentUserId}
              onClick={() => onSelectRoom(conv.chatRoomId)}
            />
          ))
        )}
      </div>
    </aside>
  );
}