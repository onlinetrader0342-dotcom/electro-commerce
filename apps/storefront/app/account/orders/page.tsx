import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CUSTOMER_COOKIE, listCustomerOrders } from "@/lib/customer-auth";
import { formatPKR } from "@/lib/format";

/** /account/orders — order history. Requires sign-in. */
export default async function OrdersPage() {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) redirect("/account/login");

  let orders: Awaited<ReturnType<typeof listCustomerOrders>> = [];
  let loadError: string | null = null;
  try {
    orders = await listCustomerOrders(token);
  } catch {
    loadError = "Could not load orders right now.";
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/account" className="hover:text-brand-700">
              My account
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="text-slate-700">Orders</li>
        </ol>
      </nav>

      <h1 className="mb-6 text-3xl font-bold text-brand-900">Order history</h1>

      {loadError && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {loadError}
        </p>
      )}

      {!loadError && orders.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          You haven&apos;t placed any orders yet.
        </p>
      )}

      {orders.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      #{o.display_id ?? o.id.slice(-8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(o.created_at).toLocaleDateString("en-PK")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {o.status ?? "pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {formatPKR(o.total, o.currency_code)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
