"use client";
import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { treasuryAbi } from "../lib/abis";
import AccountRow from "./AccountRow";

type ChainAccount = { label: string; address: `0x${string}` };

function envAddress(v: string | undefined): `0x${string}` | undefined {
  if (!v) return undefined;
  return v.startsWith("0x") ? (v as `0x${string}`) : undefined;
}

function short(addr: string) {
  return addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export default function WalletList() {
  const { address: connected } = useAccount();
  const edu = envAddress(process.env.NEXT_PUBLIC_EDUCOIN_ADDRESS);
  const star = envAddress(process.env.NEXT_PUBLIC_EDUSTAR_ADDRESS);
  const treasury = envAddress(process.env.NEXT_PUBLIC_DONATION_TREASURY_ADDRESS);

  // Fetch professor addresses from the on-chain treasury registry
  const profs = useReadContract({
    address: treasury,
    abi: treasuryAbi,
    functionName: "getProfessors",
    query: { enabled: !!treasury },
  });

  // Build the list: connected user (if any) + professors from chain (unique)
  const accounts: ChainAccount[] = useMemo(() => {
    const list: ChainAccount[] = [];
    if (connected) list.push({ label: "You", address: connected as `0x${string}` });
    const arr = (profs.data as `0x${string}`[] | undefined) || [];
    arr.forEach((addr, idx) => {
      if (!addr) return;
      if (list.some((a) => a.address.toLowerCase() === addr.toLowerCase())) return;
      list.push({ label: `Professor #${idx + 1}`, address: addr });
    });
    return list;
  }, [connected, profs.data]);

  return (
    <div className="w-full rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="font-semibold mb-3">Wallets on Chain</div>
      <div className="grid gap-3 md:grid-cols-2">
        {accounts.map((a) => (
          <AccountRow key={a.address} label={a.label} address={a.address} edu={edu} star={star} />
        ))}
        {accounts.length === 0 && (
          <div className="text-sm text-zinc-500">
            Connect a wallet to view balances and ensure the Treasury has registered professors.
          </div>
        )}
      </div>
    </div>
  );
}
