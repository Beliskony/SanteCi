"use client";

import { useState } from "react";
import Image from "next/image";
import { Phone, Video, MoreVertical, X } from "lucide-react";
import type { Interlocutor } from "@/app/frontend/services/chatService";

interface Props {
  interlocutor: Interlocutor;
  onStartCall:  (type: "audio" | "video") => void;
}

export default function ConversationHeader({ interlocutor, onStartCall }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white shrink-0">
      {/* Avatar + infos */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {interlocutor.avatar ? (
            <Image
              src={interlocutor.avatar}
              alt={interlocutor.name}
              width={40}
              height={40}
              className="rounded-full object-cover w-10 h-10"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-[#1e3a8a] font-bold text-sm">
              {interlocutor.name.charAt(0)}
            </div>
          )}
          {interlocutor.isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900">{interlocutor.name}</p>
          <p className={`text-xs font-medium ${interlocutor.isOnline ? "text-green-500" : "text-gray-400"}`}>
            {interlocutor.isOnline ? "● En ligne" : "● Hors ligne"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onStartCall("audio")}
          title="Appel audio"
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#1e3a8a] transition-colors"
        >
          <Phone size={18} />
        </button>
        <button
          onClick={() => onStartCall("video")}
          title="Appel vidéo"
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#1e3a8a] transition-colors"
        >
          <Video size={18} />
        </button>

        {/* Menu contextuel */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-44">
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Fichiers partagés
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Rechercher
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Supprimer la conversation
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}