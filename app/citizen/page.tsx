import dynamic from 'next/dynamic';
import TopNav from '@/components/shell/TopNav';

const CitizenDashboard = dynamic(() => import('@/components/modes/CitizenDashboard'), {
  ssr: false,
});

export default function CitizenModePage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <TopNav />
      <CitizenDashboard />
    </main>
  );
}

