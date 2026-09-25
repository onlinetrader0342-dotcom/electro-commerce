"use client";

import { useState } from "react";
import AddToCartButton from "@/components/AddToCartButton";
import QuantitySelector from "@/components/QuantitySelector";
import type { StoreProduct } from "@/lib/medusa";

/** Client island: quantity selector wired into AddToCartButton. */
export default function ProductPurchaseBox({ product }: { product: StoreProduct }) {
  const [qty, setQty] = useState(1);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-500">Quantity</span>
        <QuantitySelector value={qty} onChange={setQty} max={product.stockQty ?? 99} />
        {typeof product.stockQty === "number" && product.stockQty <= 10 && product.inStock && (
          <span className="text-xs font-semibold text-amber-600">
            Only {product.stockQty} left
          </span>
        )}
      </div>
      <AddToCartButton product={product} qty={qty} />
    </div>
  );
}
