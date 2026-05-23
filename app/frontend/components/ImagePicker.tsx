// components/ui/ImagePicker.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, Loader2, Trash2, User} from "lucide-react";

interface ImagePickerProps {
  currentImage?: string | null;
  onImageSelect: (file: File) => Promise<void>;
  onImageRemove?: () => Promise<void>;
  initials?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-12 h-12 rounded-lg text-sm",
  md: "w-20 h-20 rounded-2xl text-2xl",
  lg: "w-32 h-32 rounded-3xl text-4xl",
};

const buttonSizeClasses = {
  sm: "w-5 h-5 -bottom-1 -right-1",
  md: "w-7 h-7 -bottom-1.5 -right-1.5",
  lg: "w-9 h-9 -bottom-2 -right-2",
};

const iconSizes = {
  sm: 10,
  md: 13,
  lg: 16,
};

export function ImagePicker({
  currentImage,
  onImageSelect,
  onImageRemove,
  initials = "",
  size = "md",
  disabled = false,
  className = "",
}: ImagePickerProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  // Nettoie les URLs ObjectURL
  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      alert("Format non supporté. Utilisez JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > maxSize) {
      alert("L'image ne doit pas dépasser 5MB.");
      return;
    }

    // Nettoie l'ancienne preview
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }

    // Crée la nouvelle preview
    const previewUrl = URL.createObjectURL(file);
    previewRef.current = previewUrl;
    setPreview(previewUrl);
    setShowMenu(false);
    
    setIsUploading(true);
    try {
      await onImageSelect(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreview(null);
    setShowMenu(false);
    
    if (onImageRemove) {
      setIsUploading(true);
      try {
        await onImageRemove();
      } finally {
        setIsUploading(false);
      }
    }
  };

  const getInitials = () => {
    if (!initials) return <User size={iconSizes[size] * 2} />;
    return initials.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Image Preview */}
      <div className={`relative group ${sizeClasses[size]} overflow-hidden bg-linear-to-br from-[#1e3a8a] to-blue-400 flex items-center justify-center text-white shadow-md`}>
        {preview ? (
          <img 
            src={preview} 
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-bold">{getInitials()}</span>
        )}
        
        {/* Overlay au hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {(isUploading || disabled) ? (
            <Loader2 size={iconSizes[size] * 1.5} className="animate-spin text-white" />
          ) : (
            <Camera size={iconSizes[size] * 1.5} className="text-white" />
          )}
        </div>
      </div>

      {/* Bouton pour changer la photo */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`absolute ${buttonSizeClasses[size]} bg-[#1e3a8a] text-white rounded-lg flex items-center justify-center shadow-md hover:bg-blue-800 transition-all hover:scale-105 disabled:opacity-50`}
        disabled={disabled || isUploading}
        aria-label="Changer la photo"
      >
        <Camera size={iconSizes[size]} />
      </button>

      {/* Menu contextuel */}
      {showMenu && !disabled && !isUploading && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-w-40">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <Upload size={14} />
              <span>Uploader une photo</span>
            </button>
            {preview && onImageRemove && (
              <button
                onClick={handleRemove}
                className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors border-t border-slate-100"
              >
                <Trash2 size={14} />
                <span>Supprimer</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Input file caché */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
      />
    </div>
  );
}