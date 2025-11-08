"use client";
import "@rainbow-me/rainbowkit/styles.css";
import { ReactNode, useMemo } from "react";
import { RainbowKitProvider, getDefaultConfig, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type Props = { children: ReactNode };

export default function Providers({ children }: Props) {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
  const chain = {
    ...hardhat,
    rpcUrls: {
      ...hardhat.rpcUrls,
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  };
  const wcId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

  const config = useMemo(
    () =>
      getDefaultConfig({
        appName: "EduChain Showcase",
        projectId: wcId,
        chains: [chain],
        transports: {
          [chain.id]: http(rpcUrl),
        },
        ssr: true,
      }),
    [rpcUrl, wcId]
  );

  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={{ lightMode: lightTheme(), darkMode: darkTheme() }}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}


