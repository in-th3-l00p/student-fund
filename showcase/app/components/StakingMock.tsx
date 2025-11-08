"use client";
import { useMemo, useState } from "react";

export default function StakingMock() {
  const [assets, setAssets] = useState(1000);
  const [days, setDays] = useState(90);
  const [aprBps, setAprBps] = useState(600); // 6%
  const [donationSplitBps, setDonationSplitBps] = useState(2500); // 25%

  const totalYield = useMemo(() => {
    const seconds = days * 24 * 3600;
    return Math.floor((assets * aprBps * seconds) / (10000 * 365 * 24 * 3600));
  }, [assets, days, aprBps]);

  const donation = Math.floor((totalYield * donationSplitBps) / 10000);
  const userCredit = totalYield - donation;

  return (
    <div className="w-full rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="font-semibold mb-3">Staking Vault (Mock)</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-3">
          <div className="text-sm">
            <div className="mb-1">Deposit amount (EDU)</div>
            <input
              type="number"
              className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
              value={assets}
              onChange={(e) => setAssets(parseInt(e.target.value || "0", 10))}
              min={0}
            />
          </div>
          <div className="text-sm">
            <div className="mb-1">Lock duration (days)</div>
            <input
              type="range"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <div>{days} days</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="mb-1">APR (bps)</div>
              <input
                type="number"
                className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
                value={aprBps}
                onChange={(e) => setAprBps(parseInt(e.target.value || "0", 10))}
              />
            </div>
            <div>
              <div className="mb-1">Donation split (bps)</div>
              <input
                type="number"
                className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
                value={donationSplitBps}
                onChange={(e) => setDonationSplitBps(parseInt(e.target.value || "0", 10))}
              />
            </div>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-black/10 dark:border-white/10 p-3">
            <div className="font-medium mb-2">Estimated Yield</div>
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span>{totalYield} EDU</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Donation</span>
              <span>{donation} EDU</span>
            </div>
            <div className="flex items-center justify-between">
              <span>User Credit (STAR)</span>
              <span>{userCredit} STAR</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-full px-4 py-2 bg-foreground text-background text-sm">Deposit + Lock</button>
            <button className="rounded-full px-4 py-2 border border-black/10 dark:border-white/10 text-sm">Withdraw</button>
          </div>
        </div>
      </div>
    </div>
  );
}


