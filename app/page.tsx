import TopNav from '@/components/shell/TopNav';
import ModeSelection from '@/components/ModeSelection';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <TopNav />
      <ModeSelection />
    </main>
  );
}
