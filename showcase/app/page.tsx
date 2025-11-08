import AddressesBar from "./components/AddressesBar";
import WalletList from "./components/WalletList";
import Staking from "./components/Staking";
import Treasury from "./components/Treasury";
import Tasks from "./components/Tasks";
import Connect from "./components/Connect";
import LiveContracts from "./components/LiveContracts";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="w-full border-b border-black/10 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="text-xl font-semibold">EduChain Showcase (Mock)</div>
          <Connect />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <AddressesBar />
        <LiveContracts />
        <WalletList />
        <Staking />
        <Treasury />
        <Tasks />
      </main>
      <footer className="max-w-6xl mx-auto px-6 py-8 text-xs text-zinc-500">
        Tip: Once ready, wire these panels to real contracts using the addresses shown above.
      </footer>
    </div>
  );
}
