import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CUSTOMER_COOKIE, getCustomerOrder } from "@/lib/customer-auth";
import { fromMinorUnits } from "@/lib/commerce";
import { formatPKR } from "@/lib/format";

/** /account/orders/[id] — order detail. Requires sign-in. */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) redirect("/account/login");

  const order = await getCustomerOrder(token, id).catch(() => null);
  if (!order) notFound();

  const currency = (order.currency_code || "PKR").toUpperCase();
  const addr = order.shipping_address as Record<string, string> | null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/account" className="hover:text-brand-700">
              My account
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href="/account/orders" className="hover:text-brand-700">
              Orders
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="text-slate-700">#{order.display_id ?? order.id.slice(-8)}</li>
        </ol>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-900">
          Order #{order.display_id ?? order.id.slice(-8)}
        </h1>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {order.status ?? "pending"}
        </span>
      </div>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-brand-900">Items</h2>
        <ul className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-3">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="h-14 w-14 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-xl">
                  🔌
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-brand-900">{item.title}</p>
                <p className="text-sm text-slate-500">
                  {item.quantity} × {formatPKR(fromMinorUnits(item.unit_price), currency)}
                </p>
              </div>
              <p className="font-bold">
                {formatPKR(fromMinorUnits(item.unit_price) * item.quantity, currency)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-slate-200 pt-4 text-sm">
          {typeof order.shipping_total === "number" && (
            <div className="flex justify-between">
              <dt className="text-slate-600">Shipping</dt>
              <dd className="font-semibold">
                {formatPKR(fromMinorUnits(order.shipping_total), currency)}
              </dd>
            </div>
          )}
          <div className="flex justify-between text-base">
            <dt className="font-bold text-brand-900">Total</dt>
            <dd className="font-bold text-brand-900">
              {formatPKR(fromMinorUnits(order.total), currency)}
            </dd>
          </div>
        </dl>
      </section>

      {addr && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-brand-900">Shipping address</h2>
          <p className="text-sm text-slate-600">
            {[addr.first_name, addr.last_name].filter(Boolean).join(" ")}
            <br />
            {addr.address_1}
            {addr.address_2 ? `, ${addr.address_2}` : ""}
            <br />
            {[addr.city, addr.province, addr.postal_code].filter(Boolean).join(", ")}
            <br />
            {addr.phone}
          </p>
        </section>
      )}
    </main>
  );
}
