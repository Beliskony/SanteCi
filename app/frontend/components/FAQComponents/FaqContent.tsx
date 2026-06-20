"use client";

import { useState, useMemo } from "react";
import { faqCategories } from "@/app/frontend/lib/faq.data"
import FaqSidebar from "./FaqSideBar";
import FaqCategorySection from "./FaqCatgorySection";
import FaqHero from "./FaqHero";

export default function FaqContent() {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(faqCategories[0].id);

  // Filter categories and items by search
  const filtered = useMemo(() => {
    if (!search.trim()) return faqCategories;
    const q = search.toLowerCase();
    return faqCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [search]);

  const handleSidebarSelect = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(`faq-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Mobile category select
  const mobileCats = faqCategories.map((c) => ({ id: c.id, label: c.label }));

  return (
    <>
      <FaqHero search={search} onSearchChange={setSearch} />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Mobile category selector */}
        <div className="lg:hidden mb-6">
          <select
            value={activeId}
            onChange={(e) => handleSidebarSelect(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {mobileCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-10 items-start">
          {/* Sidebar */}
          <FaqSidebar activeId={activeId} onSelect={handleSidebarSelect} />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                Aucune question ne correspond à votre recherche.
              </div>
            ) : (
              <>
                {filtered.map((cat, index) => (
                  <FaqCategorySection
                    key={cat.id}
                    category={cat}
                    isFirst={index === 0 && !search}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}