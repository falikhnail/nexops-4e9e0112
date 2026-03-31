import { useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import StoreManager from '@/components/StoreManager';
import PiutangManager from '@/components/PiutangManager';
import StoreSummary from '@/components/StoreSummary';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [key, setKey] = useState(0);
  const forceUpdate = useCallback(() => setKey(k => k + 1), []);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard key={key} />}
      {activeTab === 'stores' && <StoreManager key={key} onUpdate={forceUpdate} />}
      {activeTab === 'piutang' && <PiutangManager key={key} onUpdate={forceUpdate} />}
      {activeTab === 'rekap' && <StoreSummary key={key} />}
    </Layout>
  );
};

export default Index;
