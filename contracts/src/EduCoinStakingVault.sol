// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20, ERC20} from "@openzeppelin-contracts-5.5.0/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin-contracts-5.5.0/token/ERC20/extensions/ERC4626.sol";
import {Ownable} from "@openzeppelin-contracts-5.5.0/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin-contracts-5.5.0/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin-contracts-5.5.0/utils/math/Math.sol";

import {EduCoin} from "./EduCoin.sol";
import {EduRewardToken} from "./EduRewardToken.sol";

/**
 * @title EduCoinStakingVault
 * @notice ERC4626-compliant staking vault for the EduCoin token.
 *         - Users deposit EduCoin and receive vault shares.
 *         - Optional lock mechanism prevents withdraw/redeem until expiry.
 *         - Simple APR-based reward estimator for showcase flows.
 *         - Optional showcase minting: can mint EduRewardToken to wallets for demo UX.
 *
 *         This contract does not implement real yield accrual. Instead, it exposes
 *         deterministic estimation helpers and "showcase" minting hooks suitable
 *         for a hackathon demo and a Next.js frontend.
 */
contract EduCoinStakingVault is ERC4626, Ownable, ReentrancyGuard {
    using Math for uint256;

    // -------------------------
    // Constants & immutables
    // -------------------------
    uint256 private constant BPS_DENOMINATOR = 10_000;
    uint256 private constant SECONDS_PER_YEAR = 365 days;

    // -------------------------
    // Locking
    // -------------------------
    mapping(address => uint64) public lockExpiry; // per-wallet unlock timestamp
    uint64 public maxLockDuration; // hard cap on lock duration

    // -------------------------
    // Yield estimation config
    // -------------------------
    uint256 public annualRateBps; // e.g. 250 = 2.5% APR (symbolic)
    uint256 public donationSplitBps; // % of estimated yield that is "donated"
    address public donationSink; // where "donated" rewards would go in a real flow

    // -------------------------
    // Showcase minting (optional)
    // -------------------------
    EduRewardToken public rewardToken; // optional; if set, can mint showcase rewards
    bool public showcaseModeEnabled;

    // For frontends that want to display "virtual" balances without minting a token.
    mapping(address => uint256) public showcaseBalances;

    // -------------------------
    // Events
    // -------------------------
    event Locked(address indexed user, uint64 unlockTimestamp);
    event LockExtended(address indexed user, uint64 newUnlockTimestamp);
    event ConfigUpdated(uint256 annualRateBps, uint256 donationSplitBps, uint64 maxLockDuration, address donationSink);
    event RewardTokenSet(address indexed rewardToken, bool showcaseModeEnabled);
    event ShowcaseSimulated(
        address indexed user,
        uint256 assets,
        uint256 durationSeconds,
        uint256 donationAmount,
        uint256 userCredited
    );

    constructor(
        IERC20 asset_, // EduCoin
        string memory name_,
        string memory symbol_,
        address initialOwner,
        uint256 initialAnnualRateBps,
        uint256 initialDonationSplitBps,
        uint64 initialMaxLockDuration,
        address donationSink_
    ) ERC4626(asset_) ERC20(name_, symbol_) Ownable(initialOwner) {
        require(address(asset_) != address(0), "asset=0");
        require(initialDonationSplitBps <= BPS_DENOMINATOR, "split>100%");
        annualRateBps = initialAnnualRateBps;
        donationSplitBps = initialDonationSplitBps;
        maxLockDuration = initialMaxLockDuration;
        donationSink = donationSink_;
    }

    // -------------------------
    // Deposit with lock helpers
    // -------------------------

    /**
     * @notice Deposit assets and set/extend a lock for the receiver.
     * @param assets Amount of EduCoin to deposit.
     * @param receiver Address receiving the vault shares.
     * @param lockDuration Desired lock duration (seconds). Capped at maxLockDuration.
     */
    function depositLocked(uint256 assets, address receiver, uint64 lockDuration)
        external
        nonReentrant
        returns (uint256 shares)
    {
        shares = deposit(assets, receiver);
        _applyOrExtendLock(receiver, lockDuration);
    }

    /**
     * @notice Mint shares and set/extend a lock for the receiver.
     * @param shares Amount of shares to mint.
     * @param receiver Address receiving the vault shares.
     * @param lockDuration Desired lock duration (seconds). Capped at maxLockDuration.
     */
    function mintLocked(uint256 shares, address receiver, uint64 lockDuration)
        external
        nonReentrant
        returns (uint256 assets)
    {
        assets = mint(shares, receiver);
        _applyOrExtendLock(receiver, lockDuration);
    }

    function _applyOrExtendLock(address receiver, uint64 lockDuration) internal {
        uint64 capped = lockDuration;
        if (maxLockDuration > 0 && lockDuration > maxLockDuration) {
            capped = maxLockDuration;
        }
        uint64 newUnlock = uint64(block.timestamp) + capped;
        if (newUnlock > lockExpiry[receiver]) {
            lockExpiry[receiver] = newUnlock;
            emit Locked(receiver, newUnlock);
        } else {
            // Lock request is <= existing; do nothing
        }
    }

    /**
     * @notice Extend an existing lock (only the owner of shares).
     * @param additionalSeconds Additional seconds to extend (capped by maxLockDuration from now).
     */
    function extendLock(uint64 additionalSeconds) external {
        uint64 capped = additionalSeconds;
        if (maxLockDuration > 0 && additionalSeconds > maxLockDuration) {
            capped = maxLockDuration;
        }
        uint64 base = lockExpiry[msg.sender] > uint64(block.timestamp) ? lockExpiry[msg.sender] : uint64(block.timestamp);
        uint64 newUnlock = base + capped;
        lockExpiry[msg.sender] = newUnlock;
        emit LockExtended(msg.sender, newUnlock);
    }

    // -------------------------
    // Withdraw/redeem with lock check
    // -------------------------

    function withdraw(uint256 assets, address receiver, address owner)
        public
        override
        nonReentrant
        returns (uint256 shares)
    {
        require(block.timestamp >= lockExpiry[owner], "Vault: assets locked");
        shares = super.withdraw(assets, receiver, owner);
    }

    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        nonReentrant
        returns (uint256 assets)
    {
        require(block.timestamp >= lockExpiry[owner], "Vault: assets locked");
        assets = super.redeem(shares, receiver, owner);
    }

    // -------------------------
    // Estimation & showcase
    // -------------------------

    /**
     * @notice Estimate symbolic yield for a given principal and duration.
     * @dev Purely arithmetic; no state changes. Yield = assets * APR * time.
     */
    function estimateYield(uint256 assets, uint256 durationSeconds) public view returns (uint256 totalYield) {
        if (assets == 0 || durationSeconds == 0 || annualRateBps == 0) return 0;
        // totalYield = assets * annualRateBps/10000 * (durationSeconds / SECONDS_PER_YEAR)
        // Avoid precision loss using mulDiv.
        totalYield = Math.mulDiv(assets, annualRateBps * durationSeconds, BPS_DENOMINATOR * SECONDS_PER_YEAR);
    }

    /**
     * @notice Estimate donation and user portions from the totalYield.
     */
    function estimateDonationSplit(uint256 assets, uint256 durationSeconds)
        public
        view
        returns (uint256 donationAmount, uint256 userAmount)
    {
        uint256 totalYield = estimateYield(assets, durationSeconds);
        if (totalYield == 0) return (0, 0);
        donationAmount = Math.mulDiv(totalYield, donationSplitBps, BPS_DENOMINATOR);
        userAmount = totalYield - donationAmount;
    }

    /**
     * @notice Simulation helper for the showcase: calculates donation + user credit,
     *         then records it in `showcaseBalances` and optionally mints reward tokens
     *         to both `donationSink` and `to` (if configured and showcaseModeEnabled).
     */
    function simulateAndCreditShowcase(address to, uint256 assets, uint256 durationSeconds)
        external
        nonReentrant
        returns (uint256 donationAmount, uint256 userCredited)
    {
        (donationAmount, userCredited) = estimateDonationSplit(assets, durationSeconds);

        // Update virtual balance for frontend demos
        if (userCredited > 0) {
            showcaseBalances[to] += userCredited;
        }

        // Optionally mint a reward token for demo UX
        if (showcaseModeEnabled && address(rewardToken) != address(0)) {
            if (donationAmount > 0 && donationSink != address(0)) {
                rewardToken.mint(donationSink, donationAmount);
            }
            if (userCredited > 0) {
                rewardToken.mint(to, userCredited);
            }
        }

        emit ShowcaseSimulated(to, assets, durationSeconds, donationAmount, userCredited);
    }

    // -------------------------
    // Admin/config
    // -------------------------

    function setAnnualRateBps(uint256 newAnnualRateBps) external onlyOwner {
        annualRateBps = newAnnualRateBps;
        emit ConfigUpdated(annualRateBps, donationSplitBps, maxLockDuration, donationSink);
    }

    function setDonationSplitBps(uint256 newSplitBps) external onlyOwner {
        require(newSplitBps <= BPS_DENOMINATOR, "split>100%");
        donationSplitBps = newSplitBps;
        emit ConfigUpdated(annualRateBps, donationSplitBps, maxLockDuration, donationSink);
    }

    function setMaxLockDuration(uint64 newMax) external onlyOwner {
        maxLockDuration = newMax;
        emit ConfigUpdated(annualRateBps, donationSplitBps, maxLockDuration, donationSink);
    }

    function setDonationSink(address newSink) external onlyOwner {
        donationSink = newSink;
        emit ConfigUpdated(annualRateBps, donationSplitBps, maxLockDuration, donationSink);
    }

    function setRewardToken(address token, bool enabled) external onlyOwner {
        rewardToken = EduRewardToken(token);
        showcaseModeEnabled = enabled;
        emit RewardTokenSet(token, enabled);
    }
}


