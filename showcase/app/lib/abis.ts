export const erc20Abi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const vaultAbi = [
  { type: "function", name: "annualRateBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "donationSplitBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "estimateDonationSplit",
    stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "uint256" }],
    outputs: [{ type: "uint256" }, { type: "uint256" }],
  },
] as const;

export const treasuryAbi = [
  { type: "function", name: "distributionThreshold", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getProfessors", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
] as const;

export const taskRegistryAbi = [
  {
    type: "function",
    name: "getTask",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [
      { type: "address" },
      { type: "string" },
      { type: "string" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint64" },
      { type: "bool" },
      { type: "uint256" },
    ],
  },
] as const;


