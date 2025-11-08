export default function AddressesBar() {
  const vars = {
    rpc: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545",
    chainId: process.env.NEXT_PUBLIC_CHAIN_ID || "31337",
    edu: process.env.NEXT_PUBLIC_EDUCOIN_ADDRESS || "0x...",
    star: process.env.NEXT_PUBLIC_EDUSTAR_ADDRESS || "0x...",
    vault: process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x...",
    treasury: process.env.NEXT_PUBLIC_DONATION_TREASURY_ADDRESS || "0x...",
    tasks: process.env.NEXT_PUBLIC_TASK_REGISTRY_ADDRESS || "0x...",
  };
  return (
    <div className="w-full rounded-lg border border-black/10 dark:border-white/10 p-4 text-sm grid grid-cols-1 md:grid-cols-3 gap-2">
      <div>
        <div className="font-semibold mb-1">Network</div>
        <div>RPC: {vars.rpc}</div>
        <div>Chain ID: {vars.chainId}</div>
      </div>
      <div>
        <div className="font-semibold mb-1">Core</div>
        <div>EduCoin: {vars.edu}</div>
        <div>EduStar: {vars.star}</div>
        <div>Vault: {vars.vault}</div>
      </div>
      <div>
        <div className="font-semibold mb-1">Ecosystem</div>
        <div>Treasury: {vars.treasury}</div>
        <div>TaskRegistry: {vars.tasks}</div>
      </div>
    </div>
  );
}


