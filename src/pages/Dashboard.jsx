import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Package, Truck, Receipt, BarChart3, RefreshCw,
  Edit3, TrendingUp, AlertTriangle, Activity, DollarSign
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { formatCurrency, today, monthStart } from '../lib/helpers.js';
import { StatCard, Card, Spinner } from '../components/ui.jsx';

/* ── 3×3 Grid card definitions ── */
const GRID_CARDS = [
  {
    path: '/sales',
    title: 'المبيعات',
    desc: 'إنشاء وإدارة فواتير البيع',
    gradient: 'from-teal-600 to-teal-800',
    iconBg: 'bg-teal-500',
    Icon: ShoppingCart,
  },
  {
    path: '/purchases',
    title: 'المشتريات',
    desc: 'تسجيل بضائع الموردين',
    gradient: 'from-violet-600 to-violet-800',
    iconBg: 'bg-violet-500',
    Icon: Truck,
  },
  {
    path: '/inventory',
    title: 'المخزون',
    desc: 'إدارة الأصناف والكميات',
    gradient: 'from-amber-500 to-amber-700',
    iconBg: 'bg-amber-400',
    Icon: Package,
  },
  {
    path: '/reports',
    title: 'التقارير الحسابية',
    desc: 'أرباح وخسائر ومؤشرات',
    gradient: 'from-cyan-600 to-cyan-800',
    iconBg: 'bg-cyan-500',
    Icon: BarChart3,
  },
  {
    path: '/recurring',
    title: 'فواتير دائمة',
    desc: 'فواتير بيع متكررة',
    gradient: 'from-orange-500 to-orange-700',
    iconBg: 'bg-orange-400',
    Icon: RefreshCw,
  },
  {
    path: '/edit-sales',
    title: 'تعديل المبيعات',
    desc: 'مراجعة وتعديل الفواتير',
    gradient: 'from-blue-600 to-blue-800',
    iconBg: 'bg-blue-500',
    Icon: Edit3,
  },
  {
    path: '/expenses',
    title: 'المصروفات',
    desc: 'النفقات التشغيلية اليومية',
    gradient: 'from-red-500 to-red-700',
    iconBg: 'bg-red-400',
    Icon: Receipt,
  },
  {
    path: '/profit-analysis',
    title: 'تحليل الربح',
    desc: 'تحليل المكسب والهامش',
    gradient: 'from-emerald-600 to-emerald-800',
    iconBg: 'bg-emerald-500',
    Icon: TrendingUp,
  },
  {
    path: '/reports',
    title: 'الإحصاءات',
    desc: 'ملخص شامل للأداء',
    gradient: 'from-teal-700 to-gray-800',
    iconBg: 'bg-teal-600',
    Icon: Activity,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    const todayDate = today();
    const monthStartDate = monthStart();

    const [
      { data: todaySales },
      { data: products },
      { data: monthSalesData },
      { data: monthPurchasesData },
      { data: monthExpensesData },
    ] = await Promise.all([
      supabase.from('sales_invoices').select('total_amount').eq('invoice_date', todayDate).eq('status', 'completed'),
      supabase.from('products').select('id, name, stock_qty, min_stock_qty, unit').eq('is_active', true),
      supabase.from('sales_invoices').select('total_amount').gte('invoice_date', monthStartDate).eq('status', 'completed'),
      supabase.from('purchase_invoices').select('total_amount').gte('invoice_date', monthStartDate),
      supabase.from('expenses').select('amount').gte('expense_date', monthStartDate),
    ]);

    const todayTotal = (todaySales ?? []).reduce((s, r) => s + r.total_amount, 0);
    const monthSales = (monthSalesData ?? []).reduce((s, r) => s + r.total_amount, 0);
    const monthPurchases = (monthPurchasesData ?? []).reduce((s, r) => s + r.total_amount, 0);
    const monthExpenses = (monthExpensesData ?? []).reduce((s, r) => s + r.amount, 0);

    setStats({
      todayTotal,
      todayCount: todaySales?.length ?? 0,
      monthSales,
      monthPurchases,
      monthExpenses,
      netProfit: monthSales - monthPurchases - monthExpenses,
      totalProducts: products?.length ?? 0,
    });
    setLowStock((products ?? []).filter((p) => p.stock_qty <= p.min_stock_qty).slice(0, 4));
    setLoading(false);
  }

  return (
    <div className="p-4 max-w-2xl mx-auto lg:max-w-5xl space-y-5">

      {/* KPI Row */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size={36} /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="مبيعات اليوم"
            value={formatCurrency(stats.todayTotal)}
            sub={`${stats.todayCount} فاتورة`}
            gradient="bg-gradient-to-br from-teal-600 to-teal-800"
            icon={<ShoppingCart size={18} />}
          />
          <StatCard
            label="مبيعات الشهر"
            value={formatCurrency(stats.monthSales)}
            gradient="bg-gradient-to-br from-blue-600 to-blue-800"
            icon={<Activity size={18} />}
          />
          <StatCard
            label="مصروفات الشهر"
            value={formatCurrency(stats.monthExpenses)}
            gradient="bg-gradient-to-br from-red-500 to-red-700"
            icon={<Receipt size={18} />}
          />
          <StatCard
            label="صافي الربح"
            value={formatCurrency(stats.netProfit)}
            gradient={stats.netProfit >= 0 ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : 'bg-gradient-to-br from-red-600 to-red-800'}
            icon={<TrendingUp size={18} />}
          />
        </div>
      )}

      {/* 3×3 Main Grid */}
      <div>
        <h2 className="text-gray-600 font-semibold text-xs mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-teal-600 rounded-full inline-block" />
          أقسام النظام
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {GRID_CARDS.map((card) => {
            const Icon = card.Icon;
            return (
              <button
                key={card.path + card.title}
                onClick={() => navigate(card.path)}
                className={`group relative flex flex-col items-center text-center gap-3 p-4 rounded-2xl
                  bg-gradient-to-br ${card.gradient} text-white
                  shadow-lg hover:scale-105 active:scale-95 transition-all duration-200
                  overflow-hidden`}
              >
                {/* Decorative circles */}
                <span className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10 pointer-events-none" />
                <span className="absolute -bottom-5 -left-3 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />

                {/* Icon */}
                <div className={`relative w-11 h-11 rounded-xl ${card.iconBg} bg-opacity-70 flex items-center justify-center
                  group-hover:scale-110 transition-transform duration-200`}>
                  <Icon size={22} />
                </div>

                {/* Text */}
                <div className="relative">
                  <p className="font-bold text-sm leading-tight">{card.title}</p>
                  <p className="text-white/70 text-xs mt-0.5 hidden sm:block line-clamp-2">{card.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <Card>
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="font-semibold text-gray-700 text-sm">تنبيهات المخزون المنخفض</span>
            <span className="mr-auto bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {lowStock.length} أصناف
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {lowStock.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <p className="text-gray-700 text-sm font-medium">{p.name}</p>
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-lg">
                  {p.stock_qty} {p.unit}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Monthly Summary */}
      {!loading && stats && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <DollarSign size={15} className="text-teal-600" />
            ملخص هذا الشهر
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'المبيعات',   value: stats.monthSales,      color: 'text-teal-700 bg-teal-50' },
              { label: 'المشتريات', value: stats.monthPurchases,   color: 'text-violet-700 bg-violet-50' },
              { label: 'المصروفات', value: stats.monthExpenses,    color: 'text-red-700 bg-red-50' },
              { label: 'الربح الصافي', value: stats.netProfit,     color: `${stats.netProfit >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}` },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl p-3 text-center ${item.color}`}>
                <p className="text-gray-500 text-xs mb-1">{item.label}</p>
                <p className={`font-bold text-sm ${item.color.split(' ')[0]}`}>{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
