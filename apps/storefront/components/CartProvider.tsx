"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CART_UPDATED_EVENT,
  cartCount,
  cartSubtotal,
  loadLocalCart,
  saveLocalCart,
  syncCartToMedusa,
  type CartLine,
} from "@/lib/cart";
import type { AddableProduct } from "./AddToCartButton";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  currency: string;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: AddableProduct, qty?: number) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

/**
 * Client cart store. localStorage is the UI source of truth; every mutation
 * best-effort mirrors to a Medusa store cart (see lib/cart.ts) so checkout
 * can load the server-side cart via getMedusaCartId()/ensureMedusaCart().
 */
export default function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage on mount + cross-tab updates.
  useEffect(() => {
    setLines(loadLocalCart());
    const onUpdate = () => setLines(loadLocalCart());
    window.addEventListener(CART_UPDATED_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const commit = useCallback((next: CartLine[]) => {
    setLines(next);
    saveLocalCart(next);
    // Debounced Medusa mirror — never blocks the UI.
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void syncCartToMedusa(next);
    }, 800);
  }, []);

  const addItem = useCallback(
    (product: AddableProduct, qty = 1) => {
      const id = product.id;
      commit(
        (() => {
          const existing = lines.find((l) => l.id === id);
          const unitPrice = product.salePrice ?? product.price;
          if (existing) {
            return lines.map((l) =>
              l.id === id ? { ...l, qty: Math.min(l.qty + qty, 99) } : l,
            );
          }
          return [
            ...lines,
            {
              id,
              productId: product.id,
              handle: product.handle,
              title: product.title,
              thumbnail: product.thumbnail,
              brand: product.brand,
              unitPrice,
              currency: product.currency,
              qty: Math.max(qty, 1),
            },
          ];
        })(),
      );
    },
    [lines, commit],
  );

  const removeItem = useCallback(
    (id: string) => commit(lines.filter((l) => l.id !== id)),
    [lines, commit],
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      if (qty <= 0) return removeItem(id);
      commit(lines.map((l) => (l.id === id ? { ...l, qty: Math.min(qty, 99) } : l)));
    },
    [lines, commit, removeItem],
  );

  const clear = useCallback(() => commit([]), [commit]);
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: cartCount(lines),
      subtotal: cartSubtotal(lines),
      currency: lines[0]?.currency ?? "PKR",
      isCartOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQty,
      clear,
    }),
    [lines, isCartOpen, openCart, closeCart, addItem, removeItem, setQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
