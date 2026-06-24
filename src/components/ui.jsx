import React from 'react';
import { X } from 'lucide-react';

/* ─── Button ─── */
export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }) {
  const variants = {
    primary:   'bg-teal-600 hover:bg-teal-700 text-white shadow-sm',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200',
    danger:    'bg-red-500 hover:bg-red-600 text-white',
    ghost:     'bg-transparent hover:bg-gray-100 text-gray-600',
    success:   'bg-emerald-500 hover:bg-emerald-600 text-white',
    gold:      'bg-gold-400 hover:bg-gold-500 text-white shadow-sm',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      className={`inline-flex items-center gap-2 font-medium rounded-xl transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── Input ─── */
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all duration-200 outline-none bg-white
          ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

/* ─── Select ─── */
export function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select
        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all duration-200 outline-none bg-white
          ${error ? 'border-red-400' : 'border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'}
          ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

/* ─── Card ─── */
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

/* ─── Badge ─── */
export function Badge({ children, color = 'gray' }) {
  const colors = {
    green:  'bg-emerald-100 text-emerald-700',
    red:    'bg-red-100 text-red-700',
    yellow: 'bg-amber-100 text-amber-700',
    blue:   'bg-blue-100 text-blue-700',
    gray:   'bg-gray-100 text-gray-600',
    teal:   'bg-teal-100 text-teal-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  );
}

/* ─── Modal ─── */
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── Spinner ─── */
export function Spinner({ size = 24 }) {
  return (
    <div
      className="inline-block animate-spin rounded-full border-2 border-gray-200 border-t-teal-600"
      style={{ width: size, height: size }}
    />
  );
}

/* ─── EmptyState ─── */
export function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
        {icon}
      </div>
      <h3 className="text-gray-600 font-medium text-sm mb-1">{title}</h3>
      {description && <p className="text-gray-400 text-xs max-w-xs">{description}</p>}
    </div>
  );
}

/* ─── PageHeader ─── */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ─── StatCard ─── */
export function StatCard({ label, value, sub, icon, gradient }) {
  return (
    <div className={`rounded-2xl p-5 text-white ${gradient} relative overflow-hidden`}>
      <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-8 -right-4 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
          {icon}
        </div>
        <p className="text-white/80 text-xs mb-1">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-white/70 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}
