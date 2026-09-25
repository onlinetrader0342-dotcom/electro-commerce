import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb trail with schema.org microdata (pairs with BreadcrumbList JSON-LD). */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-slate-500">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true" className="text-slate-300">/</span>}
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-brand-700 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "font-medium text-brand-900" : ""}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
