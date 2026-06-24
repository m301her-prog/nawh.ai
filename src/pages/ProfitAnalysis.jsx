import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Package } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { formatCurrency } from '../lib/helpers.js';
import { Card, Spinner, Button, PageHeader } from '../components/ui.jsx';

const PERIODS = [
  { value: 'month', label: 'هذا الشهر' },
  { value: 'quarter', label: 'هذا الربع' },
  { value: 'year', label: 'هذا العام' },
];

function getRange(period) {
  const d = new Date();
  const fmt = (x) => x.toISOString().slice(0, 10);
  switch (period) {
    case 'quarter': { const q = Math.floor(d.getMonth() / 3); return { from: new Date(d.getFullYear(), q * 3, 1).toISOString().slice(0, 10), to: fmt(d) }; }
    case 'year':    return { from: `${d.getFullYear()}-01-01`, to: fmt(d) };
    default:        return { from: fmt(d).slice(0, 7) + '-01', to: fmt(d) };
  }
}

export default function ProfitAnalysis() {
  const [period, setPeriod] = useState('month');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [period]);

  async function fetchData() {
    setLoading(true);
    const { from, to } = getRange(period);

    const [
      { data: salesData },
      { data: purchData },
      { data: expData },
      { data: itemsData },
      { data: products },
    ] = await Promise.all([
      supabase.from('sales_invoices').select('total_amount, discount_amount').eq('status', 'completed').gte('invoice_date', from).lte('invoice_date', to),
      supabase.from('purchase_invoices').select('total_amount').gte('invoice_date', from).lte('invoice_date', to),
      supabase.from('expenses').select('amount, category').gte('expense_date', from).lte('expense_date', to),
      supabase.from('sales_items').select('product_id, product_name, quantity, total_price, unit_price, invoice:sales_invoices!inner(invoice_date,status)').gte('invoice.invoice_date', from).lte('invoice.invoice_date', to).eq('invoice.status', 'completed'),
      supabase.from('products').select('id, cost_price').eq('is_active', true),
    ]);

    const totalRevenue   = (salesData ?? []).reduce((s, r) => s + r.total_amount, 0);
    const totalPurchases = (purchData  ?? []).reduce((s, r) => s + r.total_amount, 0);
    const totalExpenses  = (expData    ?? []).reduce((s, r) => s + r.amount, 0);
    const totalDiscounts = (salesData ?? []).reduce((s, r) => s + r.discount_amount, 0);

    // Cost of goods sold from items
    const costMap = new Map((products ?? []).map((p) => [p.id, p.cost_price]));
    const costOfGoods = (itemsData ?? []).reduce((s, item) => s + item.quantity * (costMap.get(item.product_id) ?? 0), 0);
    const grossProfit  = totalRevenue - costOfGoods;
    const netProfit    = grossProfit - totalExpenses;

    // Per-product margin
    const prodMap = new Map();
    (itemsData ?? []).forEach((item) => {
      const costPrice = costMap.get(item.product_id) ?? 0;
      const cur = prodMap.get(item.product_name) ?? { revenue: 0, cost: 0, qty: 0 };
      prodMap.set(item.product_name, {
        revenue: cur.revenue + item.total_price,
        cost: cur.cost + item.quantity * costPrice,
        qty: cur.qty + item.quantity,
      });
    });
    const productMargins = [...prodMap.entries()].map(([name, v]) => ({
      name, revenue: v.revenue, cost: v.cost, qty: v.qty,
      profit: v.revenue - v.cost,
      margin: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
    })).sort((a, b) => b.profit - a.profit).slice(0, 10);

    setData({ totalRevenue, totalPurchases, totalExpenses, totalDiscounts, costOfGoods, grossProfit, netProfit, grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0, netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0, productMargins });
    setLoading(false);
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-5">
      <PageHeader title="تحليل الربح والمكسب" subtitle="هوامش الربح وتكلفة البضاعة المباعة" />

      {/* Period */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${period === p.value ? 'bg-teal-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner size={40} /></div> : data && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'إجمالي الإيرادات', value: formatCurrency(data.totalRevenue), gradient: 'from-teal-600 to-teal-800', icon: <TrendingUp size={17} /> },
              { label: 'تكلفة البضاعة',   value: formatCurrency(data.costOfGoods), gradient: 'from-violet-600 to-violet-800', icon: <Package size={17} /> },
              { label: 'الربح الإجمالي',  value: formatCurrency(data.grossProfit), gradient: data.grossProfit >= 0 ? 'from-emerald-600 to-emerald-800' : 'from-red-600 to-red-800', icon: <DollarSign size={17} /> },
              { label: 'الربح الصافي',    value: formatCurrency(data.netProfit),   gradient: data.netProfit >= 0 ? 'from-amber-500 to-amber-700' : 'from-red-600 to-red-800', icon: data.netProfit >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} /> },
            ].map((item) => (
              <div key={item.label} className={`bg-gradient-to-br ${item.gradient} rounded-2xl p-5 text-white`}>
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">{item.icon}</div>
                <p className="text-white/80 text-xs mb-1">{item.label}</p>
                <p className="font-bold text-xl leading-tight">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Margin gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 text-center">
              <p className="text-gray-500 text-sm mb-2">هامش الربح الإجمالي</p>
              <div className="relative w-32 h-32 mx-auto mb-3">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0d9488" strokeWidth="3"
                    strokeDasharray={`${Math.min(100, data.grossMargin)}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-teal-700">{data.grossMargin.toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-gray-600 text-sm">هامش الإجمالي</p>
            </Card>
            <Card className="p-5 text-center">
              <p className="text-gray-500 text-sm mb-2">هامش الربح الصافي</p>
              <div className="relative w-32 h-32 mx-auto mb-3">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={data.netMargin >= 0 ? '#10b981' : '#ef4444'} strokeWidth="3"
                    strokeDasharray={`${Math.min(100, Math.abs(data.netMargin))}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${data.netMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{data.netMargin.toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-gray-600 text-sm">هامش الصافي</p>
            </Card>
          </div>

          {/* P&L breakdown */}
          <Card className="p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><BarChart3 size={15} className="text-teal-600" />قائمة الأرباح والخسائر</h3>
            <div className="space-y-2">
              {[
                { label: 'إجمالي الإيرادات',     value: data.totalRevenue,   color: 'text-teal-700',    sign: '+' },
                { label: 'الخصومات الممنوحة',    value: data.totalDiscounts,  color: 'text-gray-500',   sign: '-' },
                { label: 'تكلفة البضاعة المباعة', value: data.costOfGoods,    color: 'text-violet-600',  sign: '-' },
                { label: 'الربح الإجمالي',        value: data.grossProfit,    color: data.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600', sign: '=' },
                { label: 'المصروفات التشغيلية',   value: data.totalExpenses,  color: 'text-red-600',     sign: '-' },
                { label: 'صافي الربح',            value: data.netProfit,      color: data.netProfit >= 0 ? 'text-emerald-700 font-bold text-base' : 'text-red-600 font-bold text-base', sign: '=' },
              ].map((row) => (
                <div key={row.label} className={`flex justify-between py-2.5 border-b border-gray-50 ${row.sign === '=' ? 'border-t border-gray-200 mt-1 pt-3' : ''}`}>
                  <span className="text-gray-600 text-sm flex items-center gap-1.5">
                    <span className={`text-xs font-bold w-4 ${row.sign === '+' ? 'text-teal-500' : row.sign === '-' ? 'text-red-400' : 'text-gray-400'}`}>{row.sign}</span>
                    {row.label}
                  </span>
                  <span className={`text-sm ${row.color}`}>{formatCurrency(row.value)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Product margins table */}
          <Card>
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Package size={16} className="text-amber-500" />
              <h3 className="font-bold text-gray-700 text-sm">هامش ربح كل منتج</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['المنتج', 'الكمية', 'الإيراد', 'التكلفة', 'الربح', 'الهامش'].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.productMargins.map((p) => (
                    <tr key={p.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.qty}</td>
                      <td className="px-4 py-3 text-sm text-teal-700 font-semibold">{formatCurrency(p.revenue)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(p.cost)}</td>
                      <td className={`px-4 py-3 text-sm font-bold ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(p.profit)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-16">
                            <div className={`h-full rounded-full ${p.margin >= 20 ? 'bg-emerald-500' : p.margin >= 10 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(100, p.margin)}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${p.margin >= 20 ? 'text-emerald-600' : p.margin >= 10 ? 'text-amber-600' : 'text-red-600'}`}>{p.margin.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
