export function formatCurrency(amount) {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function monthStart() {
  return today().slice(0, 7) + '-01';
}

export async function generateInvoiceNumber(supabase, prefix) {
  const table = prefix === 'SAL' ? 'sales_invoices' : 'purchase_invoices';
  const dateStr = today().replace(/-/g, '');
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  const seq = String((count ?? 0) + 1).padStart(4, '0');
  return `${prefix}-${dateStr}-${seq}`;
}
