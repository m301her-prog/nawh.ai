import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { formatCurrency, formatDate, today } from '../lib/helpers.js';
import { Button, Input, Select, Badge, Modal, Card, Spinner, EmptyState, PageHeader } from '../components/ui.jsx';

export default function Expenses() {
  const [expenses, setExpenses]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState({
    category: '', description: '', amount: '',
    expense_date: today(), payment_method: 'نقداً', notes: '',
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: exps }, { data: cats }] = await Promise.all([
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('expense_categories').select('*').order('name'),
    ]);
    setExpenses(exps ?? []);
    setCategories(cats ?? []);
    setLoading(false);
  }

  async function handleSave() {
    if (!form.category || !form.description || !form.amount) { alert('يرجى تعبئة الحقول المطلوبة'); return; }
    setSaving(true);
    await supabase.from('expenses').insert({
      category: form.category, description: form.description,
      amount: parseFloat(form.amount), expense_date: form.expense_date,
      payment_method: form.payment_method, notes: form.notes || null,
    });
    setSaving(false); setModalOpen(false);
    setForm({ category: '', description: '', amount: '', expense_date: today(), payment_method: 'نقداً', notes: '' });
    fetchData();
  }

  async function handleDelete(id) {
    if (!confirm('هل تريد حذف هذا المصروف؟')) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchData();
  }

  const filtered = expenses.filter((e) => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase()) || e.category.includes(search);
    const matchCat = !filterCat || e.category === filterCat;
    const matchFrom = !dateFrom || e.expense_date >= dateFrom;
    const matchTo   = !dateTo   || e.expense_date <= dateTo;
    return matchSearch && matchCat && matchFrom && matchTo;
  });

  const todayStr   = today();
  const monthStr   = todayStr.slice(0, 7);
  const todayTotal = expenses.filter((e) => e.expense_date === todayStr).reduce((s, e) => s + e.amount, 0);
  const monthTotal = expenses.filter((e) => e.expense_date.startsWith(monthStr)).reduce((s, e) => s + e.amount, 0);
  const filtTotal  = filtered.reduce((s, e) => s + e.amount, 0);

  const CAT_COLORS = { 'إيجار': 'blue', 'كهرباء': 'yellow', 'مياه': 'blue', 'رواتب': 'green', 'تسويق': 'orange', 'صيانة': 'gray', 'مواصلات': 'gray', 'أخرى': 'gray' };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <PageHeader
        title="المصروفات"
        subtitle="سجل النفقات التشغيلية اليومية"
        actions={<Button variant="primary" onClick={() => setModalOpen(true)}><Plus size={15} />مصروف جديد</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'مصروفات اليوم',       value: formatCurrency(todayTotal), color: 'text-red-700 bg-red-50' },
          { label: 'مصروفات الشهر',       value: formatCurrency(monthTotal), color: 'text-orange-700 bg-orange-50' },
          { label: 'مجموع الفترة المحددة', value: formatCurrency(filtTotal),  color: 'text-blue-700 bg-blue-50' },
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 bg-white" />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white">
          <option value="">جميع الفئات</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white" title="من تاريخ" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white" title="إلى تاريخ" />
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={36} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Calendar size={28} />} title="لا توجد مصروفات" description="سجّل مصروف جديد" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['التاريخ', 'الفئة', 'البيان', 'طريقة الدفع', 'المبلغ', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(e.expense_date)}</td>
                    <td className="px-4 py-3"><Badge color={CAT_COLORS[e.category] ?? 'gray'}>{e.category}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{e.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{e.payment_method}</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-700">الإجمالي</td>
                  <td className="px-4 py-3 text-sm font-bold text-red-600">{formatCurrency(filtTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="إضافة مصروف" size="sm">
        <div className="space-y-3">
          <Select label="الفئة *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">اختر الفئة</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
          <Input label="البيان *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف المصروف" />
          <Input label="المبلغ (ر.س) *" type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="التاريخ" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          <Select label="طريقة الدفع" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
            {['نقداً', 'بطاقة', 'تحويل'].map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? <Spinner size={15} /> : null}حفظ</Button>
        </div>
      </Modal>
    </div>
  );
}
