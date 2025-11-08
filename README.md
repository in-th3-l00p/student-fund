# LearnChain Contracts (Isolated Web3 Module)

Transparent education on-chain. This repo documents and bootstraps the standalone smart contract layer for LearnChain — staking, task marketplace, reputation, and DAO governance — separate from the web app. You can build, test, and deploy the contracts on their own, then integrate from a Next.js frontend later.


## What this module covers

- Utility token `LRN` (ERC20) for staking and rewards
- Non‑transferable `REP` (reputation voting power) for governance and unlocks (mentor mode, etc.)
- Task marketplace with staking gates for Students and Teachers
- Global staking pool (symbolic APY, supports protocol treasury)
- Q&A micro-bounties (mentorship flow)
- DAO governance (OpenZeppelin Governor + Timelock) — voting power = `REP`
- ZK Proof integration points (pluggable verifier interface, e.g., Semaphore/Sismo)
- Events-first architecture for off-chain indexing and UX

This module intentionally avoids frontend code and heavy backend logic — it exposes clean on-chain primitives and interfaces the app can consume.


## High-level design

- Roles: Student, Teacher, Mentor (mentor = Student with `REP ≥ threshold` and minimum completed tasks)
- Proof-of-Stake for participation, not wealth: staking amounts are small and reputation-weighted validation matters more than raw token balance
- `LRN` token is transferable and powers economic actions; `REP` is non‑transferable (soulbound‑like) and powers governance and permissions
- Task lifecycle: create → join (stake) → submit (IPFS CID) → review (stars) → settle (rewards + REP)
- Governance: Teachers and Students vote with `REP` on protocol proposals (fees, reward schedules, mentor incentives, etc.)
- ZK Layer: optional verification step (proof of personhood/eligibility) without storing personal data on-chain


## Contracts (intended architecture)

- `LRNToken.sol`: ERC20 utility token (mint controlled by Treasury or deployer scripts for hackathon)
- `REPToken.sol`: Non‑transferable ERC20Votes (transfers disabled; mint/burn by authorized contracts)
- `StakingPool.sol`: Global stake/unstake with symbolic reward emission (for demo/hackathon); emits events usable by a rewards calculator off-chain or a simple on-chain accrual
- `TaskRegistry.sol`: Core task marketplace
  - createTask(titleCid, rubricCid, minStake, maxParticipants, rewardPool, deadline)
  - joinTask(taskId, stakeAmount)
  - submitWork(taskId, submissionCid)
  - reviewSubmission(taskId, student, stars) — teacher- or mentor- gated
  - settleTask(taskId) — distribute rewards; update `REP`
  - Emits rich events for indexing: TaskCreated, Joined, Submitted, Reviewed, Settled
- `QAGateway.sol`: Q&A micro-bounties with small stakes and mentor validation
- `VerifierRegistry.sol`: Pluggable ZK verifier registry
  - `IZkVerifier.verify(proof, signal, user) -> bool`
  - Contracts can require `requireZk(user, scopeId)`
- `Treasury.sol`: Receives protocol fees, funds teacher trial budgets, authorizes `LRN` emissions per governance
- `LearnChainGovernor.sol` + `TimelockController`: DAO governance using `REP` as voting token

> Note: For a hackathon MVP you can start with `LRNToken`, `REPToken`, `TaskRegistry`, and `LearnChainGovernor + Timelock`, then add pools/Q&A/ZK hooks as time allows.
