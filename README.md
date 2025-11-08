# EduChain Contracts (Isolated Web3 Module)

Transparent education on-chain. This repo documents and bootstraps the standalone smart contract layer for EduChain — staking, task marketplace, reputation, and DAO governance — separate from the web app. You can build, test, and deploy the contracts on their own, then integrate from a Next.js frontend later.


## What this module covers

- Utility token `EduCoin` (ERC20) for staking and rewards
- Non‑transferable `EduStar` (reputation voting power) for governance and unlocks (mentor mode, etc.)
- Task marketplace with staking gates for Students and Teachers
- Global staking pool (symbolic APY, supports protocol treasury)
- Q&A micro-bounties (mentorship flow)
- DAO governance (OpenZeppelin Governor + Timelock) — voting power = `EduStar`
- ZK Proof integration points (pluggable verifier interface, e.g., Semaphore/Sismo)
- Events-first architecture for off-chain indexing and UX

This module intentionally avoids frontend code and heavy backend logic — it exposes clean on-chain primitives and interfaces the app can consume.


## High-level design

- Roles: Student, Teacher, Mentor (mentor = Student with `EduStar ≥ threshold` and minimum completed tasks)
- Proof-of-Stake for participation, not wealth: staking amounts are small and reputation-weighted validation matters more than raw token balance
- `EduCoin` token is transferable and powers economic actions; `EduStar` is non‑transferable (soulbound‑like) and powers governance and permissions
- Task lifecycle: create → join (stake) → submit (IPFS CID) → review (stars) → settle (rewards + EduStar)
- Governance: Teachers and Students vote with `EduStar` on protocol proposals (fees, reward schedules, mentor incentives, etc.)
- ZK Layer: optional verification step (proof of personhood/eligibility) without storing personal data on-chain


## Contracts (intended architecture)

- `EduCoinToken.sol`: ERC20 utility token (mint controlled by Treasury or deployer scripts for hackathon)
- `EduStarToken.sol`: Non‑transferable ERC20Votes (transfers disabled; mint/burn by authorized contracts)
- `StakingPool.sol`: Global stake/unstake with symbolic reward emission (for demo/hackathon); emits events usable by a rewards calculator off-chain or a simple on-chain accrual
- `TaskRegistry.sol`: Core task marketplace
  - createTask(titleCid, rubricCid, minStake, maxParticipants, rewardPool, deadline)
  - joinTask(taskId, stakeAmount)
  - submitWork(taskId, submissionCid)
  - reviewSubmission(taskId, student, stars) — teacher- or mentor- gated
  - settleTask(taskId) — distribute rewards; update `EduStar`
  - Emits rich events for indexing: TaskCreated, Joined, Submitted, Reviewed, Settled
- `QAGateway.sol`: Q&A micro-bounties with small stakes and mentor validation
- `VerifierRegistry.sol`: Pluggable ZK verifier registry
  - `IZkVerifier.verify(proof, signal, user) -> bool`
  - Contracts can require `requireZk(user, scopeId)`
- `Treasury.sol`: Receives protocol fees, funds teacher trial budgets, authorizes `EduCoin` emissions per governance
- `EduChainGovernor.sol` + `TimelockController`: DAO governance using `EduStar` as voting token

> Note: For a hackathon MVP you can start with `EduCoinToken`, `EduStarToken`, `TaskRegistry`, and `EduChainGovernor + Timelock`, then add pools/Q&A/ZK hooks as time allows.
