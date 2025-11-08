type DemoAccount = { label: string; address: string; edu?: number; star?: number; eth?: number };

function parseDemoAccounts(): DemoAccount[] {
  try {
    const raw = process.env.NEXT_PUBLIC_DEMO_ACCOUNTS_JSON;
    if (raw) {
      // Allow either raw JSON or a quoted JSON string
      const trimmed = raw.startsWith("'") || raw.startsWith('"') ? raw.slice(1, -1) : raw;
      const parsed = JSON.parse(trimmed) as DemoAccount[];
      return parsed.map((a) => ({ edu: 0, star: 0, eth: 0, ...a }));
    }
  } catch {}
  return [
    { label: "Deployer", address: "0xDepl0yer...", edu: 0, star: 0, eth: 0 },
    { label: "Alice", address: "0xA1ice...", edu: 20000, star: 0, eth: 5 },
    { label: "Bob", address: "0xB0b...", edu: 10000, star: 0, eth: 5 },
    { label: "ProfA", address: "0xPr0fA...", edu: 1000, star: 0, eth: 1 },
    { label: "ProfB", address: "0xPr0fB...", edu: 1000, star: 0, eth: 1 },
  ];
}

export default function WalletList() {
  const accounts = parseDemoAccounts();
  return (
    <div className="w-full rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="font-semibold mb-3">Demo Wallets</div>
      <div className="grid gap-3 md:grid-cols-2">
        {accounts.map((a) => (
          <div key={a.address} className="rounded-md border border-black/10 dark:border-white/10 p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{a.label}</div>
              <div className="text-xs text-zinc-500">{a.address}</div>
            </div>
            <div className="mt-2 grid grid-cols-3 text-sm">
              <div>
                <div className="text-zinc-500">ETH</div>
                <div>{a.eth ?? 0}</div>
              </div>
              <div>
                <div className="text-zinc-500">EDU</div>
                <div>{a.edu ?? 0}</div>
              </div>
              <div>
                <div className="text-zinc-500">STAR</div>
                <div>{a.star ?? 0}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


