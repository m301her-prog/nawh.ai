import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Package, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { formatCurrency } from '../lib/helpers.js';
import { Button, Input, Select, Badge, Modal, Card, Spinner, EmptyState, PageHeader } from '../components/ui.jsx';

const UNITS = ['قطعة', 'كيلو', 'لتر', 'علبة', 'كرتون', 'كيس', 'زجاجة', 'درزن'];
const EMPTY = { barcode: '', name: '', category_id: '', unit: 'قطعة', cost_price: '', sell_price: '', stock_qty: '0', min_stock_qty: '5', notes: '' };

export default function Inventory() {
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [lowOnly, setLowOnly]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [adjModal, setAdjModal]   = useState(false);
  const [adjProduct, setAdjProduct] = useState(null);
  const [adjQty, setAdjQty]       = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('products').select('*, category:categories(name)').order('name'),
      supabase.from('categories').select('*').order('name'),
    ]);
    setProducts(prods ?? []);
    setCategories(cats ?? []);
    setLoading(false);
  }

  function openAdd() { setEditItem(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(p) {
    setEditItem(p);
    setForm({ barcode: p.barcode ?? '', name: p.name, category_id: p.category_id ?? '', unit: p.unit,
      cost_price: String(p.cost_price), sell_price: String(p.sell_price),
      stock_qty: String(p.stock_qty), min_stock_qty: String(p.min_stock_qty), notes: p.notes ?? '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.sell_price) { alert('الاسم وسعر البيع مطلوبان'); return; }
    setSaving(true);
    const payload = {
      barcode: form.barcode || null, name: form.name, category_id: form.category_id || null,
      unit: form.unit, cost_price: parseFloat(form.cost_price) || 0,
      sell_price: parseFloat(form.sell_price), stock_qty: parseFloat(form.stock_qty) || 0,
      min_stock_qty: parseFloat(form.min_stock_qty) || 5, notes: form.notes || null,
    };
    if (editItem) await supabase.from('products').update(payload).eq('id', editItem.id);
    else          await supabase.from('products').insert(payload);
    setSaving(false); setModalOpen(false); fetchData();
  }

  async function handleAdjust() {
    if (!adjProduct || adjQty === '') return;
    const newQty = Math.max(0, parseFloat(adjQty));
    await supabase.from('products').update({ stock_qty: newQty }).eq('id', adjProduct.id);
    await supabase.from('stock_movements').insert({
      product_id: adjProduct.id, movement_type: 'adjustment',
      quantity_change: newQty - adjProduct.stock_qty, notes: 'تسوية يدوية',
    });
    setAdjModal(false); setAdjQty(''); fetchData();
  }

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode ?? '').includes(search);
    const matchCat = !filterCat || p.category_id === filterCat;
    const matchLow = !lowOnly || p.stock_qty <= p.min_stock_qty;
    return matchSearch && matchCat && matchLow;
  });

  const lowCount = products.filter((p) => p.stock_qty <= p.min_stock_qty).length;
  const stockValue = products.reduce((s, p) => s + p.stock_qty * p.cost_price, 0);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <PageHeader
        title="المخزون"
        subtitle="إدارة المنتجات والأصناف"
        actions={<Button variant="primary" onClick={openAdd}><Plus size={15} />منتج جديد</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'إجمالي الأصناف', value: products.length, color: 'text-teal-700 bg-teal-50' },
          { label: 'مخزون منخفض',    value: lowCount,         color: 'text-amber-700 bg-amber-50' },
          { label: 'قيمة المخزون',   value: formatCurrency(stockValue), color: 'text-emerald-700 bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 text-center ${s.color.split(' ')[1]}`}>
            <p className="text-gray-500 text-xs mb-1">{s.label}</p>
            <p className={`font-bold text-base ${s.color.split(' ')[0]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 relative min-w-40">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الباركود..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 bg-white" />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 bg-white">
          <option value="">جميع الفئات</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => setLowOnly(!lowOnly)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-all
            ${lowOnly ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'}`}>
          <AlertTriangle size={13} />مخزون منخفض {lowCount > 0 && <span className="bg-amber-500 text-white text-xs font-bold px-1.5 rounded-full">{lowCount}</span>}
        </button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={36} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Package size={28} />} title="لا توجد منتجات" description="أضف منتجاً للبدء" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['المنتج', 'الفئة', 'سعر البيع', 'سعر التكلفة', 'المخزون', 'الوحدة', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-gray-800 font-medium text-sm">{p.name}</p>
                      {p.barcode && <p className="text-gray-400 text-xs">{p.barcode}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.category?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-teal-700">{formatCurrency(p.sell_price)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(p.cost_price)}</td>
                    <td className="px-4 py-3">
                      <Badge color={p.stock_qty <= p.min_stock_qty ? 'red' : p.stock_qty <= p.min_stock_qty * 2 ? 'yellow' : 'green'}>
                        {p.stock_qty}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.unit}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setAdjProduct(p); setAdjQty(String(p.stock_qty)); setAdjModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="تسوية المخزون">
                          <RefreshCw size={13} />
                        </button>
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                          <Edit2 size={13} />
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

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'تعديل منتج' : 'إضافة منتج'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="الاسم *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="col-span-2" />
          <Input label="باركود" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          <Select label="الفئة" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">بدون فئة</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="الوحدة" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
          <Input label="سعر البيع *" type="number" min={0} step={0.01} value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} />
          <Input label="سعر التكلفة" type="number" min={0} step={0.01} value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
          <Input label="الكمية الحالية" type="number" min={0} value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
          <Input label="الحد الأدنى للتنبيه" type="number" min={0} value={form.min_stock_qty} onChange={(e) => setForm({ ...form, min_stock_qty: e.target.value })} />
          <Input label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="col-span-2" />
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={15} /> : null}{editItem ? 'حفظ التعديلات' : 'إضافة'}
          </Button>
        </div>
      </Modal>

      {/* Adjust Modal */}
      <Modal isOpen={adjModal} onClose={() => setAdjModal(false)} title="تسوية المخزون" size="sm">
        <p className="text-sm text-gray-600 mb-4">المنتج: <strong>{adjProduct?.name}</strong></p>
        <Input label="الكمية الجديدة" type="number" min={0} value={adjQty} onChange={(e) => setAdjQty(e.target.value)} />
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="secondary" onClick={() => setAdjModal(false)}>إلغاء</Button>
          <Button variant="primary" onClick={handleAdjust}>تأكيد</Button>
        </div>
      </Modal>
    </div>
  );
}
