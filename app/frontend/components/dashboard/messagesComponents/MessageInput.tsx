"use client";

import { useRef, useState, useCallback } from "react";
import { Paperclip, Smile, Send, Mic, MicOff, X } from "lucide-react";
import { useChatStore } from "@/app/frontend/store/chatStore";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import { cloudinaryService } from "@/app/server/services/cloudinary.service";

interface Props {
  roomId:     string;
  receiverId: string;
  appointmentId?: string;
}

const EMOJI_LIST = ["😊", "👍", "🙏", "❤️", "😢", "😮", "👋", "✅", "🔥", "💊"];

export default function MessageInput({ roomId, receiverId, appointmentId }: Props) {
  const [text, setText]               = useState("");
  const [showEmoji, setShowEmoji]     = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading]     = useState(false);
  const [filePreview, setFilePreview] = useState<{ name: string; size: number } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const fileInputRef    = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef  = useRef<Blob[]>([]);
  const timerRef        = useRef<NodeJS.Timeout | null>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);

  const { sendText, sendMedia, sendAudio, isSending } = useChatStore();
  const currentUserId = useAuthStore((s) => s.user?._id ?? "");

  // ── Auto-resize textarea ────────────────────────────────────
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  // ── Envoyer texte ───────────────────────────────────────────
  const handleSendText = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await sendText(roomId, { receiverId, content: trimmed, appointmentId });
  }, [text, isSending, sendText, roomId, receiverId, appointmentId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // ── Sélection fichier ───────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setFilePreview({ name: file.name, size: file.size });
    e.target.value = "";
  };

  const cancelFile = () => {
    setPendingFile(null);
    setFilePreview(null);
  };

  // ── Envoyer fichier ─────────────────────────────────────────
  const handleSendFile = useCallback(async () => {
    if (!pendingFile || isSending) return;
    setUploading(true);

    try {
      // Upload Cloudinary côté client via uploadFile
      const formData = new FormData();
      formData.append("file", pendingFile);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "");

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: "POST", body: formData }
      );
      const cloudData = await cloudRes.json();

      // Déterminer le messageType
      const mime = pendingFile.type;
      const messageType =
        mime.startsWith("image/")  ? "image"
        : mime.startsWith("video/") ? "video"
        : mime === "application/pdf" && text.toLowerCase().includes("ordonnance") ? "prescription"
        : "file";

      await sendMedia(roomId, {
        receiverId,
        messageType,
        fileUrl:     cloudData.secure_url,
        fileName:    pendingFile.name,
        fileSize:    pendingFile.size,
        fileMimeType: pendingFile.type,
        appointmentId,
      });

      cancelFile();
    } catch {
      // erreur gérée dans le store
    } finally {
      setUploading(false);
    }
  }, [pendingFile, isSending, sendMedia, roomId, receiverId, appointmentId, text]);

  // ── Enregistrement audio ────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current   = [];

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: "audio/webm" });

        setUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "");
          formData.append("resource_type", "video"); // Cloudinary utilise "video" pour audio

          const cloudRes = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
            { method: "POST", body: formData }
          );
          const cloudData = await cloudRes.json();

          await sendAudio(roomId, {
            receiverId,
            audioUrl:        cloudData.secure_url,
            fileName:        file.name,
            fileSize:        file.size,
            fileMimeType:    file.type,
            durationSeconds: recordingTime,
            appointmentId,
          });
        } finally {
          setUploading(false);
          setRecordingTime(0);
        }
      };

      recorder.start();
      setIsRecording(true);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 299) { stopRecording(); return t; }
          return t + 1;
        });
      }, 1000);
    } catch {
      alert("Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">

      {/* Preview fichier sélectionné */}
      {filePreview && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
          <Paperclip size={14} className="text-[#1e3a8a] shrink-0" />
          <span className="text-xs text-gray-700 truncate flex-1">{filePreview.name}</span>
          <span className="text-[11px] text-gray-400 shrink-0">
            {(filePreview.size / 1024).toFixed(0)} KB
          </span>
          <button onClick={cancelFile} className="text-gray-400 hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Enregistrement en cours */}
      {isRecording && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-red-600 font-medium">Enregistrement {formatTime(recordingTime)}</span>
        </div>
      )}

      <div className="flex items-end gap-2">

        {/* Bouton fichier */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-gray-400 hover:text-[#1e3a8a] hover:bg-gray-100 transition-colors shrink-0"
          title="Joindre un fichier"
        >
          <Paperclip size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,application/pdf,.doc,.docx"
          onChange={handleFileSelect}
        />

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message..."
            disabled={isRecording}
            className="w-full resize-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 transition-all leading-relaxed disabled:opacity-50"
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />
        </div>

        {/* Emoji */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="p-2 rounded-xl text-gray-400 hover:text-[#1e3a8a] hover:bg-gray-100 transition-colors"
          >
            <Smile size={20} />
          </button>

          {showEmoji && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
              <div className="absolute bottom-10 right-0 z-20 bg-white border border-gray-100 rounded-xl shadow-lg p-3 grid grid-cols-5 gap-2">
                {EMOJI_LIST.map((e) => (
                  <button
                    key={e}
                    onClick={() => { setText((t) => t + e); setShowEmoji(false); }}
                    className="text-xl hover:scale-125 transition-transform"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Micro ou Envoyer */}
        {pendingFile ? (
          <button
            onClick={handleSendFile}
            disabled={uploading || isSending}
            className="p-2.5 rounded-xl bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 transition-colors disabled:opacity-50 shrink-0"
          >
            {uploading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
            ) : (
              <Send size={18} />
            )}
          </button>
        ) : text.trim() ? (
          <button
            onClick={handleSendText}
            disabled={isSending}
            className="p-2.5 rounded-xl bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 transition-colors disabled:opacity-50 shrink-0"
          >
            {isSending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
            ) : (
              <Send size={18} />
            )}
          </button>
        ) : (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={uploading}
            className={`p-2.5 rounded-xl transition-colors shrink-0 ${
              isRecording
                ? "bg-red-500 text-white hover:bg-red-600"
                : "text-gray-400 hover:text-[#1e3a8a] hover:bg-gray-100"
            }`}
            title={isRecording ? "Arrêter l'enregistrement" : "Message vocal"}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={20} />}
          </button>
        )}
      </div>
    </div>
  );
}