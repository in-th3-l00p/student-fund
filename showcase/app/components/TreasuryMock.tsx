"use client";
import { useMemo, useState } from "react";

type Prof = { address: string; label: string; weight: number; payout?: number };

export default function TreasuryMock() {
  const [threshold, setThreshold] = useState(5);
  const [balance, setBalance] = useState(10);
  const [profs, setProfs] = useState<Prof[]>([
    { address: "0xProfA...", label: "ProfA", weight: 30 },
    { address: "0xProfB...", label: "ProfB", weight: 70 },
  ]);
  const totalWeight = useMemo(() => profs.reduce((a, p) => a + p.weight, 0), [profs]);
  const [lastDistribution, setLastDistribution] = useState<{ [addr: string]: number }>({});

  const canDistribute = balance >= threshold && totalWeight > 0;

  function distribute() {
    if (!canDistribute) return;
    const result: { [addr: string]: number } = {};
    let sent = 0;
    for (const p of profs) {
      const share = Math.floor((balance * p.weight) / totalWeight);
      result[p.address] = share;
      sent += share;
    }
    setBalance(balance - sent);
    setLastDistribution(result);
  }

  function updateWeight(i: number, weight: number) {
    const next = [...profs];
    next[i] = { ...next[i], weight };
    setProfs(next);
  }

  return (
    <div className="w-full rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="font-semibold mb-3">Donation Treasury (Mock)</div>
      <div className="grid md:grid-cols-3 gap-3 text-sm">
        <div className="rounded-md border border-black/10 dark:border-white/10 p-3">
          <div className="font-medium mb-2">Config</div>
          <div className="mb-2">
            <div className="mb-1">Threshold (ETH)</div>
            <input
              type="number"
              className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value || "0"))}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1">Current Balance (ETH)</div>
            <input
              type="number"
              className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
              value={balance}
              onChange={(e) => setBalance(parseFloat(e.target.value || "0"))}
            />
          </div>
          <button
            className="rounded-full px-4 py-2 bg-foreground text-background text-sm disabled:opacity-50"
            onClick={distribute}
            disabled={!canDistribute}
          >
            Distribute
          </button>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/10 p-3">
          <div className="font-medium mb-2">Professors</div>
          <div className="space-y-3">
            {profs.map((p, i) => (
              <div key={p.address} className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{p.label}</div>
                  <div className="text-xs text-zinc-500">{p.address}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">Weight</span>
                  <input
                    type="number"
                    className="w-20 rounded-md border border-black/10 dark:border-white/10 p-1 bg-transparent"
                    value={p.weight}
                    onChange={(e) => updateWeight(i, parseInt(e.target.value || "0", 10))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/10 p-3">
          <div className="font-medium mb-2">Last Distribution</div>
          {Object.keys(lastDistribution).length === 0 ? (
            <div className="text-zinc-500">No distribution yet.</div>
          ) : (
            <div className="space-y-2">
              {profs.map((p) => (
                <div key={p.address} className="flex items-center justify-between">
                  <span>{p.label}</span>
                  <span>{lastDistribution[p.address] ?? 0} ETH</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


