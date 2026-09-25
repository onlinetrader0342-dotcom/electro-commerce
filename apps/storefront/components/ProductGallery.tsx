"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/lib/medusa";

/** Product image gallery: main image + thumbnail strip. */
export default function ProductGallery({
  images,
  title,
}: {
  images: ProductImage[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [{ url: "", alt: title }];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {list[active]?.url ? (
          <Image
            key={list[active].url}
            src={list[active].url}
            alt={list[active].alt ?? title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-200">
            <svg viewBox="0 0 24 24" className="h-24 w-24" fill="currentColor" aria-hidden="true">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </div>
        )}
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {list.map((im, i) => (
            <button
              key={`${im.url}-${i}`}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === active}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-50 ${
                i === active ? "border-brand-700" : "border-transparent"
              }`}
            >
              {im.url && (
                <Image src={im.url} alt={im.alt ?? `${title} ${i + 1}`} fill sizes="64px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
