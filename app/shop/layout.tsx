export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-stone-50 text-stone-900">
      {children}
    </div>
  );
}
