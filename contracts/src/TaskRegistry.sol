// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin-contracts-5.5.0/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin-contracts-5.5.0/utils/ReentrancyGuard.sol";

/**
 * @title TaskRegistry
 * @notice Minimal marketplace for tasks:
 *  - creators fund a reward pool in EDU (ERC20) and set participation/stake rules
 *  - participants join by staking EDU, submit work (IPFS CID)
 *  - creator reviews submissions (0-5 stars)
 *  - on settle (after deadline), reward pool is paid proportionally to stars; stakes are refunded
 */
contract TaskRegistry is ReentrancyGuard {
    IERC20 public immutable edu;

    struct Participant {
        uint256 staked;
        bool submitted;
        string submissionCid;
    }

    struct Task {
        address creator;
        string titleCid;
        string rubricCid;
        uint256 minStake;
        uint256 maxParticipants;
        uint256 rewardPool; // funded in EDU
        uint64 deadline;
        bool open;
        address[] participants;
        mapping(address => Participant) participantInfo;
        mapping(address => uint8) reviewStars; // 0-5
    }

    uint256 public tasksCount;
    mapping(uint256 => Task) private _tasks;

    event TaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        string titleCid,
        string rubricCid,
        uint256 minStake,
        uint256 maxParticipants,
        uint256 rewardPool,
        uint64 deadline
    );
    event Joined(uint256 indexed taskId, address indexed user, uint256 staked);
    event Submitted(uint256 indexed taskId, address indexed user, string submissionCid);
    event Reviewed(uint256 indexed taskId, address indexed user, uint8 stars);
    event Settled(uint256 indexed taskId, uint256 totalPaid, uint256 refundedToCreator);

    constructor(IERC20 edu_) {
        require(address(edu_) != address(0), "edu=0");
        edu = edu_;
    }

    function createTask(
        string calldata titleCid,
        string calldata rubricCid,
        uint256 minStake,
        uint256 maxParticipants,
        uint256 rewardPool,
        uint64 deadline
    ) external nonReentrant returns (uint256 taskId) {
        require(bytes(titleCid).length > 0, "titleCid required");
        require(deadline > block.timestamp, "deadline past");
        require(maxParticipants > 0, "max=0");

        taskId = ++tasksCount;
        Task storage t = _tasks[taskId];
        t.creator = msg.sender;
        t.titleCid = titleCid;
        t.rubricCid = rubricCid;
        t.minStake = minStake;
        t.maxParticipants = maxParticipants;
        t.rewardPool = rewardPool;
        t.deadline = deadline;
        t.open = true;

        if (rewardPool > 0) {
            require(edu.transferFrom(msg.sender, address(this), rewardPool), "fund transfer fail");
        }

        emit TaskCreated(taskId, msg.sender, titleCid, rubricCid, minStake, maxParticipants, rewardPool, deadline);
    }

    function joinTask(uint256 taskId, uint256 stakeAmount) external nonReentrant {
        Task storage t = _tasks[taskId];
        require(t.open, "closed");
        require(block.timestamp < t.deadline, "deadline");
        require(t.participants.length < t.maxParticipants, "full");
        require(stakeAmount >= t.minStake, "stake<min");
        Participant storage p = t.participantInfo[msg.sender];
        require(p.staked == 0, "already joined");

        require(edu.transferFrom(msg.sender, address(this), stakeAmount), "stake transfer fail");

        p.staked = stakeAmount;
        t.participants.push(msg.sender);

        emit Joined(taskId, msg.sender, stakeAmount);
    }

    function submitWork(uint256 taskId, string calldata submissionCid) external {
        Task storage t = _tasks[taskId];
        require(t.open, "closed");
        Participant storage p = t.participantInfo[msg.sender];
        require(p.staked > 0, "not participant");
        require(!p.submitted, "already submitted");
        require(bytes(submissionCid).length > 0, "cid required");

        p.submitted = true;
        p.submissionCid = submissionCid;
        emit Submitted(taskId, msg.sender, submissionCid);
    }

    function reviewSubmission(uint256 taskId, address student, uint8 stars) external {
        Task storage t = _tasks[taskId];
        require(msg.sender == t.creator, "only creator");
        Participant storage p = t.participantInfo[student];
        require(p.staked > 0 && p.submitted, "not submitted");
        require(stars <= 5, "stars>5");
        t.reviewStars[student] = stars;
        emit Reviewed(taskId, student, stars);
    }

    function settleTask(uint256 taskId) external nonReentrant {
        Task storage t = _tasks[taskId];
        require(t.open, "closed");
        require(block.timestamp >= t.deadline, "not due");

        // Compute total stars
        uint256 totalStars;
        uint256 count = t.participants.length;
        for (uint256 i = 0; i < count; i++) {
            address student = t.participants[i];
            if (t.participantInfo[student].submitted) {
                totalStars += t.reviewStars[student];
            }
        }

        uint256 paid;
        if (t.rewardPool > 0) {
            if (totalStars == 0) {
                // refund to creator if no reviews/stars
                require(edu.transfer(t.creator, t.rewardPool), "refund fail");
                paid = t.rewardPool;
            } else {
                for (uint256 i = 0; i < count; i++) {
                    address student = t.participants[i];
                    Participant storage p = t.participantInfo[student];
                    if (!p.submitted) continue;
                    uint256 stars = t.reviewStars[student];
                    if (stars == 0) continue;
                    uint256 share = (t.rewardPool * stars) / totalStars;
                    if (share > 0) {
                        require(edu.transfer(student, share), "payout fail");
                        paid += share;
                    }
                }
            }
        }

        // Refund all stakes
        for (uint256 i = 0; i < count; i++) {
            address student = t.participants[i];
            uint256 st = t.participantInfo[student].staked;
            if (st > 0) {
                t.participantInfo[student].staked = 0;
                require(edu.transfer(student, st), "stake refund fail");
            }
        }

        t.open = false;
        uint256 refunded = t.rewardPool > paid ? (t.rewardPool - paid) : 0;
        if (refunded > 0) {
            // send remainder to creator to avoid stranded dust
            require(edu.transfer(t.creator, refunded), "remainder refund fail");
            paid = t.rewardPool; // total accounted
        }
        emit Settled(taskId, paid, refunded);
    }

    // --- Views ---
    function getTask(uint256 taskId)
        external
        view
        returns (
            address creator,
            string memory titleCid,
            string memory rubricCid,
            uint256 minStake,
            uint256 maxParticipants,
            uint256 rewardPool,
            uint64 deadline,
            bool open,
            uint256 participantCount
        )
    {
        Task storage t = _tasks[taskId];
        return (
            t.creator,
            t.titleCid,
            t.rubricCid,
            t.minStake,
            t.maxParticipants,
            t.rewardPool,
            t.deadline,
            t.open,
            t.participants.length
        );
    }

    function getParticipant(uint256 taskId, address student)
        external
        view
        returns (uint256 staked, bool submitted, string memory submissionCid, uint8 stars)
    {
        Task storage t = _tasks[taskId];
        Participant storage p = t.participantInfo[student];
        return (p.staked, p.submitted, p.submissionCid, t.reviewStars[student]);
    }
}


