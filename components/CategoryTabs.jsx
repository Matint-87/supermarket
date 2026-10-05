"use client";

const tabClass = (active) =>
  `shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
    active ? "bg-linear-to-b from-green-600 to-green-700 text-white shadow-brand" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-green-50 hover:text-green-700 hover:ring-green-300"
  }`;

export default function CategoryTabs({ categories, activeId, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="دسته‌بندی محصولات"
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeId === null}
        onClick={() => onChange(null)}
        className={tabClass(activeId === null)}
      >
        همه محصولات
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={activeId === c.id}
          onClick={() => onChange(c.id)}
          className={tabClass(activeId === c.id)}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
