// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EduCoin.sol";
import "../src/TaskRegistry.sol";

contract TaskRegistryTest is Test {
    EduCoin internal edu;
    TaskRegistry internal reg;

    address internal owner = address(0x1001);
    address internal creator = address(0x2002);
    address internal alice = address(0x3003);
    address internal bob = address(0x4004);

    function setUp() public {
        edu = new EduCoin(owner, 1_000_000 ether);
        reg = new TaskRegistry(IERC20(address(edu)));

        // Fund creator and participants
        vm.startPrank(owner);
        edu.mint(creator, 10_000 ether);
        edu.mint(alice, 5_000 ether);
        edu.mint(bob, 5_000 ether);
        vm.stopPrank();

        vm.prank(creator);
        edu.approve(address(reg), type(uint256).max);
        vm.prank(alice);
        edu.approve(address(reg), type(uint256).max);
        vm.prank(bob);
        edu.approve(address(reg), type(uint256).max);
    }

    function test_CreateJoinSubmitReviewSettle_DistributesProportionally() public {
        vm.prank(creator);
        uint256 taskId = reg.createTask("titleCID", "rubricCID", 100 ether, 3, 1_000 ether, uint64(block.timestamp + 1 days));

        // Join with required stake
        vm.prank(alice);
        reg.joinTask(taskId, 100 ether);
        vm.prank(bob);
        reg.joinTask(taskId, 100 ether);

        // Submit work
        vm.prank(alice);
        reg.submitWork(taskId, "aliceCID");
        vm.prank(bob);
        reg.submitWork(taskId, "bobCID");

        // Creator reviews
        vm.prank(creator);
        reg.reviewSubmission(taskId, alice, 3);
        vm.prank(creator);
        reg.reviewSubmission(taskId, bob, 1);

        // Advance time and settle
        vm.warp(block.timestamp + 2 days);
        reg.settleTask(taskId);

        // Reward pool 1000 split 3:1 => 750 / 250
        assertEq(edu.balanceOf(alice), 5_000 ether - 100 ether + 100 ether + 750 ether); // initial - stake + refund + payout
        assertEq(edu.balanceOf(bob), 5_000 ether - 100 ether + 100 ether + 250 ether);
    }

    function test_RefundWhenNoStars() public {
        uint256 creatorStart = edu.balanceOf(creator);
        vm.prank(creator);
        uint256 taskId = reg.createTask("titleCID", "rubricCID", 50 ether, 3, 500 ether, uint64(block.timestamp + 1 days));

        vm.prank(alice);
        reg.joinTask(taskId, 50 ether);

        vm.prank(alice);
        reg.submitWork(taskId, "aliceCID");

        vm.warp(block.timestamp + 2 days);
        reg.settleTask(taskId);

        // No reviews => reward refunded to creator, stake refunded to alice
        assertEq(edu.balanceOf(creator), creatorStart - 500 ether + 500 ether);
        assertEq(edu.balanceOf(alice), 5_000 ether);
    }

    function test_CannotJoinPastDeadlineOrWhenFull() public {
        vm.prank(creator);
        uint256 taskId = reg.createTask("titleCID", "rubricCID", 10 ether, 1, 0, uint64(block.timestamp + 1 days));
        vm.prank(alice);
        reg.joinTask(taskId, 10 ether);

        // Now full
        vm.expectRevert(abi.encodeWithSignature("Error(string)", "full"));
        vm.prank(bob);
        reg.joinTask(taskId, 10 ether);

        // New task with past deadline
        vm.prank(creator);
        uint256 taskId2 = reg.createTask("titleCID", "rubricCID", 10 ether, 2, 0, uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + 2 days);
        vm.expectRevert(abi.encodeWithSignature("Error(string)", "deadline"));
        vm.prank(bob);
        reg.joinTask(taskId2, 10 ether);
    }
}


