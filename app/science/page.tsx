import dynamic from 'next/dynamic';
import TopNav from '@/components/shell/TopNav';

const ScienceDashboard = dynamic(() => import('@/components/modes/ScienceDashboard'), {
  ssr: false,
});

export default function ScientificModePage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <TopNav />
      <ScienceDashboard />
    </main>
  );
}

