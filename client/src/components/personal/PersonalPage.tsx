import { useState, useEffect } from 'react';
import PersonalSidebar from './PersonalSidebar';
import PersonalProfile from './PersonalProfile';
import InterestedProducts from './InterestedProducts';
import PostedProducts from './PostedProducts';
import QueueManagement from './QueueManagement';

interface PersonalPageProps {
  user: any;
  initialTab?: string;
  onProductClick: (product: any) => void;
}

export default function PersonalPage({ user, initialTab = 'profile', onProductClick }: PersonalPageProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <PersonalProfile user={user} />;
      case 'interested':
        return <InterestedProducts user={user} onProductClick={onProductClick} />;
      case 'posted':
        return <PostedProducts user={user} onProductClick={onProductClick} />;
      case 'queue':
        return <QueueManagement user={user} />;
      default:
        return <PersonalProfile user={user} />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar on the right (RTL natively via flex-row + dir=rtl in index.html/body) */}
        <PersonalSidebar 
          user={user} 
          activeTab={activeTab} 
          onSelectTab={setActiveTab} 
        />

        {/* Main Content Area */}
        <main className="flex-1 bg-gray-50 rounded-2xl min-h-[600px]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
