import { faqCategories } from "@/app/frontend/lib/faq.data";

interface FaqSidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export default function FaqSidebar({ activeId, onSelect }: FaqSidebarProps) {
  return (
    <aside className="w-48 shrink-0 hidden lg:block">
      <nav className="sticky top-6 space-y-1">
        {faqCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              activeId === cat.id
                ? "bg-[#1e3a8a] text-white font-semibold"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}