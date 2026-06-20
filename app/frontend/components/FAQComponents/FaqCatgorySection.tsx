import { FaqCategory } from "@/app/frontend/lib/faq.data";
import FaqAccordionItem from "./FaqAccordionItem";

interface FaqCategorySectionProps {
  category: FaqCategory;
  isFirst?: boolean;
}

export default function FaqCategorySection({ category, isFirst = false }: FaqCategorySectionProps) {
  const Icon = category.icon;

  return (
    <section id={`faq-${category.id}`} className="mb-10 scroll-mt-6">
      {/* Category header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-[#1e3a8a] flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{category.label}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{category.description}</p>
        </div>
      </div>

      {/* Questions */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 divide-y divide-gray-100 shadow-xs">
        {category.items.map((item, index) => (
          <FaqAccordionItem
            key={index}
            item={item}
            defaultOpen={isFirst && index === 0}
          />
        ))}
      </div>
    </section>
  );
}