"use client";
import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { treasuryAbi, erc20Abi } from "../lib/abis";
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

  // Batch read ERC20 balances (EduCoin/EduStar) for all accounts
  const { calls, keys } = useMemo(() => {
    const c: { address: `0x${string}`; abi: any; functionName: "balanceOf"; args: [`0x${string}`] }[] = [];
    const k: string[] = [];
    const lower = (s: string) => s.toLowerCase();
    accounts.forEach((a) => {
      if (edu) {
        c.push({ address: edu, abi: erc20Abi, functionName: "balanceOf", args: [a.address] });
        k.push(`edu:${lower(a.address)}`);
      }
      if (star) {
        c.push({ address: star, abi: erc20Abi, functionName: "balanceOf", args: [a.address] });
        k.push(`star:${lower(a.address)}`);
      }
    });
    return { calls: c, keys: k };
  }, [accounts, edu, star]);

  const multi = useReadContracts({
    allowFailure: true,
    contracts: calls,
    query: { enabled: calls.length > 0 },
  });

  const balanceMap = useMemo(() => {
    const map = new Map<string, bigint>();
    const results = (multi.data as { result?: bigint }[] | undefined) || [];
    results.forEach((r, i) => {
      const key = keys[i];
      const val = r && typeof r.result === "bigint" ? (r.result as bigint) : undefined;
      if (key && val !== undefined) map.set(key, val);
    });
    return map;
  }, [multi.data, keys]);

  return (
    <div className="w-full rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="font-semibold mb-3">Wallets on Chain</div>
      <div className="grid gap-3 md:grid-cols-2">
        {accounts.map((a) => {
          const kEdu = `edu:${a.address.toLowerCase()}`;
          const kStar = `star:${a.address.toLowerCase()}`;
          return (
            <AccountRow
              key={a.address}
              label={a.label}
              address={a.address}
              edu={edu}
              star={star}
              eduBalance={balanceMap.get(kEdu)}
              starBalance={balanceMap.get(kStar)}
            />
          );
        })}
        {accounts.length === 0 && (
          <div className="text-sm text-zinc-500">
            Connect a wallet to view balances and ensure the Treasury has registered professors.
          </div>
        )}
      </div>
    </div>
  );
}
