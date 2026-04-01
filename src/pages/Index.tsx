import { useState } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import StoreManager from '@/components/StoreManager';
import PiutangManager from '@/components/PiutangManager';
import StoreSummary from '@/components/StoreSummary';
import OperasionalManager from '@/components/OperasionalManager';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'stores' && <StoreManager />}
      {activeTab === 'piutang' && <PiutangManager />}
      {activeTab === 'operasional' && <OperasionalManager />}
      {activeTab === 'rekap' && <StoreSummary />}
    </Layout>
  );
};

export default Index;
