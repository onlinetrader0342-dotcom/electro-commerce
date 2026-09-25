"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

export interface AddableProduct {
  id: string;
  handle: string;
  title: string;
  thumbnail?: string;
  brand?: string;
  price: number;
  salePrice?: number;
  currency: string;
  inStock: boolean;
}

/** Adds the product to the cart store and opens the cart drawer. */
export default function AddToCartButton({
  product,
  qty = 1,
  className = "",
}: {
  product: AddableProduct;
  qty?: number;
  className?: string;
}) {
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);

  if (!product.inStock) {
    return (
      <button
        disabled
        className={`w-full cursor-not-allowed rounded-xl bg-slate-200 py-3.5 text-sm font-bold text-slate-500 ${className}`}
      >
        Out of Stock
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        addItem(product, qty);
        setAdded(true);
        openCart();
        window.setTimeout(() => setAdded(false), 2000);
      }}
      className={`w-full rounded-xl bg-accent-500 py-3.5 text-sm font-bold text-brand-950 transition-colors hover:bg-accent-400 ${className}`}
    >
      {added ? "Added to Cart ✓" : "Add to Cart"}
    </button>
  );
}
