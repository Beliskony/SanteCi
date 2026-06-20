"use client";

import { useState } from "react";
import { PlusIcon, MinusIcon } from "lucide-react";
import { FaqItem } from "@/app/frontend/lib/faq.data";  

interface FaqAccordionItemProps {
  item: FaqItem;
  defaultOpen?: boolean;
}

export default function FaqAccordionItem({ item, defaultOpen = false }: FaqAccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 group"
      >
        <span className={`text-sm font-medium transition-colors ${open ? "text-[#1e3a8a]" : "text-gray-800 group-hover:text-[#1e3a8a]"}`}>
          {item.question}
        </span>
        <span className="shrink-0 w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-[#1e3a8a] transition-colors">
          {open ? (
            <MinusIcon className="w-3 h-3 text-[#1e3a8a]" />
          ) : (
            <PlusIcon className="w-3 h-3 text-gray-500" />
          )}
        </span>
      </button>

      {open && (
        <p className="text-sm text-gray-500 leading-relaxed pb-4 pr-10">
          {item.answer}
        </p>
      )}
    </div>
  );
}