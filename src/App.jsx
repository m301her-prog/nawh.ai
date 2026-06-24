import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header, BottomNav } from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Sales from './pages/Sales.jsx';
import Purchases from './pages/Purchases.jsx';
import Inventory from './pages/Inventory.jsx';
import FinancialReports from './pages/FinancialReports.jsx';
import RecurringInvoices from './pages/RecurringInvoices.jsx';
import EditSales from './pages/EditSales.jsx';
import Expenses from './pages/Expenses.jsx';
import ProfitAnalysis from './pages/ProfitAnalysis.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import CustomersPage from './pages/CustomersPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"                  element={<Dashboard />} />
          <Route path="/sales"             element={<Sales />} />
          <Route path="/purchases"         element={<Purchases />} />
          <Route path="/inventory"         element={<Inventory />} />
          <Route path="/reports"           element={<FinancialReports />} />
          <Route path="/recurring"         element={<RecurringInvoices />} />
          <Route path="/edit-sales"        element={<EditSales />} />
          <Route path="/expenses"          element={<Expenses />} />
          <Route path="/profit-analysis"   element={<ProfitAnalysis />} />
          <Route path="/notifications"     element={<NotificationsPage />} />
          <Route path="/customers"         element={<CustomersPage />} />
          <Route path="/settings"          element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
