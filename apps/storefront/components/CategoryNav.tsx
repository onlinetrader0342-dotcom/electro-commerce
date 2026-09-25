import Link from "next/link";
import type { StoreCategory } from "@/lib/medusa";

/**
 * Horizontal scrollable category chips. Rendered from API/fixture data —
 * never hard-coded. Used under the header and on the home page.
 */
export default function CategoryNav({
  categories,
  activeHandle,
  basePath = "/category",
}: {
  categories: StoreCategory[];
  activeHandle?: string;
  basePath?: string;
}) {
  if (!categories.length) return null;
  return (
    <nav aria-label="Categories" className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-2 py-1">
        {categories.map((c) => {
          const active = activeHandle === c.handle;
          return (
            <li key={c.id} className="shrink-0">
              <Link
                href={`${basePath}/${c.handle}`}
                aria-current={active ? "page" : undefined}
                className={`inline-block rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand-900 bg-brand-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:text-brand-700"
                }`}
              >
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
