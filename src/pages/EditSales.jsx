import React, { useEffect, useState } from 'react';
import { Search, Eye, X, Edit3, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { formatCurrency, formatDate } from '../lib/helpers.js';
import { Button, Input, Select, Badge, Modal, Card, Spinner, EmptyState, PageHeader } from '../components/ui.jsx';

export default function EditSales() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [viewModal, setViewModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ customer_name: '', customer_phone: '', payment_method: 'cash', notes: '', status: 'completed' });
  const [saving, setSaving]     = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('sales_invoices').select('*').order('created_at', { ascending: false });
    setInvoices(data ?? []);
    setLoading(false);
  }

  async function viewInvoice(inv) {
    const { data: items } = await supabase.from('sales_items').select('*').eq('invoice_id', inv.id);
    setSelected({ ...inv, items: items ?? [] });
    setViewModal(true);
  }

  function openEdit(inv) {
    setSelected(inv);
    setEditForm({ customer_name: inv.customer_name, customer_phone: inv.customer_phone ?? '', payment_method: inv.payment_method, notes: inv.notes ?? '', status: inv.status });
    setEditModal(true);
  }

  async function handleSaveEdit() {
    if (!selected) return;
    setSaving(true);
    await supabase.from('sales_invoices').update({
      customer_name: editForm.customer_name,
      customer_phone: editForm.customer_phone || null,
      payment_method: editForm.payment_method,
      notes: editForm.notes || null,
      status: editForm.status,
    }).eq('id', selected.id);
    setSaving(false); setEditModal(false); fetchData();
  }

  async function cancelInvoice(inv) {
    if (!confirm('هل تريد إلغاء هذه الفاتورة؟')) return;
    await supabase.from('sales_invoices').update({ status: 'cancelled' }).eq('id', inv.id);
    fetchData();
  }

  const statusBadge = (s) => {
    const map = { completed: { color: 'green', label: 'مكتملة' }, cancelled: { color: 'red', label: 'ملغاة' }, draft: { color: 'gray', label: 'مسودة' }, recurring: { color: 'orange', label: 'دائمة' } };
    const m = map[s] ?? map.draft;
    return <Badge color={m.color}>{m.label}</Badge>;
  };

  const filtered = invoices.filter((i) => {
    const matchSearch = i.invoice_number.toLowerCase().includes(search.toLowerCase()) || i.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !status || i.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <PageHeader title="تعديل المبيعات" subtitle="مراجعة وتعديل فواتير البيع" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'إجمالي الفواتير', value: invoices.length, color: 'text-blue-700 bg-blue-50' },
          { label: 'مكتملة',         value: invoices.filter((i) => i.status === 'completed').length, color: 'text-teal-700 bg-teal-50' },
          { label: 'ملغاة',           value: invoices.filter((i) => i.status === 'cancelled').length, color: 'text-red-700 bg-red-50' },
          { label: 'إجمالي المبيعات', value: formatCurrency(invoices.filter((i) => i.status === 'completed').reduce((s, i) => s + i.total_amount, 0)), color: 'text-emerald-700 bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color.split(' ')[1]}`}>
            <p className="text-gray-500 text-xs mb-1">{s.label}</p>
            <p className={`font-bold text-sm ${s.color.split(' ')[0]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن فاتورة أو عميل..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 bg-white" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white">
          <option value="">جميع الحالات</option>
          <option value="completed">مكتملة</option>
          <option value="cancelled">ملغاة</option>
          <option value="draft">مسودة</option>
          <option value="recurring">دائمة</option>
        </select>
      </div>

      <Card>
        {loading ? <div className="flex justify-center py-12"><Spinner size={36} /></div> :
         filtered.length === 0 ? <EmptyState icon={<Edit3 size={28} />} title="لا توجد فواتير" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['رقم الفاتورة', 'العميل', 'التاريخ', 'الإجمالي', 'طريقة الدفع', 'الحالة', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-bold text-teal-700">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{inv.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(inv.total_amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {{ cash: 'نقداً', card: 'بطاقة', transfer: 'تحويل', credit: 'آجل' }[inv.payment_method] ?? inv.payment_method}
                    </td>
                    <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => viewInvoice(inv)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="عرض"><Eye size={13} /></button>
                        {inv.status !== 'cancelled' && (
                          <>
                            <button onClick={() => openEdit(inv)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل"><Edit3 size={13} /></button>
                            <button onClick={() => cancelInvoice(inv)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="إلغاء"><X size={13} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* View Modal */}
      <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title={`فاتورة: ${selected?.invoice_number}`} size="lg">
        {selected && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div><span className="text-gray-500">العميل: </span><span className="font-medium">{selected.customer_name}</span></div>
              <div><span className="text-gray-500">التاريخ: </span><span className="font-medium">{formatDate(selected.invoice_date)}</span></div>
              <div><span className="text-gray-500">الإجمالي: </span><span className="font-bold text-teal-700">{formatCurrency(selected.total_amount)}</span></div>
              <div><span className="text-gray-500">الحالة: </span>{statusBadge(selected.status)}</div>
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50"><tr>{['المنتج', 'الكمية', 'السعر', 'الإجمالي'].map((h) => <th key={h} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {selected.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm">{item.product_name}</td>
                      <td className="px-4 py-2 text-sm">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-2 text-sm font-semibold">{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title={`تعديل فاتورة: ${selected?.invoice_number}`} size="sm">
        <div className="space-y-3">
          <Input label="اسم العميل" value={editForm.customer_name} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} />
          <Input label="رقم الهاتف" value={editForm.customer_phone} onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })} />
          <Select label="طريقة الدفع" value={editForm.payment_method} onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}>
            <option value="cash">نقداً</option><option value="card">بطاقة</option><option value="transfer">تحويل</option><option value="credit">آجل</option>
          </Select>
          <Select label="الحالة" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
            <option value="completed">مكتملة</option><option value="draft">مسودة</option><option value="cancelled">ملغاة</option>
          </Select>
          <Input label="ملاحظات" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="secondary" onClick={() => setEditModal(false)}>إلغاء</Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={saving}>{saving ? <Spinner size={15} /> : <CheckCircle size={15} />}حفظ التعديلات</Button>
        </div>
      </Modal>
    </div>
  );
}
