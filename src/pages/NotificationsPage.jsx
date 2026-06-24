import React from 'react';
import { Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { PageHeader, Card } from '../components/ui.jsx';

const NOTIFICATIONS = [
  { id: 1, type: 'warning', title: 'مخزون منخفض', body: 'بعض الأصناف وصلت للحد الأدنى، يرجى المراجعة.', time: 'منذ 10 دقائق' },
  { id: 2, type: 'success', title: 'تم إتمام البيع', body: 'تم حفظ فاتورة SAL-20260624-0001 بنجاح.', time: 'منذ ساعة' },
  { id: 3, type: 'info', title: 'تذكير بالفاتورة الدائمة', body: 'فاتورة عميل: أحمد محمد - حان موعد تجديدها.', time: 'منذ 3 ساعات' },
];

const ICONS = { warning: <AlertTriangle size={18} className="text-amber-500" />, success: <CheckCircle size={18} className="text-emerald-500" />, info: <Info size={18} className="text-blue-500" /> };
const BG    = { warning: 'bg-amber-50', success: 'bg-emerald-50', info: 'bg-blue-50' };

export default function NotificationsPage() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <PageHeader title="الإشعارات" subtitle="آخر التنبيهات والأحداث" />
      <Card>
        <div className="divide-y divide-gray-50">
          {NOTIFICATIONS.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 p-4 ${BG[n.type]}`}>
              <div className="mt-0.5">{ICONS[n.type]}</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{n.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{n.body}</p>
                <p className="text-gray-400 text-xs mt-1">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
