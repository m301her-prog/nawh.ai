import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, Eye, Play, Pause, Clock, X } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { formatCurrency, formatDate, today, generateInvoiceNumber } from '../lib/helpers.js';
import { Button, Input, Select, Badge, Modal, Card, Spinner, EmptyState, PageHeader } from '../components/ui.jsx';

const INTERVALS = [
  { value: 'daily',   label: 'يومي' },
  { value: 'weekly',  label: 'أسبوعي' },
  { value: 'monthly', label: 'شهري' },
];

export default function RecurringInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal]     = useState(false);
  const [selected, setSelected]       = useState(null);

  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', payment_method: 'cash',
    recurrence_interval: 'monthly', next_recurrence_date: '', notes: '', discount_amount: '',
  });
  const [lines, setLines] = useState([{ product_id: '', product_name: '', quantity: '1', unit_price: '' }]);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: invs }, { data: prods }] = await Promise.all([
      supabase.from('sales_invoices').select('*').eq('is_recurring', true).order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, sell_price').eq('is_active', true).order('name'),
    ]);
    setInvoices(invs ?? []);
    setProducts(prods ?? []);
    setLoading(false);
  }

  async function viewItems(inv) {
    const { data: items } = await supabase.from('sales_items').select('*').eq('invoice_id', inv.id);
    setSelected({ ...inv, items: items ?? [] });
    setViewModal(true);
  }

  function addLine() { setLines([...lines, { product_id: '', product_name: '', quantity: '1', unit_price: '' }]); }
  function removeLine(i) { if (lines.length > 1) setLines(lines.filter((_, idx) => idx !== i)); }
  function updateLine(i, field, value) {
    setLines(lines.map((l, idx) => {
      if (idx !== i) return l;
      if (field === 'product_id') {
        const p = products.find((pr) => pr.id === value);
        return { ...l, product_id: value, product_name: p?.name ?? '', unit_price: String(p?.sell_price ?? '') };
      }
      return { ...l, [field]: value };
    }));
  }

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
  const total    = Math.max(0, subtotal - (parseFloat(form.discount_amount) || 0));

  async function handleCreate() {
    const valid = lines.filter((l) => l.product_id && parseFloat(l.quantity) > 0);
    if (!valid.length || !form.customer_name || !form.next_recurrence_date) { alert('يرجى تعبئة جميع الحقول'); return; }
    setSaving(true);
    const num = await generateInvoiceNumber(supabase, 'SAL');
    const { data: inv, error } = await supabase.from('sales_invoices').insert({
      invoice_number: num, customer_name: form.customer_name, customer_phone: form.customer_phone || null,
      invoice_date: today(), subtotal, discount_amount: parseFloat(form.discount_amount) || 0,
      total_amount: total, paid_amount: 0, payment_method: form.payment_method,
      status: 'recurring', is_recurring: true, recurrence_interval: form.recurrence_interval,
      next_recurrence_date: form.next_recurrence_date, notes: form.notes || null,
    }).select().single();
    if (error) { alert('خطأ في الحفظ'); setSaving(false); return; }
    await supabase.from('sales_items').insert(valid.map((l) => ({
      invoice_id: inv.id, product_id: l.product_id, product_name: l.product_name,
      quantity: parseFloat(l.quantity), unit_price: parseFloat(l.unit_price), discount_pct: 0,
    })));
    setSaving(false); setCreateModal(false);
    setLines([{ product_id: '', product_name: '', quantity: '1', unit_price: '' }]);
    setForm({ customer_name: '', customer_phone: '', payment_method: 'cash', recurrence_interval: 'monthly', next_recurrence_date: '', notes: '', discount_amount: '' });
    fetchData();
  }

  async function handleActivate(inv) {
    const num = await generateInvoiceNumber(supabase, 'SAL');
    const { data: items } = await supabase.from('sales_items').select('*').eq('invoice_id', inv.id);
    const { data: newInv } = await supabase.from('sales_invoices').insert({
      invoice_number: num, customer_name: inv.customer_name, customer_phone: inv.customer_phone,
      invoice_date: today(), subtotal: inv.subtotal, discount_amount: inv.discount_amount,
      total_amount: inv.total_amount, paid_amount: inv.total_amount, payment_method: inv.payment_method, status: 'completed',
    }).select().single();
    if (newInv && items) {
      await supabase.from('sales_items').insert(items.map((item) => ({
        invoice_id: newInv.id, product_id: item.product_id, product_name: item.product_name,
        quantity: item.quantity, unit_price: item.unit_price, discount_pct: item.discount_pct,
      })));
    }
    const next = new Date(inv.next_recurrence_date ?? new Date());
    if (inv.recurrence_interval === 'daily')        next.setDate(next.getDate() + 1);
    else if (inv.recurrence_interval === 'weekly')   next.setDate(next.getDate() + 7);
    else                                              next.setMonth(next.getMonth() + 1);
    await supabase.from('sales_invoices').update({ next_recurrence_date: next.toISOString().slice(0, 10) }).eq('id', inv.id);
    alert(`تم إنشاء الفاتورة ${num} بنجاح`);
    fetchData();
  }

  async function toggleStatus(inv) {
    await supabase.from('sales_invoices').update({ status: inv.status === 'recurring' ? 'draft' : 'recurring' }).eq('id', inv.id);
    fetchData();
  }

  const isOverdue = (inv) => inv.next_recurrence_date && inv.next_recurrence_date < today();

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <PageHeader
        title="الفواتير الدائمة"
        subtitle="إنشاء وإدارة فواتير البيع المتكررة"
        actions={<Button variant="primary" onClick={() => setCreateModal(true)}><Plus size={15} />فاتورة دائمة جديدة</Button>}
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'إجمالي الفواتير الدائمة', value: invoices.length, color: 'text-orange-700 bg-orange-50' },
          { label: 'فواتير نشطة',            value: invoices.filter((i) => i.status === 'recurring').length, color: 'text-teal-700 bg-teal-50' },
          { label: 'متأخرة',                 value: invoices.filter(isOverdue).length, color: 'text-red-700 bg-red-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 text-center ${s.color.split(' ')[1]}`}>
            <p className="text-gray-500 text-xs mb-1">{s.label}</p>
            <p className={`font-bold text-2xl ${s.color.split(' ')[0]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <Card>
        {loading ? <div className="flex justify-center py-12"><Spinner size={36} /></div> :
         invoices.length === 0 ? <EmptyState icon={<RefreshCw size={28} />} title="لا توجد فواتير دائمة" description="أنشئ فاتورة متكررة لعملائك المنتظمين" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['رقم الفاتورة', 'العميل', 'المبلغ', 'التكرار', 'التاريخ التالي', 'الحالة', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-bold text-teal-700">{inv.invoice_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 text-sm font-medium">{inv.customer_name}</p>
                      {inv.customer_phone && <p className="text-gray-400 text-xs">{inv.customer_phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-teal-700">{formatCurrency(inv.total_amount)}</td>
                    <td className="px-4 py-3"><Badge color="orange">{INTERVALS.find((i) => i.value === inv.recurrence_interval)?.label}</Badge></td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs ${isOverdue(inv) ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        <Clock size={11} />{inv.next_recurrence_date ? formatDate(inv.next_recurrence_date) : '-'}
                        {isOverdue(inv) && <span>(متأخر)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3"><Badge color={inv.status === 'recurring' ? 'green' : 'gray'}>{inv.status === 'recurring' ? 'نشط' : 'موقوف'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => viewItems(inv)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="عرض"><Eye size={13} /></button>
                        <button onClick={() => handleActivate(inv)} disabled={inv.status !== 'recurring'} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40" title="تنفيذ الآن"><Play size={13} /></button>
                        <button onClick={() => toggleStatus(inv)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={inv.status === 'recurring' ? 'إيقاف' : 'تفعيل'}>
                          {inv.status === 'recurring' ? <Pause size={13} /> : <Play size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="فاتورة دائمة جديدة" size="xl">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input label="اسم العميل *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <Input label="رقم الهاتف" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <Select label="طريقة الدفع" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
            <option value="cash">نقداً</option><option value="card">بطاقة</option><option value="transfer">تحويل</option><option value="credit">آجل</option>
          </Select>
          <Select label="تكرار الفاتورة" value={form.recurrence_interval} onChange={(e) => setForm({ ...form, recurrence_interval: e.target.value })}>
            {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </Select>
          <Input label="تاريخ التكرار التالي *" type="date" value={form.next_recurrence_date} onChange={(e) => setForm({ ...form, next_recurrence_date: e.target.value })} />
          <Input label="خصم (ر.س)" type="number" min={0} value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} />
          <Input label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="col-span-2" />
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
          <table className="w-full">
            <thead className="bg-gray-50"><tr>{['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي', ''].map((h, i) => <th key={i} className="px-3 py-2 text-right text-xs font-semibold text-gray-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="px-2 py-2">
                    <select value={line.product_id} onChange={(e) => updateLine(i, 'product_id', e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm outline-none">
                      <option value="">اختر منتجاً</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2"><input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm outline-none" /></td>
                  <td className="px-2 py-2"><input type="number" min={0} step={0.01} value={line.unit_price} onChange={(e) => updateLine(i, 'unit_price', e.target.value)} className="w-28 px-2 py-1.5 rounded-lg border border-gray-200 text-sm outline-none" placeholder="0.00" /></td>
                  <td className="px-2 py-2 text-sm font-semibold text-gray-700">{formatCurrency((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0))}</td>
                  <td className="px-2 py-2"><button onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
            <button onClick={addLine} className="text-teal-600 text-sm flex items-center gap-1"><Plus size={13} />إضافة بند</button>
            <span className="text-sm font-bold text-gray-700">المجموع: {formatCurrency(total)}</span>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setCreateModal(false)}>إلغاء</Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? <Spinner size={15} /> : <RefreshCw size={15} />}إنشاء الفاتورة الدائمة</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title={`تفاصيل: ${selected?.invoice_number}`} size="md">
        {selected && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div><span className="text-gray-500">العميل: </span><span className="font-medium">{selected.customer_name}</span></div>
              <div><span className="text-gray-500">التكرار: </span><Badge color="orange">{INTERVALS.find((i) => i.value === selected.recurrence_interval)?.label}</Badge></div>
              <div><span className="text-gray-500">المبلغ: </span><span className="font-bold text-teal-700">{formatCurrency(selected.total_amount)}</span></div>
              <div><span className="text-gray-500">التالي: </span><span className="font-medium">{selected.next_recurrence_date ? formatDate(selected.next_recurrence_date) : '-'}</span></div>
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
    </div>
  );
}
