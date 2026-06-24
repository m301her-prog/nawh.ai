import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Search, ScanLine, Plus, Minus, Trash2, ShoppingBag,
  CheckCircle, Tag, Printer, X
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { formatCurrency, today, generateInvoiceNumber } from '../lib/helpers.js';
import { Button, Input, Select, Modal, Spinner, EmptyState, PageHeader } from '../components/ui.jsx';

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'نقداً' },
  { value: 'card',     label: 'بطاقة' },
  { value: 'transfer', label: 'تحويل بنكي' },
  { value: 'credit',   label: 'آجل' },
];

export default function Sales() {
  const [products, setProducts]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [cart, setCart]                 = useState([]);
  const [search, setSearch]             = useState('');
  const [selectedCat, setSelectedCat]   = useState('');
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [lastInvoice, setLastInvoice]   = useState('');
  const [customerName, setCustomerName] = useState('عميل نقدي');
  const [payMethod, setPayMethod]       = useState('cash');
  const [discount, setDiscount]         = useState(0);
  const [barcode, setBarcode]           = useState('');
  const barcodeRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('products').select('*, category:categories(name)').eq('is_active', true).gt('stock_qty', 0).order('name'),
      supabase.from('categories').select('*').order('name'),
    ]);
    setProducts(prods ?? []);
    setCategories(cats ?? []);
    setLoading(false);
  }

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode ?? '').includes(search);
    const matchCat = !selectedCat || p.category_id === selectedCat;
    return matchSearch && matchCat;
  });

  function addToCart(product) {
    setCart((prev) => {
      const ex = prev.find((c) => c.product.id === product.id);
      if (ex) {
        if (ex.quantity >= product.stock_qty) return prev;
        return prev.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1, unit_price: product.sell_price, discount_pct: 0 }];
    });
  }

  function updateQty(id, delta) {
    setCart((prev) => prev.map((c) => {
      if (c.product.id !== id) return c;
      const nq = Math.max(1, Math.min(c.quantity + delta, c.product.stock_qty));
      return { ...c, quantity: nq };
    }));
  }

  function removeFromCart(id) { setCart((prev) => prev.filter((c) => c.product.id !== id)); }

  const handleBarcodeKey = useCallback((e) => {
    if (e.key === 'Enter' && barcode.trim()) {
      const p = products.find((pr) => pr.barcode === barcode.trim());
      if (p) addToCart(p);
      setBarcode('');
    }
  }, [barcode, products]);

  const subtotal = cart.reduce((s, c) => s + c.quantity * c.unit_price * (1 - c.discount_pct / 100), 0);
  const total    = Math.max(0, subtotal - discount);

  async function handleCheckout() {
    if (!cart.length) return;
    setSaving(true);
    const num = await generateInvoiceNumber(supabase, 'SAL');
    const { data: inv, error } = await supabase.from('sales_invoices').insert({
      invoice_number:   num,
      customer_name:    customerName,
      invoice_date:     today(),
      subtotal,
      discount_amount:  discount,
      total_amount:     total,
      paid_amount:      total,
      payment_method:   payMethod,
      status:           'completed',
    }).select().single();
    if (error) { alert('خطأ في الحفظ'); setSaving(false); return; }
    await supabase.from('sales_items').insert(
      cart.map((c) => ({
        invoice_id:   inv.id,
        product_id:   c.product.id,
        product_name: c.product.name,
        quantity:     c.quantity,
        unit_price:   c.unit_price,
        discount_pct: c.discount_pct,
      }))
    );
    setLastInvoice(num);
    setCart([]); setDiscount(0); setCustomerName('عميل نقدي');
    setSaving(false); setSuccessModal(true);
    fetchData();
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <PageHeader title="نقطة البيع" subtitle="إنشاء فواتير بيع جديدة" />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Products panel ── */}
        <div className="flex-1 min-w-0">
          {/* Search & Barcode */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن منتج..." className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 bg-white" />
            </div>
            <div className="relative">
              <ScanLine size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500" />
              <input ref={barcodeRef} value={barcode} onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleBarcodeKey} placeholder="باركود..."
                className="w-32 pr-9 pl-3 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-sm outline-none focus:border-amber-500" />
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {['', ...categories.map((c) => c.id)].map((id) => {
              const label = id === '' ? 'الكل' : (categories.find((c) => c.id === id)?.name ?? id);
              return (
                <button key={id} onClick={() => setSelectedCat(id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    ${selectedCat === id ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Products grid */}
          {loading ? (
            <div className="flex justify-center py-12"><Spinner size={36} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<ShoppingBag size={28} />} title="لا توجد منتجات" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pb-2">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => addToCart(p)}
                  className="group bg-white rounded-2xl border border-gray-100 p-3 text-right
                    hover:border-teal-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col gap-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                    <Tag size={16} className="text-teal-600" />
                  </div>
                  <p className="font-medium text-gray-800 text-sm leading-tight line-clamp-2">{p.name}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-teal-700 font-bold text-sm">{formatCurrency(p.sell_price)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${p.stock_qty <= p.min_stock_qty ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      {p.stock_qty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Cart ── */}
        <div className="w-full lg:w-80 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-teal-900 rounded-t-2xl">
            <ShoppingBag size={17} className="text-teal-300" />
            <span className="font-bold text-white text-sm">السلة</span>
            {cart.length > 0 && (
              <span className="mr-auto bg-gold-400 text-teal-900 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 max-h-72 lg:max-h-96">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <ShoppingBag size={28} className="mx-auto mb-2 text-gray-200" />السلة فارغة
              </div>
            ) : cart.map((item) => (
              <div key={item.product.id} className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-gray-800 text-sm font-medium flex-1 leading-tight">{item.product.name}</p>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
                    <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors"><Minus size={11} /></button>
                    <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors"><Plus size={11} /></button>
                  </div>
                  <span className="text-gray-400 text-xs">× {formatCurrency(item.unit_price)}</span>
                  <span className="mr-auto text-teal-700 font-bold text-sm">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 space-y-3">
            <Input label="اسم العميل" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select label="طريقة الدفع" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
              <Input label="خصم (ر.س)" type="number" min={0} value={discount || ''} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} placeholder="0" />
            </div>
            <div className="bg-teal-50 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>المجموع الجزئي</span><span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-red-500">
                  <span>الخصم</span><span>- {formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-teal-200">
                <span>الإجمالي</span>
                <span className="text-teal-700">{formatCurrency(total)}</span>
              </div>
            </div>
            <Button variant="primary" size="lg" className="w-full justify-center bg-teal-700 hover:bg-teal-800"
              onClick={handleCheckout} disabled={!cart.length || saving}>
              {saving ? <Spinner size={18} /> : <CheckCircle size={18} />}
              {saving ? 'جاري الحفظ...' : 'إتمام البيع'}
            </Button>
          </div>
        </div>
      </div>

      <Modal isOpen={successModal} onClose={() => setSuccessModal(false)} title="تمت العملية بنجاح">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-teal-600" />
          </div>
          <p className="text-gray-700 font-medium mb-1">تم حفظ الفاتورة بنجاح</p>
          <p className="text-gray-500 text-sm mb-6">رقم الفاتورة: <span className="font-bold text-teal-700">{lastInvoice}</span></p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => setSuccessModal(false)}><X size={15} />إغلاق</Button>
            <Button variant="primary" onClick={() => { setSuccessModal(false); window.print(); }}>
              <Printer size={15} />طباعة
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
