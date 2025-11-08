"use client";
import { useMemo, useState } from "react";

type Participant = { addr: string; staked: number; submitted?: boolean; stars?: number; submissionCid?: string };
type Task = {
  id: number;
  titleCid: string;
  rubricCid: string;
  minStake: number;
  maxParticipants: number;
  rewardPool: number;
  deadlineDays: number;
  open: boolean;
  participants: Participant[];
  payouts?: { [addr: string]: number };
};

export default function TasksMock() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [seq, setSeq] = useState(1);

  const [form, setForm] = useState({
    titleCid: "ipfs://title",
    rubricCid: "ipfs://rubric",
    minStake: 100,
    maxParticipants: 3,
    rewardPool: 1000,
    deadlineDays: 7,
  });

  function createTask() {
    const t: Task = {
      id: seq,
      ...form,
      open: true,
      participants: [],
    };
    setSeq(seq + 1);
    setTasks([t, ...tasks]);
  }

  function joinTask(taskId: number, addr: string, stake: number) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        if (!t.open || t.participants.length >= t.maxParticipants || stake < t.minStake) return t;
        if (t.participants.some((p) => p.addr === addr)) return t;
        return { ...t, participants: [...t.participants, { addr, staked: stake }] };
      })
    );
  }

  function submit(taskId: number, addr: string, cid: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          participants: t.participants.map((p) => (p.addr === addr ? { ...p, submitted: true, submissionCid: cid } : p)),
        };
      })
    );
  }

  function review(taskId: number, addr: string, stars: number) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          participants: t.participants.map((p) => (p.addr === addr ? { ...p, stars } : p)),
        };
      })
    );
  }

  function settle(taskId: number) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const totalStars = t.participants.reduce((a, p) => a + (p.submitted ? (p.stars || 0) : 0), 0);
        let paidTotal = 0;
        const payouts: { [addr: string]: number } = {};
        if (totalStars > 0) {
          for (const p of t.participants) {
            const s = p.submitted ? (p.stars || 0) : 0;
            const share = Math.floor((t.rewardPool * s) / totalStars);
            payouts[p.addr] = share;
            paidTotal += share;
          }
        }
        const remainder = t.rewardPool - paidTotal;
        return { ...t, open: false, payouts: { ...payouts, _creatorRefund: remainder } as any };
      })
    );
  }

  // Demo addresses for quick actions
  const demo = useMemo(
    () => ["0xAlice...", "0xBob...", "0xCarol...", "0xDave..."],
    []
  );

  return (
    <div className="w-full rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="font-semibold mb-3">Task Registry (Mock)</div>
      <div className="rounded-md border border-black/10 dark:border-white/10 p-3 mb-4 text-sm">
        <div className="font-medium mb-2">Create Task</div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="mb-1">Title CID</div>
            <input
              className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
              value={form.titleCid}
              onChange={(e) => setForm({ ...form, titleCid: e.target.value })}
            />
          </div>
          <div>
            <div className="mb-1">Rubric CID</div>
            <input
              className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
              value={form.rubricCid}
              onChange={(e) => setForm({ ...form, rubricCid: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="mb-1">Min Stake</div>
              <input
                type="number"
                className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
                value={form.minStake}
                onChange={(e) => setForm({ ...form, minStake: parseInt(e.target.value || "0", 10) })}
              />
            </div>
            <div>
              <div className="mb-1">Max Users</div>
              <input
                type="number"
                className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
                value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: parseInt(e.target.value || "0", 10) })}
              />
            </div>
            <div>
              <div className="mb-1">Reward</div>
              <input
                type="number"
                className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
                value={form.rewardPool}
                onChange={(e) => setForm({ ...form, rewardPool: parseInt(e.target.value || "0", 10) })}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div>
            <div className="mb-1">Deadline (days)</div>
            <input
              type="number"
              className="w-full rounded-md border border-black/10 dark:border-white/10 p-2 bg-transparent"
              value={form.deadlineDays}
              onChange={(e) => setForm({ ...form, deadlineDays: parseInt(e.target.value || "0", 10) })}
            />
          </div>
          <div className="flex items-end">
            <button className="rounded-full px-4 py-2 bg-foreground text-background text-sm" onClick={createTask}>
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {tasks.length === 0 && <div className="text-sm text-zinc-500">No tasks yet. Create one above.</div>}
        {tasks.map((t) => (
          <div key={t.id} className="rounded-md border border-black/10 dark:border-white/10 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">Task #{t.id}</div>
              <div className="text-xs text-zinc-500">{t.open ? "Open" : "Closed"}</div>
            </div>
            <div className="grid md:grid-cols-3 gap-3 mt-2">
              <div>
                <div>Title CID: {t.titleCid}</div>
                <div>Rubric CID: {t.rubricCid}</div>
                <div>Reward: {t.rewardPool} EDU</div>
              </div>
              <div>
                <div>Min Stake: {t.minStake} EDU</div>
                <div>Max: {t.maxParticipants}</div>
                <div>Deadline: {t.deadlineDays} days</div>
              </div>
              <div className="flex items-center gap-2">
                {demo.map((addr) => (
                  <button
                    key={addr}
                    className="rounded-full px-3 py-1 border border-black/10 dark:border-white/10"
                    onClick={() => joinTask(t.id, addr, t.minStake)}
                    disabled={!t.open}
                  >
                    Join as {addr.slice(0, 8)}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <div className="font-medium mb-1">Participants</div>
              <div className="space-y-2">
                {t.participants.length === 0 && <div className="text-zinc-500">No participants yet.</div>}
                {t.participants.map((p) => (
                  <div key={p.addr} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{p.addr}</span>
                      <span>Staked: {p.staked} EDU</span>
                      <span>Submitted: {p.submitted ? "Yes" : "No"}</span>
                      <span>Stars: {p.stars ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-full px-3 py-1 border border-black/10 dark:border-white/10"
                        onClick={() => submit(t.id, p.addr, `ipfs://${t.id}-${p.addr}`)}
                        disabled={!t.open}
                      >
                        Submit
                      </button>
                      <select
                        className="rounded-md border border-black/10 dark:border-white/10 p-1 bg-transparent"
                        value={p.stars ?? 0}
                        onChange={(e) => review(t.id, p.addr, parseInt(e.target.value, 10))}
                        disabled={!t.open}
                      >
                        {[0, 1, 2, 3, 4, 5].map((s) => (
                          <option key={s} value={s}>
                            {s}★
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                className="rounded-full px-4 py-2 bg-foreground text-background text-sm"
                onClick={() => settle(t.id)}
                disabled={!t.open}
              >
                Settle
              </button>
              {!!t.payouts && (
                <div className="text-xs text-zinc-500">
                  Payouts:{" "}
                  {Object.entries(t.payouts)
                    .filter(([k]) => k !== "_creatorRefund")
                    .map(([k, v]) => `${k.slice(0, 8)}: ${v} EDU`)
                    .join(" | ")}{" "}
                  | Remainder: {t.payouts._creatorRefund ?? 0} EDU
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


