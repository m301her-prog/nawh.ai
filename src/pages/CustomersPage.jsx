import React, { useEffect, useState } from 'react';
import { Search, User, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { formatCurrency, formatDate } from '../lib/helpers.js';
import { Card, Spinner, EmptyState, PageHeader } from '../components/ui.jsx';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from('sales_invoices')
      .select('customer_name, customer_phone, total_amount, invoice_date')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    // Group by customer name
    const map = new Map();
    (data ?? []).forEach((inv) => {
      const key = inv.customer_name;
      const cur = map.get(key) ?? { name: inv.customer_name, phone: inv.customer_phone, count: 0, total: 0, last: '' };
      map.set(key, { ...cur, count: cur.count + 1, total: cur.total + inv.total_amount, last: inv.invoice_date > cur.last ? inv.invoice_date : cur.last });
    });
    setCustomers([...map.values()].sort((a, b) => b.total - a.total));
    setLoading(false);
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? '').includes(search)
  );

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <PageHeader title="العملاء" subtitle="قائمة العملاء وسجل مشترياتهم" />
      <div className="relative mb-4">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن عميل..."
          className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 bg-white" />
      </div>
      <Card>
        {loading ? <div className="flex justify-center py-12"><Spinner size={36} /></div> :
         filtered.length === 0 ? <EmptyState icon={<User size={28} />} title="لا يوجد عملاء" /> : (
          <div className="divide-y divide-gray-50">
            {filtered.map((c) => (
              <div key={c.name} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                  {c.phone && <p className="text-gray-400 text-xs flex items-center gap-1"><Phone size={10} />{c.phone}</p>}
                  <p className="text-gray-400 text-xs">آخر شراء: {formatDate(c.last)}</p>
                </div>
                <div className="text-left">
                  <p className="text-teal-700 font-bold text-sm">{formatCurrency(c.total)}</p>
                  <p className="text-gray-400 text-xs">{c.count} فاتورة</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
