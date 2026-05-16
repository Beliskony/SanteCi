"use client";

import { useState } from "react";
import { Download, FileText, Trash2, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { ChatMessageData } from "@/app/frontend/store/chatStore";

interface Props {
  message:       ChatMessageData;
  isMine:        boolean;
  onDelete:      (messageId: string, scope: "me" | "everyone") => void;
  senderAvatar?: string;
}

export default function MessageBubble({ message, isMine, onDelete, senderAvatar }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const time = format(new Date(message.metadata.createdAt), "HH:mm", { locale: fr });

  const renderContent = () => {
    switch (message.messageType) {
      case "text":
        return <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>;

      case "image":
        return (
          <img
            src={message.file?.url}
            alt="image"
            className="max-w-55 rounded-lg object-cover"
          />
        );

      case "audio":
        return (
          <div className="flex items-center gap-2">
            <audio controls src={message.file?.url} className="h-9 max-w-55" />
          </div>
        );

      case "file":
      case "prescription":
        return (
          <a
            href={message.file?.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
              isMine
                ? "border-white/20 hover:bg-white/10"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className={`p-2 rounded-lg ${isMine ? "bg-white/20" : "bg-blue-50"}`}>
              <FileText size={18} className={isMine ? "text-white" : "text-[#1e3a8a]"} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold truncate ${isMine ? "text-white" : "text-gray-800"}`}>
                {message.file?.name ?? message.content}
              </p>
              <p className={`text-[11px] ${isMine ? "text-white/70" : "text-gray-400"}`}>
                {message.file?.size ? `${(message.file.size / 1024).toFixed(0)} KB` : "Document SantéCI"}
              </p>
            </div>
            <Download size={15} className={isMine ? "text-white/80" : "text-gray-400"} />
          </a>
        );

      default:
        return <p className="text-sm">{message.content}</p>;
    }
  };

  return (
    <div className={`flex items-end gap-2 group ${isMine ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar interlocuteur */}
      {!isMine && (
        <div className="shrink-0 mb-1">
          {senderAvatar ? (
            <img src={senderAvatar} className="w-7 h-7 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-[#1e3a8a] text-xs font-bold">
              ?
            </div>
          )}
        </div>
      )}

      {/* Bulle */}
      <div className="relative max-w-[65%]">
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isMine
              ? "bg-[#1e3a8a] text-white rounded-br-sm"
              : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"
          }`}
        >
          {renderContent()}

          {/* Time + statut lecture */}
          <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? "opacity-70" : ""}`}>
            <span className="text-[10px]">{time}</span>
            {isMine && (
              message.status.read
                ? <CheckCheck size={12} className="text-blue-300" />
                : message.status.delivered
                ? <CheckCheck size={12} />
                : <Check size={12} />
            )}
          </div>
        </div>

        {/* Menu suppression — visible au hover */}
        <div
          className={`absolute top-1 ${isMine ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"}
            hidden group-hover:flex items-center`}
        >
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Trash2 size={13} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-44 top-6 left-0">
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    onClick={() => { onDelete(message._id, "me"); setMenuOpen(false); }}
                  >
                    Supprimer pour moi
                  </button>
                  {isMine && (
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                      onClick={() => { onDelete(message._id, "everyone"); setMenuOpen(false); }}
                    >
                      Supprimer pour tous
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}