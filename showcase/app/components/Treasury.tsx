"use client";
import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { treasuryAbi } from "../lib/abis";

function toWei(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return BigInt(0);
  return BigInt(Math.floor(amount * 1e6)) * (BigInt(10) ** BigInt(12)); // 6->18
}

export default function Treasury() {
  const { address } = useAccount();
  const treasury = process.env.NEXT_PUBLIC_DONATION_TREASURY_ADDRESS as `0x${string}` | undefined;

  const threshold = useReadContract({ address: treasury, abi: treasuryAbi, functionName: "distributionThreshold", query: { enabled: !!treasury } });
  const owner = useReadContract({ address: treasury, abi: treasuryAbi, functionName: "owner", query: { enabled: !!treasury } });
  const profs = useReadContract({ address: treasury, abi: treasuryAbi, functionName: "getProfessors", query: { enabled: !!treasury } });

  const write = useWriteContract();
  const [pending, setPending] = useState<`0x${string}` | undefined>();
  useWaitForTransactionReceipt({ hash: pending, confirmations: 1, query: { enabled: !!pending } });

  const [ethAmt, setEthAmt] = useState(0.1);
  const [profAddr, setProfAddr] = useState("");
  const [weight, setWeight] = useState(10);

  const isOwner = useMemo(() => {
    const o = (owner.data as `0x${string}` | undefined)?.toLowerCase();
    const me = (address as `0x${string}` | undefined)?.toLowerCase();
    return !!o && !!me && o === me;
  }, [owner.data, address]);

  const onDonate = async () => {
    if (!treasury) return;
    try {
      const tx = await write.writeContractAsync({
        address: treasury,
        abi: treasuryAbi,
        functionName: "donate",
        value: toWei(ethAmt),
      });
      setPending(tx);
    } catch {}
  };

  const onDistribute = async () => {
    if (!treasury) return;
    try {
      const tx = await write.writeContractAsync({
        address: treasury,
        abi: treasuryAbi,
        functionName: "distribute",
      });
      setPending(tx);
    } catch {}
  };

  const onAddOrUpdate = async () => {
    if (!treasury) return;
    try {
      const tx = await write.writeContractAsync({
        address: treasury,
        abi: treasuryAbi,
        functionName: "addOrUpdateProfessor",
        args: [profAddr as `0x${string}`, BigInt(weight)],
      });
      setPending(tx);
    } catch {}
  };

  const professors = (profs.data as `0x${string}`[] | undefined) || [];

  return (
    <div className="w-full rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="font-semibold mb-3">Donation Treasury</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-zinc-500">Threshold (wei)</div>
            <div>{threshold.data === undefined ? "-" : (threshold.data as bigint).toString()}</div>
          </div>
          <div>
            <div className="text-zinc-500">Owner</div>
            <div>{owner.data ? (owner.data as string) : "-"}</div>
          </div>
          <div>
            <div className="text-zinc-500">Professors</div>
            <div className="space-y-1">
              {professors.length === 0 && <div className="text-zinc-500">None</div>}
              {professors.map((p, i) => (
                <div key={p} className="flex items-center justify-between">
                  <span>#{i + 1}</span>
                  <span className="text-xs text-zinc-500">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-black/10 dark:border-white/10 p-3 space-y-2">
            <div className="font-medium">Donate ETH</div>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
              value={ethAmt}
              onChange={(e) => setEthAmt(parseFloat(e.target.value || "0"))}
            />
            <button onClick={onDonate} className="rounded-full px-4 py-2 bg-foreground text-background text-sm">
              Donate
            </button>
          </div>
          {isOwner && (
            <div className="rounded-md border border-black/10 dark:border-white/10 p-3 space-y-2">
              <div className="font-medium">Admin</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Professor address"
                  className="rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
                  value={profAddr}
                  onChange={(e) => setProfAddr(e.target.value)}
                />
                <input
                  placeholder="Weight"
                  type="number"
                  className="rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value || "0", 10))}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={onAddOrUpdate} className="rounded-full px-4 py-2 border border-black/10 dark:border-white/10 text-sm">
                  Add/Update Professor
                </button>
                <button onClick={onDistribute} className="rounded-full px-4 py-2 border border-black/10 dark:border-white/10 text-sm">
                  Distribute
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


