"use client";
import { useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { erc20Abi, taskRegistryAbi } from "../lib/abis";

function toWei(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return BigInt(0);
  return BigInt(Math.floor(amount * 1e6)) * (BigInt(10) ** BigInt(12)); // 6->18
}

export default function Tasks() {
  const { address } = useAccount();
  const registry = process.env.NEXT_PUBLIC_TASK_REGISTRY_ADDRESS as `0x${string}` | undefined;
  const edu = process.env.NEXT_PUBLIC_EDUCOIN_ADDRESS as `0x${string}` | undefined;

  const tasksCount = useReadContract({ address: registry, abi: taskRegistryAbi, functionName: "tasksCount", query: { enabled: !!registry } });
  const write = useWriteContract();
  const [pending, setPending] = useState<`0x${string}` | undefined>();
  useWaitForTransactionReceipt({ hash: pending, confirmations: 1, query: { enabled: !!pending } });

  const [titleCid, setTitleCid] = useState("ipfs://title");
  const [rubricCid, setRubricCid] = useState("ipfs://rubric");
  const [minStake, setMinStake] = useState(10);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [rewardPool, setRewardPool] = useState(100);
  const [deadlineDays, setDeadlineDays] = useState(7);

  // Read tasks via multi-read
  const count = Number((tasksCount.data as bigint | undefined) ?? BigInt(0));
  const taskIds = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);
  const contracts = useMemo(
    () =>
      taskIds.map((id) => ({
        address: registry as `0x${string}`,
        abi: taskRegistryAbi,
        functionName: "getTask" as const,
        args: [BigInt(id)],
      })),
    [registry, taskIds]
  );
  const reads = useReadContracts({ allowFailure: true, contracts, query: { enabled: !!registry && taskIds.length > 0 } });

  const [stakeAmount, setStakeAmount] = useState(10);
  const [submissionCid, setSubmissionCid] = useState("ipfs://submission");
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewStudent, setReviewStudent] = useState("");

  // Approve helper (unconditional for reliability in demo)
  const approveFor = async (spender: `0x${string}`, amount: bigint) => {
    if (!edu) return;
    const tx = await write.writeContractAsync({
      address: edu,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount],
    });
    setPending(tx);
  };

  const onCreate = async () => {
    if (!registry || !address) return;
    const rp = toWei(rewardPool);
    await approveFor(registry, rp);
    try {
      const deadline = Math.floor(Date.now() / 1000) + deadlineDays * 24 * 3600;
      const tx = await write.writeContractAsync({
        address: registry,
        abi: taskRegistryAbi,
        functionName: "createTask",
        args: [titleCid, rubricCid, toWei(minStake), BigInt(maxParticipants), rp, BigInt(deadline)],
      });
      setPending(tx);
    } catch {}
  };

  const onJoin = async (taskId: number) => {
    if (!registry || !address) return;
    const st = toWei(stakeAmount);
    await approveFor(registry, st);
    try {
      const tx = await write.writeContractAsync({
        address: registry,
        abi: taskRegistryAbi,
        functionName: "joinTask",
        args: [BigInt(taskId), st],
      });
      setPending(tx);
    } catch {}
  };

  const onSubmit = async (taskId: number) => {
    if (!registry || !address) return;
    try {
      const tx = await write.writeContractAsync({
        address: registry,
        abi: taskRegistryAbi,
        functionName: "submitWork",
        args: [BigInt(taskId), submissionCid],
      });
      setPending(tx);
    } catch {}
  };

  const onReview = async (taskId: number) => {
    if (!registry || !address) return;
    try {
      const tx = await write.writeContractAsync({
        address: registry,
        abi: taskRegistryAbi,
        functionName: "reviewSubmission",
        args: [BigInt(taskId), reviewStudent as `0x${string}`, Number(reviewStars)],
      });
      setPending(tx);
    } catch {}
  };

  const onSettle = async (taskId: number) => {
    if (!registry || !address) return;
    try {
      const tx = await write.writeContractAsync({
        address: registry,
        abi: taskRegistryAbi,
        functionName: "settleTask",
        args: [BigInt(taskId)],
      });
      setPending(tx);
    } catch {}
  };

  return (
    <div className="w-full rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="font-semibold mb-3">Tasks</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-black/10 dark:border-white/10 p-3 space-y-2">
            <div className="font-medium">Create Task</div>
            <input className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent" placeholder="Title CID" value={titleCid} onChange={(e) => setTitleCid(e.target.value)} />
            <input className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent" placeholder="Rubric CID" value={rubricCid} onChange={(e) => setRubricCid(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent" placeholder="Min Stake (EDU)" value={minStake} onChange={(e) => setMinStake(parseInt(e.target.value || "0", 10))} />
              <input type="number" className="rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent" placeholder="Max Participants" value={maxParticipants} onChange={(e) => setMaxParticipants(parseInt(e.target.value || "0", 10))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent" placeholder="Reward Pool (EDU)" value={rewardPool} onChange={(e) => setRewardPool(parseInt(e.target.value || "0", 10))} />
              <input type="number" className="rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent" placeholder="Deadline (days)" value={deadlineDays} onChange={(e) => setDeadlineDays(parseInt(e.target.value || "0", 10))} />
            </div>
            <button onClick={onCreate} className="rounded-full px-4 py-2 bg-foreground text-background text-sm">
              Create
            </button>
          </div>
          <div className="rounded-md border border-black/10 dark:border-white/10 p-3 space-y-2">
            <div className="font-medium">Participant Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent" placeholder="Stake (EDU)" value={stakeAmount} onChange={(e) => setStakeAmount(parseInt(e.target.value || "0", 10))} />
              <input className="rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent" placeholder="Submission CID" value={submissionCid} onChange={(e) => setSubmissionCid(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {taskIds.map((id) => (
                <button key={`join-${id}`} onClick={() => onJoin(id)} className="rounded-full px-3 py-2 border border-black/10 dark:border-white/10 text-xs">
                  Join #{id}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {taskIds.map((id) => (
                <button key={`submit-${id}`} onClick={() => onSubmit(id)} className="rounded-full px-3 py-2 border border-black/10 dark:border-white/10 text-xs">
                  Submit #{id}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-black/10 dark:border-white/10 p-3 space-y-2">
            <div className="font-medium">Creator Actions</div>
            <div className="grid grid-cols-3 gap-2">
              <input className="rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent col-span-2" placeholder="Student address" value={reviewStudent} onChange={(e) => setReviewStudent(e.target.value)} />
              <input type="number" className="rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent" placeholder="Stars (0-5)" value={reviewStars} onChange={(e) => setReviewStars(parseInt(e.target.value || "0", 10))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {taskIds.map((id) => (
                <button key={`review-${id}`} onClick={() => onReview(id)} className="rounded-full px-3 py-2 border border-black/10 dark:border-white/10 text-xs">
                  Review #{id}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {taskIds.map((id) => (
                <button key={`settle-${id}`} onClick={() => onSettle(id)} className="rounded-full px-3 py-2 border border-black/10 dark:border-white/10 text-xs">
                  Settle #{id}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-black/10 dark:border-white/10 p-3">
            <div className="font-medium mb-2">Tasks on-chain</div>
            <div className="space-y-2">
              {taskIds.length === 0 && <div className="text-zinc-500">No tasks created yet.</div>}
              {reads.data?.map((t, idx) => {
                const id = taskIds[idx];
                if (!t || t.status === "failure") return null;
                const d = t.result as any[];
                const creator = d?.[0] as string;
                const title = d?.[1] as string;
                const rubric = d?.[2] as string;
                const minStakeWei = d?.[3] as bigint;
                const maxP = d?.[4] as bigint;
                const rewardPoolWei = d?.[5] as bigint;
                const deadline = d?.[6] as bigint;
                const open = d?.[7] as boolean;
                const count = d?.[8] as bigint;
                return (
                  <div key={`task-${id}`} className="rounded-md border border-black/10 dark:border-white/10 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Task #{id}</div>
                      <div className={`text-xs ${open ? "text-emerald-600" : "text-zinc-500"}`}>{open ? "Open" : "Closed"}</div>
                    </div>
                    <div className="text-xs text-zinc-500 break-all">{title}</div>
                    <div className="text-xs text-zinc-500 break-all">{rubric}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>Min stake: {(minStakeWei ?? BigInt(0)).toString()}</div>
                      <div>Max participants: {Number(maxP ?? BigInt(0))}</div>
                      <div>Reward pool: {(rewardPoolWei ?? BigInt(0)).toString()}</div>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                      <div>Deadline: {deadline?.toString()}</div>
                      <div>Participants: {Number(count ?? BigInt(0))}</div>
                      <div>Creator: {creator}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


