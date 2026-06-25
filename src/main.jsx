import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// إضافة فحص بسيط للتأكد من وجود العنصر قبل محاولة الرندرة
const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("خطأ: لم يتم العثور على عنصر 'root' في صفحة الـ HTML!");
}
