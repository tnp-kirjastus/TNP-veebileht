const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending: { label: "Ootel", cls: "bg-gray-100 text-gray-600" },
  payment_pending: { label: "Makse ootel", cls: "bg-gray-100 text-gray-600" },
  paid: { label: "Makstud", cls: "bg-green-100 text-green-700" },
  processing: { label: "Töötlemisel", cls: "bg-blue-100 text-blue-700" },
  shipped: { label: "Saadetud", cls: "bg-orange-100 text-orange-700" },
  delivered: { label: "Kohale toimetatud", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Tühistatud", cls: "bg-red-100 text-red-700" },
  payment_failed: { label: "Makse ebaõnnestus", cls: "bg-red-100 text-red-700" },
  expired: { label: "Aegunud", cls: "bg-gray-100 text-gray-600" },
  refunded: { label: "Tagastatud", cls: "bg-gray-100 text-gray-600" },
  preorder: { label: "Ettetellimus", cls: "bg-yellow-100 text-yellow-700" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${config.cls}`}>
      {config.label}
    </span>
  );
}
