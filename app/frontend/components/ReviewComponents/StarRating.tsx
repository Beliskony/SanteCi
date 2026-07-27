"use client";

import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void; // absent = lecture seule
  size?: number;
}

export function StarRating({ value, onChange, size = 22 }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const isInteractive = !!onChange;
  const displayValue = hovered ?? value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!isInteractive}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => isInteractive && setHovered(star)}
          onMouseLeave={() => isInteractive && setHovered(null)}
          className={isInteractive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={size}
            className={star <= displayValue ? "text-amber-400" : "text-slate-200"}
            fill={star <= displayValue ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}