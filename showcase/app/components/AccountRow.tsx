"use client";
import { useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "../lib/abis";

type Props = {
  label: string;
  address: `0x${string}`;
  edu?: `0x${string}`;
  star?: `0x${string}`;
};

function short(addr: string) {
  return addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export default function AccountRow({ label, address, edu, star }: Props) {
  const eth = useBalance({ address });
  const eduBal = useReadContract({
    address: edu,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!edu },
  });
  const starBal = useReadContract({
    address: star,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!star },
  });

  return (
    <div className="rounded-md border border-black/10 dark:border-white/10 p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-zinc-500">{short(address)}</div>
      </div>
      <div className="mt-2 grid grid-cols-3 text-sm">
        <div>
          <div className="text-zinc-500">ETH</div>
          <div>{eth.data ? eth.data.formatted : "-"}</div>
        </div>
        <div>
          <div className="text-zinc-500">EDU</div>
          <div>{eduBal.data === undefined ? "-" : (eduBal.data as bigint).toString()}</div>
        </div>
        <div>
          <div className="text-zinc-500">STAR</div>
          <div>{starBal.data === undefined ? "-" : (starBal.data as bigint).toString()}</div>
        </div>
      </div>
    </div>
  );
}


