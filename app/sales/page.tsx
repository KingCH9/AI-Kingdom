import Link from "next/link";
import { getSalesDashboardData } from "@/lib/commerce/queries/sales-dashboard";

export const dynamic = "force-dynamic";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function SalesPage() {
  const data = await getSalesDashboardData();

  return (
    <div className="p-10 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🛒 Sales</h1>
        <p className="text-gray-400">
          Orders, revenue, storefront conversion, and top products
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-sm text-gray-500">Total revenue</p>
          <p className="text-2xl font-bold text-green-400">
            {formatMoney(data.totalRevenue)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-sm text-gray-500">Orders</p>
          <p className="text-2xl font-bold text-white">{data.orders.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-sm text-gray-500">Page views</p>
          <p className="text-2xl font-bold text-white">
            {data.analytics.pageViews}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-sm text-gray-500">Checkout starts</p>
          <p className="text-2xl font-bold text-white">
            {data.analytics.checkoutStarts}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-sm text-gray-500">Conversion</p>
          <p className="text-2xl font-bold text-emerald-400">
            {data.analytics.conversionRate}%
          </p>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Revenue by store</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="text-left p-3">Store</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Orders</th>
                <th className="text-right p-3">Revenue</th>
                <th className="text-right p-3">Views</th>
                <th className="text-right p-3">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {data.storeRevenue.map((store) => {
                const analytics = data.analyticsByStore.find(
                  (row) => row.storeId === store.id
                );
                return (
                  <tr key={store.id} className="border-t border-gray-800">
                    <td className="p-3">
                      {store.slug ? (
                        <Link
                          href={`/shop/${store.slug}`}
                          className="text-blue-400 hover:underline"
                        >
                          {store.name}
                        </Link>
                      ) : (
                        store.name
                      )}
                    </td>
                    <td className="p-3 text-gray-400">{store.status}</td>
                    <td className="p-3 text-right">{store._count.orders}</td>
                    <td className="p-3 text-right text-green-400">
                      {formatMoney(store.revenue)}
                    </td>
                    <td className="p-3 text-right">
                      {analytics?.pageViews ?? 0}
                    </td>
                    <td className="p-3 text-right">
                      {analytics?.conversionRate ?? 0}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Top products</h2>
        {data.topProducts.length === 0 ? (
          <p className="text-gray-500">No product sales yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.topProducts.map((product) => (
              <li
                key={product.productId ?? product.productName}
                className="flex justify-between p-4 rounded-xl border border-gray-700 bg-gray-900"
              >
                <span>{product.productName}</span>
                <span className="text-gray-400">
                  {product.orderCount} orders ·{" "}
                  <span className="text-green-400">
                    {formatMoney(product.totalRevenue)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Recent orders</h2>
        {data.orders.length === 0 ? (
          <p className="text-gray-500">
            No orders yet. Purchases appear here after Stripe checkout completes.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Store</th>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Source</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-left p-3">Lifecycle</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-800">
                    <td className="p-3 text-gray-400">
                      {formatDate(order.placedAt)}
                    </td>
                    <td className="p-3">{order.store.name}</td>
                    <td className="p-3">{order.product?.name ?? "—"}</td>
                    <td className="p-3 text-gray-400">{order.customer.email}</td>
                    <td className="p-3">{order.source}</td>
                    <td className="p-3 text-right text-green-400">
                      {formatMoney(order.total)}
                    </td>
                    <td className="p-3 text-gray-400">
                      {order.opportunity
                        ? `#${order.opportunity.id} ${order.opportunity.status}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
