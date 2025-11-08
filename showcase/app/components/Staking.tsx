"use client";
import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { erc20Abi, vaultAbi } from "../lib/abis";

function toWei(amount: number, decimals = 18) {
  if (!Number.isFinite(amount) || amount <= 0) return BigInt(0);
  const s = BigInt(Math.floor(amount * 10 ** 6)); // 6 dp to avoid FP drift
  const scale = BigInt(10) ** BigInt(decimals - 6);
  return s * scale;
}

export default function Staking() {
  const { address } = useAccount();
  const edu = process.env.NEXT_PUBLIC_EDUCOIN_ADDRESS as `0x${string}` | undefined;
  const vault = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}` | undefined;

  const [assets, setAssets] = useState(1000);
  const [days, setDays] = useState(90);

  const seconds = days * 24 * 3600;
  const assetsWei = useMemo(() => toWei(assets, 18), [assets]);

  const apr = useReadContract({ address: vault, abi: vaultAbi, functionName: "annualRateBps", query: { enabled: !!vault } });
  const split = useReadContract({ address: vault, abi: vaultAbi, functionName: "donationSplitBps", query: { enabled: !!vault } });
  const maxLock = useReadContract({ address: vault, abi: vaultAbi, functionName: "maxLockDuration", query: { enabled: !!vault } });
  const expiry = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "lockExpiry",
    args: [address as `0x${string}`],
    query: { enabled: !!vault && !!address },
  });
  const est = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "estimateDonationSplit",
    args: [assetsWei, BigInt(seconds)],
    query: { enabled: !!vault && assetsWei > BigInt(0) && seconds > 0 },
  });

  // User shares balance in the vault (ERC20)
  const shares = useReadContract({
    address: vault,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!vault && !!address },
  });
  // User EDU balance and allowance
  const eduBal = useReadContract({
    address: edu,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!edu && !!address },
  });
  const allowance = useReadContract({
    address: edu,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address as `0x${string}`, vault as `0x${string}`],
    query: { enabled: !!edu && !!address && !!vault },
  });

  // Approve EDU for vault and depositLocked
  const write = useWriteContract();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  useWaitForTransactionReceipt({ hash: pendingHash, confirmations: 1, query: { enabled: !!pendingHash } });

  const onDeposit = async () => {
    if (!address || !edu || !vault || assetsWei <= BigInt(0)) return;
    try {
      // approve if needed
      const currentAllowance = (allowance.data as bigint | undefined) || BigInt(0);
      if (currentAllowance < assetsWei) {
        const tx1 = await write.writeContractAsync({
          address: edu,
          abi: erc20Abi,
          functionName: "approve",
          args: [vault, assetsWei],
        });
        setPendingHash(tx1);
      }
      // deposit + lock
      const tx2 = await write.writeContractAsync({
        address: vault,
        abi: vaultAbi,
        functionName: "depositLocked",
        args: [assetsWei, address, BigInt(seconds)],
      });
      setPendingHash(tx2);
    } catch (e) {
      // noop
    }
  };

  const onWithdrawAll = async () => {
    if (!address || !vault) return;
    const sh = (shares.data as bigint | undefined) || BigInt(0);
    if (sh <= BigInt(0)) return;
    // enforce UI guard for lock
    const until = (expiry.data as bigint | undefined) || BigInt(0);
    if (until > BigInt(0) && BigInt(Math.floor(Date.now() / 1000)) < until) {
      return;
    }
    try {
      const tx = await write.writeContractAsync({
        address: vault,
        abi: vaultAbi,
        functionName: "redeem",
        args: [sh, address, address],
      });
      setPendingHash(tx);
    } catch (e) {
      // noop
    }
  };

  const onSimulate = async () => {
    if (!address || !vault || assetsWei <= BigInt(0) || seconds <= 0) return;
    try {
      const tx = await write.writeContractAsync({
        address: vault,
        abi: vaultAbi,
        functionName: "simulateAndCreditShowcase",
        args: [address, assetsWei, BigInt(seconds)],
      });
      setPendingHash(tx);
    } catch (e) {
      // noop
    }
  };

  const donation = (est.data?.[0] as bigint | undefined) ?? BigInt(0);
  const userCredit = (est.data?.[1] as bigint | undefined) ?? BigInt(0);
  const eduBalNum = (eduBal.data as bigint | undefined) ?? BigInt(0);
  const until = (expiry.data as bigint | undefined) ?? BigInt(0);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const locked = until > now;
  const maxLockSeconds = (maxLock.data as bigint | undefined) ?? BigInt(365 * 24 * 3600);
  const maxDays = Number(maxLockSeconds) / (24 * 3600);

  return (
    <div className="w-full rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="font-semibold mb-3">Staking Vault</div>
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
            <div className="text-xs text-zinc-500 mt-1">Your EDU balance: {eduBalNum.toString()}</div>
          </div>
          <div className="text-sm">
            <div className="mb-1">Lock duration (days)</div>
            <input
              type="range"
              min={1}
              max={Number.isFinite(maxDays) && maxDays > 0 ? Math.floor(maxDays) : 365}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <div>{days} days</div>
            {locked && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                Locked until {until.toString()} (unix). Withdraw disabled.
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-zinc-500">APR (bps)</div>
              <div>{apr.data === undefined ? "-" : (apr.data as bigint).toString()}</div>
            </div>
            <div>
              <div className="text-zinc-500">Donation split (bps)</div>
              <div>{split.data === undefined ? "-" : (split.data as bigint).toString()}</div>
            </div>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-black/10 dark:border-white/10 p-3">
            <div className="font-medium mb-2">Estimated Yield (on-chain)</div>
            <div className="flex items-center justify-between">
              <span>Donation (EduCoin)</span>
              <span>{donation.toString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>User Credit (EduStar)</span>
              <span>{userCredit.toString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onDeposit} className="rounded-full px-4 py-2 bg-foreground text-background text-sm" disabled={!address || !edu || !vault || assetsWei <= BigInt(0)}>
              Deposit + Lock
            </button>
            <button onClick={onWithdrawAll} className="rounded-full px-4 py-2 border border-black/10 dark:border-white/10 text-sm" disabled={!address || locked}>
              Withdraw All
            </button>
            <button onClick={onSimulate} className="rounded-full px-4 py-2 border border-black/10 dark:border-white/10 text-sm" disabled={!address || !vault || assetsWei <= BigInt(0)}>
              Simulate + Credit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


