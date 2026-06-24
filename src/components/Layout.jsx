import React, { useState } from 'react';
import { Bell, MessageSquare, Home, Users, Settings, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function Header() {
  const today = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-teal-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
      {/* Right: Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gold-400 flex items-center justify-center shadow-sm flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
          </svg>
        </div>
        <div className="hidden sm:block">
          <p className="font-bold text-sm leading-tight">نواة AI</p>
          <p className="text-teal-300 text-xs">نظام إدارة نقطة البيع (POS) - محل عامية</p>
        </div>
      </div>

      {/* Center: Date (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-1.5 text-teal-200 text-xs bg-teal-800 px-3 py-1.5 rounded-full">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {today}
      </div>

      {/* Left: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-xl bg-teal-800 hover:bg-teal-700 flex items-center justify-center transition-colors">
          <Bell size={16} />
          <span className="absolute -top-1 -left-1 w-4 h-4 bg-gold-400 rounded-full text-xs font-bold flex items-center justify-center text-teal-900">
            3
          </span>
        </button>
        {/* Messages */}
        <button className="relative w-9 h-9 rounded-xl bg-teal-800 hover:bg-teal-700 flex items-center justify-center transition-colors">
          <MessageSquare size={16} />
        </button>
      </div>
    </header>
  );
}

const NAV_ITEMS = [
  { path: '/', label: 'الرئيسية', icon: Home },
  { path: '/notifications', label: 'الإشعارات', icon: Bell },
  { path: '/customers', label: 'العملاء', icon: Users },
  { path: '/settings', label: 'الإعدادات', icon: Settings },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-teal-900 border-t border-teal-800 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-200 min-w-0
                ${active ? 'text-gold-400' : 'text-teal-400 hover:text-teal-200'}`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{item.label}</span>
              {active && <span className="w-1 h-1 rounded-full bg-gold-400" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
