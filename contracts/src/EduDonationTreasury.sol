// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin-contracts-5.5.0/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin-contracts-5.5.0/utils/ReentrancyGuard.sol";

/**
 * @title EduDonationTreasury
 * @notice Accepts donations and periodically distributes the accumulated balance to registered
 *         professors proportional to their rating weights once a threshold is reached.
 */
contract EduDonationTreasury is Ownable, ReentrancyGuard {
    struct ProfessorInfo {
        bool exists;
        uint256 ratingWeight; // Non-negative integer weight used for proportional distribution
        uint256 index; // Position in professors array for O(1) removals
    }

    // List of all professor wallets (used for iteration during distribution)
    address[] private _professors;
    mapping(address professor => ProfessorInfo) private _professorInfo;

    // Sum of rating weights among all registered professors
    uint256 public totalRatingWeight;

    // Distribution triggers when the contract ETH balance is >= threshold
    uint256 public distributionThreshold;

    // --- Events ---
    event DonationReceived(address indexed from, uint256 amount);
    event ProfessorAdded(address indexed professor, uint256 ratingWeight);
    event ProfessorRemoved(address indexed professor);
    event ProfessorRatingUpdated(address indexed professor, uint256 oldWeight, uint256 newWeight);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event DistributionExecuted(uint256 totalDistributed, uint256 professorCount);
    event Payout(address indexed professor, uint256 amount);

    constructor(address initialOwner, uint256 initialThresholdWei) Ownable(initialOwner) {
        distributionThreshold = initialThresholdWei;
    }

    // --- Donations ---
    receive() external payable {
        emit DonationReceived(msg.sender, msg.value);
    }

    fallback() external payable {
        if (msg.value > 0) {
            emit DonationReceived(msg.sender, msg.value);
        }
    }

    /**
     * @notice Explicit donate function (optional convenience).
     */
    function donate() external payable {
        emit DonationReceived(msg.sender, msg.value);
    }

    // --- Admin: Professors management ---
    function addOrUpdateProfessor(address professor, uint256 ratingWeight) external onlyOwner {
        require(professor != address(0), "Invalid professor");

        if (_professorInfo[professor].exists) {
            uint256 old = _professorInfo[professor].ratingWeight;
            totalRatingWeight = totalRatingWeight - old + ratingWeight;
            _professorInfo[professor].ratingWeight = ratingWeight;
            emit ProfessorRatingUpdated(professor, old, ratingWeight);
        } else {
            _professorInfo[professor] = ProfessorInfo({
                exists: true,
                ratingWeight: ratingWeight,
                index: _professors.length
            });
            _professors.push(professor);
            totalRatingWeight += ratingWeight;
            emit ProfessorAdded(professor, ratingWeight);
        }
    }

    function removeProfessor(address professor) external onlyOwner {
        ProfessorInfo memory info = _professorInfo[professor];
        require(info.exists, "Professor not found");

        totalRatingWeight -= info.ratingWeight;

        // swap-and-pop removal from array
        uint256 idx = info.index;
        uint256 lastIdx = _professors.length - 1;
        if (idx != lastIdx) {
            address lastAddr = _professors[lastIdx];
            _professors[idx] = lastAddr;
            _professorInfo[lastAddr].index = idx;
        }
        _professors.pop();
        delete _professorInfo[professor];

        emit ProfessorRemoved(professor);
    }

    // --- Admin: Threshold management ---
    function setDistributionThreshold(uint256 newThresholdWei) external onlyOwner {
        uint256 old = distributionThreshold;
        distributionThreshold = newThresholdWei;
        emit ThresholdUpdated(old, newThresholdWei);
    }

    // --- Distribution ---
    /**
     * @notice Distributes the entire current ETH balance proportionally by rating weights
     *         to all registered professors. Requires balance >= threshold and > 0 weights.
     * @dev Uses nonReentrant guard and reverts on any payout failure to keep accounting simple.
     */
    function distribute() external nonReentrant {
        uint256 balance = address(this).balance;
        require(balance >= distributionThreshold, "Below threshold");
        uint256 count = _professors.length;
        require(count > 0 && totalRatingWeight > 0, "No professors or zero weights");

        uint256 pool = balance;
        uint256 totalSent;

        // First pass: proportional payouts using floor division
        for (uint256 i = 0; i < count; i++) {
            address professor = _professors[i];
            uint256 weight = _professorInfo[professor].ratingWeight;
            if (weight == 0) {
                continue;
            }
            uint256 share = (pool * weight) / totalRatingWeight;
            if (share > 0) {
                (bool ok, ) = payable(professor).call{value: share}("");
                require(ok, "Transfer failed");
                totalSent += share;
                emit Payout(professor, share);
            }
        }

        // If there's leftover due to integer rounding, keep it in the contract for the next round.
        // This ensures we never exceed the pool and avoids privileged remainder routing.

        emit DistributionExecuted(totalSent, count);
    }

    // --- Views ---
    function getProfessors() external view returns (address[] memory) {
        return _professors;
    }

    function getProfessorInfo(address professor) external view returns (bool exists, uint256 ratingWeight) {
        ProfessorInfo memory info = _professorInfo[professor];
        return (info.exists, info.ratingWeight);
    }
}


