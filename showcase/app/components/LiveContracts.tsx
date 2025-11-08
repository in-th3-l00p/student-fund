"use client";

import { useAccount, useReadContract } from "wagmi";
import { erc20Abi, vaultAbi, treasuryAbi } from "../lib/abis";

function addr(name: string): `0x${string}` | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  if (v.startsWith("0x")) return v as `0x${string}`;
  return undefined;
}

export default function LiveContracts() {
  const { address } = useAccount();
  const edu = addr("NEXT_PUBLIC_EDUCOIN_ADDRESS");
  const star = addr("NEXT_PUBLIC_EDUSTAR_ADDRESS");
  const vault = addr("NEXT_PUBLIC_VAULT_ADDRESS");
  const treasury = addr("NEXT_PUBLIC_DONATION_TREASURY_ADDRESS");

  const eduName = useReadContract({ address: edu, abi: erc20Abi, functionName: "name", query: { enabled: !!edu } });
  const eduBal = useReadContract({
    address: edu,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!edu && !!address },
  });
  const starName = useReadContract({ address: star, abi: erc20Abi, functionName: "name", query: { enabled: !!star } });
  const starBal = useReadContract({
    address: star,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!star && !!address },
  });

  const rate = useReadContract({ address: vault, abi: vaultAbi, functionName: "annualRateBps", query: { enabled: !!vault } });
  const split = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: "donationSplitBps",
    query: { enabled: !!vault },
  });
  const threshold = useReadContract({
    address: treasury,
    abi: treasuryAbi,
    functionName: "distributionThreshold",
    query: { enabled: !!treasury },
  });

  return (
    <div className="w-full rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="font-semibold mb-3">Live Contracts (Connected)</div>
      {!address && <div className="text-sm text-zinc-500 mb-2">Connect a wallet to view balances.</div>}
      <div className="grid gap-3 md:grid-cols-3 text-sm">
        <div className="rounded-md border border-black/10 dark:border-white/10 p-3">
          <div className="font-medium mb-2">EduCoin</div>
          <div>Name: {eduName.data as string || "-"}</div>
          <div>Balance: {eduBal.data ? (eduBal.data as bigint).toString() : "-"}</div>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/10 p-3">
          <div className="font-medium mb-2">EduStar</div>
          <div>Name: {starName.data as string || "-"}</div>
          <div>Balance: {starBal.data ? (starBal.data as bigint).toString() : "-"}</div>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/10 p-3">
          <div className="font-medium mb-2">Vault & Treasury</div>
          <div>APR (bps): {rate.data ? (rate.data as bigint).toString() : "-"}</div>
          <div>Donation Split (bps): {split.data ? (split.data as bigint).toString() : "-"}</div>
          <div>Treasury Threshold (wei): {threshold.data ? (threshold.data as bigint).toString() : "-"}</div>
        </div>
      </div>
      <div className="text-xs text-zinc-500 mt-2">
        Addresses from env: EDU={edu || "-"} | STAR={star || "-"} | VAULT={vault || "-"} | TREASURY={treasury || "-"}
      </div>
    </div>
  );
}


