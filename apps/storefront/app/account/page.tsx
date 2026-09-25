import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CUSTOMER_COOKIE,
  getCustomer,
} from "@/lib/customer-auth";
import { LogoutButton } from "./_components/LogoutButton";

/** /account — customer profile. Requires sign-in. */
export default async function AccountPage() {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) redirect("/account/login");

  const customer = await getCustomer(token).catch(() => null);
  if (!customer) redirect("/account/login");

  const name =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    "Customer";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-900">My account</h1>
          <p className="mt-1 text-slate-600">Assalam-o-Alaikum, {name}!</p>
        </div>
        <LogoutButton />
      </div>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-brand-900">Profile</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Name</dt>
            <dd className="font-semibold">{name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-semibold">{customer.email}</dd>
          </div>
          {customer.phone && (
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-semibold">{customer.phone}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-900">Orders</h2>
          <Link
            href="/account/orders"
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            View order history →
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          See past orders, their status and details.
        </p>
      </section>
    </main>
  );
}
