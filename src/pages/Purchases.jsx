import React, { useEffect, useState } from 'react';
import { Plus, Search, Eye, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { formatCurrency, formatDate, today, generateInvoiceNumber } from '../lib/helpers.js';
import { Button, Input, Select, Badge, Modal, Card, Spinner, EmptyState, PageHeader } from '../components/ui.jsx';

export default function Purchases() {
  const [invoices, setInvoices]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [invModal, setInvModal]   = useState(false);
  const [supModal, setSupModal]   = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [saving, setSaving]       = useState(false);

  const [form, setForm] = useState({
    supplier_id: '', invoice_date: today(), paid_amount: '',
    payment_status: 'unpaid', notes: '',
  });
  const [lines, setLines] = useState([{ product_id: '', quantity: '', unit_cost: '' }]);
  const [supForm, setSupForm] = useState({ name: '', phone: '', address: '', notes: '' });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: invs }, { data: sups }, { data: prods }] = await Promise.all([
      supabase.from('purchase_invoices').select('*, supplier:suppliers(name)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('products').select('id, name, cost_price').eq('is_active', true).order('name'),
    ]);
    setInvoices(invs ?? []);
    setSuppliers(sups ?? []);
    setProducts(prods ?? []);
    setLoading(false);
  }

  async function viewInvoice(inv) {
    const { data: items } = await supabase.from('purchase_items').select('*, product:products(name, unit)').eq('invoice_id', inv.id);
    setSelected({ ...inv, items: items ?? [] });
    setViewModal(true);
  }

  function addLine() { setLines([...lines, { product_id: '', quantity: '', unit_cost: '' }]); }
  function removeLine(i) { setLines(lines.filter((_, idx) => idx !== i)); }
  function updateLine(i, field, value) {
    setLines(lines.map((l, idx) => {
      if (idx !== i) return l;
      if (field === 'product_id') {
        const p = products.find((pr) => pr.id === value);
        return { ...l, product_id: value, unit_cost: String(p?.cost_price ?? '') };
      }
      return { ...l, [field]: value };
    }));
  }

  const linesTotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_cost) || 0), 0);

  async function handleSaveInvoice() {
    const valid = lines.filter((l) => l.product_id && parseFloat(l.quantity) > 0 && parseFloat(l.unit_cost) >= 0);
    if (!valid.length) { alert('أضف بنداً واحداً على الأقل'); return; }
    setSaving(true);
    const num = await generateInvoiceNumber(supabase, 'PUR');
    const { data: inv, error } = await supabase.from('purchase_invoices').insert({
      invoice_number: num,
      supplier_id: form.supplier_id || null,
      invoice_date: form.invoice_date,
      paid_amount: parseFloat(form.paid_amount) || 0,
      payment_status: form.payment_status,
      notes: form.notes || null,
    }).select().single();
    if (error) { alert('خطأ في الحفظ'); setSaving(false); return; }
    await supabase.from('purchase_items').insert(valid.map((l) => ({
      invoice_id: inv.id, product_id: l.product_id,
      quantity: parseFloat(l.quantity), unit_cost: parseFloat(l.unit_cost),
    })));
    setSaving(false); setInvModal(false);
    setLines([{ product_id: '', quantity: '', unit_cost: '' }]);
    setForm({ supplier_id: '', invoice_date: today(), paid_amount: '', payment_status: 'unpaid', notes: '' });
    fetchData();
  }

  async function handleSaveSupplier() {
    if (!supForm.name.trim()) return;
    await supabase.from('suppliers').insert({ name: supForm.name, phone: supForm.phone || null, address: supForm.address || null });
    setSupModal(false); setSupForm({ name: '', phone: '', address: '', notes: '' });
    fetchData();
  }

  const statusBadge = (s) => {
    if (s === 'paid')    return <Badge color="green">مدفوع</Badge>;
    if (s === 'partial') return <Badge color="yellow">جزئي</Badge>;
    return <Badge color="red">غير مدفوع</Badge>;
  };

  const filtered = invoices.filter((i) =>
    i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    ((i.supplier)?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <PageHeader
        title="المشتريات"
        subtitle="تسجيل فواتير الموردين وتحديث المخزون"
        actions={
          <>
            <Button variant="secondary" onClick={() => setSupModal(true)}><Truck size={15} />إضافة مورد</Button>
            <Button variant="primary"   onClick={() => setInvModal(true)}><Plus size={15} />فاتورة جديدة</Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'إجمالي الفواتير',         value: invoices.length,                                                         color: 'text-blue-700 bg-blue-50' },
          { label: 'الموردون',                value: suppliers.length,                                                         color: 'text-violet-700 bg-violet-50' },
          { label: 'إجمالي قيمة المشتريات',   value: formatCurrency(invoices.reduce((s, i) => s + i.total_amount, 0)),          color: 'text-teal-700 bg-teal-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 text-center ${s.color.split(' ')[1]}`}>
            <p className="text-gray-500 text-xs mb-1">{s.label}</p>
            <p className={`font-bold text-base ${s.color.split(' ')[0]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن فاتورة أو مورد..."
          className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 bg-white" />
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={36} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Truck size={28} />} title="لا توجد فواتير مشتريات" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['رقم الفاتورة', 'المورد', 'التاريخ', 'الإجمالي', 'المدفوع', 'الحالة', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-bold text-teal-700">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{inv.supplier?.name ?? 'غير محدد'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(inv.total_amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(inv.paid_amount)}</td>
                    <td className="px-4 py-3">{statusBadge(inv.payment_status)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => viewInvoice(inv)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Invoice Modal */}
      <Modal isOpen={invModal} onClose={() => setInvModal(false)} title="فاتورة مشتريات جديدة" size="xl">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Select label="المورد" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
            <option value="">بدون مورد</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label="التاريخ" type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
          <Select label="حالة الدفع" value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}>
            <option value="paid">مدفوع</option>
            <option value="partial">جزئي</option>
            <option value="unpaid">غير مدفوع</option>
          </Select>
          <Input label="المبلغ المدفوع" type="number" min={0} value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} />
          <Input label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="col-span-2" />
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['المنتج', 'الكمية', 'سعر التكلفة', 'الإجمالي', ''].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-right text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="px-2 py-2">
                    <select value={line.product_id} onChange={(e) => updateLine(i, 'product_id', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-teal-500">
                      <option value="">اختر منتجاً</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min={0} value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                      className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm outline-none" placeholder="0" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min={0} step={0.01} value={line.unit_cost} onChange={(e) => updateLine(i, 'unit_cost', e.target.value)}
                      className="w-28 px-2 py-1.5 rounded-lg border border-gray-200 text-sm outline-none" placeholder="0.00" />
                  </td>
                  <td className="px-2 py-2 text-sm font-semibold text-gray-700">
                    {formatCurrency((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_cost) || 0))}
                  </td>
                  <td className="px-2 py-2">
                    <button onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500 transition-colors">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
            <button onClick={addLine} className="text-teal-600 text-sm hover:text-teal-800 flex items-center gap-1"><Plus size={13} />إضافة بند</button>
            <span className="font-bold text-gray-700 text-sm">الإجمالي: {formatCurrency(linesTotal)}</span>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setInvModal(false)}>إلغاء</Button>
          <Button variant="primary" onClick={handleSaveInvoice} disabled={saving}>
            {saving ? <Spinner size={15} /> : null}حفظ الفاتورة
          </Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title={`فاتورة: ${selected?.invoice_number}`} size="lg">
        {selected && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div><span className="text-gray-500">المورد: </span><span className="font-medium">{selected.supplier?.name ?? 'غير محدد'}</span></div>
              <div><span className="text-gray-500">التاريخ: </span><span className="font-medium">{formatDate(selected.invoice_date)}</span></div>
              <div><span className="text-gray-500">الإجمالي: </span><span className="font-bold">{formatCurrency(selected.total_amount)}</span></div>
              <div><span className="text-gray-500">الحالة: </span>{statusBadge(selected.payment_status)}</div>
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>{['المنتج', 'الكمية', 'السعر', 'الإجمالي'].map((h) => (
                    <th key={h} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selected.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm">{item.product?.name}</td>
                      <td className="px-4 py-2 text-sm">{item.quantity} {item.product?.unit}</td>
                      <td className="px-4 py-2 text-sm">{formatCurrency(item.unit_cost)}</td>
                      <td className="px-4 py-2 text-sm font-semibold">{formatCurrency(item.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>

      {/* Supplier Modal */}
      <Modal isOpen={supModal} onClose={() => setSupModal(false)} title="إضافة مورد جديد" size="sm">
        <div className="space-y-3">
          <Input label="الاسم *" value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} />
          <Input label="الهاتف" value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} />
          <Input label="العنوان" value={supForm.address} onChange={(e) => setSupForm({ ...supForm, address: e.target.value })} />
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="secondary" onClick={() => setSupModal(false)}>إلغاء</Button>
          <Button variant="primary" onClick={handleSaveSupplier}>حفظ</Button>
        </div>
      </Modal>
    </div>
  );
}
