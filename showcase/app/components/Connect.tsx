"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Connect() {
  return (
    <div className="flex items-center">
      <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
    </div>
  );
}


