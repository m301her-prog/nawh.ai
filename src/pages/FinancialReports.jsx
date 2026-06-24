import React, { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  ShoppingCart, Truck, Receipt, Package
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { formatCurrency } from '../lib/helpers.js';
import { Card, Spinner, Button, PageHeader } from '../components/ui.jsx';

const PERIODS = [
  { value: 'today',   label: 'اليوم' },
  { value: 'week',    label: 'هذا الأسبوع' },
  { value: 'month',   label: 'هذا الشهر' },
  { value: 'quarter', label: 'هذا الربع' },
  { value: 'year',    label: 'هذا العام' },
  { value: 'custom',  label: 'مخصص' },
];

function getRange(period) {
  const d = new Date();
  const fmt = (x) => x.toISOString().slice(0, 10);
  switch (period) {
    case 'today':   return { from: fmt(d), to: fmt(d) };
    case 'week':    { const w = new Date(d); w.setDate(d.getDate() - 6); return { from: fmt(w), to: fmt(d) }; }
    case 'month':   return { from: fmt(d).slice(0, 7) + '-01', to: fmt(d) };
    case 'quarter': { const q = Math.floor(d.getMonth() / 3); return { from: new Date(d.getFullYear(), q * 3, 1).toISOString().slice(0, 10), to: fmt(d) }; }
    case 'year':    return { from: `${d.getFullYear()}-01-01`, to: fmt(d) };
    default:        return { from: fmt(d).slice(0, 7) + '-01', to: fmt(d) };
  }
}

export default function FinancialReports() {
  const [period, setPeriod]       = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]   = useState('');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => { if (period !== 'custom') fetchReport(); }, [period]);

  async function fetchReport() {
    setLoading(true);
    const range = period === 'custom' ? { from: customFrom, to: customTo } : getRange(period);
    if (!range.from || !range.to) { setLoading(false); return; }

    const [
      { data: salesData },
      { data: purchasesData },
      { data: expensesData },
      { data: salesItems },
      { data: expCats },
    ] = await Promise.all([
      supabase.from('sales_invoices').select('total_amount').eq('status', 'completed').gte('invoice_date', range.from).lte('invoice_date', range.to),
      supabase.from('purchase_invoices').select('total_amount').gte('invoice_date', range.from).lte('invoice_date', range.to),
      supabase.from('expenses').select('amount').gte('expense_date', range.from).lte('expense_date', range.to),
      supabase.from('sales_items').select('product_name, quantity, total_price, invoice:sales_invoices!inner(invoice_date,status)').gte('invoice.invoice_date', range.from).lte('invoice.invoice_date', range.to).eq('invoice.status', 'completed'),
      supabase.from('expenses').select('category, amount').gte('expense_date', range.from).lte('expense_date', range.to),
    ]);

    const totalSales     = (salesData     ?? []).reduce((s, r) => s + r.total_amount, 0);
    const totalPurchases = (purchasesData ?? []).reduce((s, r) => s + r.total_amount, 0);
    const totalExpenses  = (expensesData  ?? []).reduce((s, r) => s + r.amount, 0);

    const productMap = new Map();
    (salesItems ?? []).forEach((item) => {
      const cur = productMap.get(item.product_name) ?? { qty: 0, revenue: 0 };
      productMap.set(item.product_name, { qty: cur.qty + item.quantity, revenue: cur.revenue + item.total_price });
    });
    const topProducts = [...productMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 7);

    const catMap = new Map();
    (expCats ?? []).forEach((e) => catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount));
    const topExpCats = [...catMap.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);

    const { data: dailyData } = await supabase.from('sales_invoices').select('invoice_date, total_amount').eq('status', 'completed').gte('invoice_date', range.from).lte('invoice_date', range.to).order('invoice_date');
    const dayMap = new Map();
    (dailyData ?? []).forEach((r) => dayMap.set(r.invoice_date, (dayMap.get(r.invoice_date) ?? 0) + r.total_amount));
    const dailySales = [...dayMap.entries()].map(([date, total]) => ({ date, total }));

    setData({ totalSales, totalPurchases, totalExpenses, netProfit: totalSales - totalPurchases - totalExpenses, salesCount: salesData?.length ?? 0, avgSale: salesData?.length ? totalSales / salesData.length : 0, topProducts, topExpCats, dailySales });
    setLoading(false);
  }

  const maxSale = Math.max(...(data?.dailySales ?? []).map((d) => d.total), 1);
  const maxProd = Math.max(...(data?.topProducts ?? []).map((p) => p.revenue), 1);
  const maxCat  = Math.max(...(data?.topExpCats  ?? []).map((c) => c.total), 1);

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-5">
      <PageHeader title="التقارير الحسابية" subtitle="أرباح وخسائر ومؤشرات الأداء" />

      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${period === p.value ? 'bg-teal-700 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex gap-2 items-center flex-wrap">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none bg-white" />
            <span className="text-gray-400 text-sm">إلى</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none bg-white" />
            <Button variant="primary" size="sm" onClick={fetchReport}>تطبيق</Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={40} /></div>
      ) : data && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'إجمالي المبيعات',  value: formatCurrency(data.totalSales),     gradient: 'from-teal-600 to-teal-800',     icon: <TrendingUp size={17} /> },
              { label: 'إجمالي المشتريات', value: formatCurrency(data.totalPurchases), gradient: 'from-violet-600 to-violet-800', icon: <Truck size={17} /> },
              { label: 'المصروفات',        value: formatCurrency(data.totalExpenses),  gradient: 'from-red-500 to-red-700',       icon: <Receipt size={17} /> },
              { label: 'صافي الربح',       value: formatCurrency(data.netProfit),      gradient: data.netProfit >= 0 ? 'from-emerald-600 to-emerald-800' : 'from-red-600 to-red-800', icon: data.netProfit >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} /> },
              { label: 'عدد الفواتير',     value: String(data.salesCount),            gradient: 'from-blue-600 to-blue-800',     icon: <ShoppingCart size={17} /> },
              { label: 'متوسط الفاتورة',   value: formatCurrency(data.avgSale),       gradient: 'from-cyan-600 to-cyan-800',     icon: <BarChart3 size={17} /> },
            ].map((item) => (
              <div key={item.label} className={`bg-gradient-to-br ${item.gradient} rounded-2xl p-4 text-white`}>
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-3">{item.icon}</div>
                <p className="text-white/80 text-xs mb-1">{item.label}</p>
                <p className="font-bold text-base leading-tight">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Profit breakdown */}
          <Card className="p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><DollarSign size={15} className="text-teal-600" />تحليل الربحية</h3>
            <div className="space-y-3">
              {[
                { label: '+ المبيعات', value: data.totalSales, color: 'bg-teal-500' },
                { label: '- المشتريات', value: data.totalPurchases, color: 'bg-violet-500' },
                { label: '- المصروفات', value: data.totalExpenses, color: 'bg-red-500' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{row.label}</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(row.value)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${row.color} rounded-full`} style={{ width: `${Math.min(100, (row.value / (data.totalSales || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 flex justify-between">
                <span className="font-bold text-gray-700">= صافي الربح</span>
                <span className={`font-bold text-lg ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(data.netProfit)}
                  <span className="text-xs mr-1 font-normal">({data.totalSales > 0 ? ((data.netProfit / data.totalSales) * 100).toFixed(1) : 0}%)</span>
                </span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Daily sales chart */}
            <Card className="p-5">
              <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><BarChart3 size={15} className="text-teal-600" />المبيعات اليومية</h3>
              {data.dailySales.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">لا توجد بيانات</p> : (
                <div className="flex items-end gap-1 h-36 overflow-x-auto pb-1">
                  {data.dailySales.map((d) => (
                    <div key={d.date} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: Math.max(20, 180 / data.dailySales.length) }}>
                      <span style={{ fontSize: 8 }} className="text-gray-500">{formatCurrency(d.total)}</span>
                      <div className="w-full bg-teal-500 rounded-t-md hover:bg-teal-600 cursor-pointer transition-colors"
                        style={{ height: `${Math.max(4, (d.total / maxSale) * 110)}px` }} title={`${d.date}: ${formatCurrency(d.total)}`} />
                      <span style={{ fontSize: 8, writingMode: 'vertical-rl' }} className="text-gray-400">{d.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top products */}
            <Card className="p-5">
              <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><Package size={15} className="text-amber-500" />أعلى المنتجات مبيعاً</h3>
              {data.topProducts.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">لا توجد بيانات</p> : (
                <div className="space-y-3">
                  {data.topProducts.map((p, i) => (
                    <div key={p.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                          <span className="truncate max-w-28">{p.name}</span>
                        </span>
                        <span className="text-gray-600 text-xs">{formatCurrency(p.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(p.revenue / maxProd) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Expense categories */}
            <Card className="p-5">
              <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><Receipt size={15} className="text-red-500" />توزيع المصروفات</h3>
              {data.topExpCats.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">لا توجد بيانات</p> : (
                <div className="space-y-3">
                  {data.topExpCats.map((c) => (
                    <div key={c.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{c.category}</span>
                        <span className="text-red-600 font-semibold">{formatCurrency(c.total)} <span className="text-gray-400 text-xs">({data.totalExpenses > 0 ? ((c.total / data.totalExpenses) * 100).toFixed(0) : 0}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${(c.total / maxCat) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Summary */}
            <Card className="p-5">
              <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-teal-600" />ملخص تنفيذي</h3>
              <div className="space-y-2">
                {[
                  { label: 'هامش الربح الإجمالي',       value: data.totalSales > 0 ? `${(((data.totalSales - data.totalPurchases) / data.totalSales) * 100).toFixed(1)}%` : '0%', color: 'text-emerald-600' },
                  { label: 'هامش الربح الصافي',         value: data.totalSales > 0 ? `${((data.netProfit / data.totalSales) * 100).toFixed(1)}%` : '0%',               color: data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
                  { label: 'نسبة المصروفات من المبيعات', value: data.totalSales > 0 ? `${((data.totalExpenses / data.totalSales) * 100).toFixed(1)}%` : '0%',               color: 'text-orange-600' },
                  { label: 'عدد الفواتير',              value: String(data.salesCount),                                                                                  color: 'text-blue-600' },
                  { label: 'متوسط الفاتورة',            value: formatCurrency(data.avgSale),                                                                             color: 'text-blue-600' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-600 text-sm">{row.label}</span>
                    <span className={`font-bold text-sm ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
