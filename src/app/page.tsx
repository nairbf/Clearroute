import { Header } from '@/components/Header';
import { MainView } from '@/components/MainView';
import { BottomNav } from '@/components/BottomNav';
import { Disclaimer } from '@/components/Disclaimer';

export default function Home() {
  return (
    <main className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <Header />
      
      {/* Disclaimer banner */}
      <Disclaimer />
      
      {/* Main content (Map or Feed) */}
      <div className="flex-1 relative overflow-hidden">
        <MainView />
      </div>
      
      {/* Bottom navigation */}
      <BottomNav />
    </main>
  );
}
