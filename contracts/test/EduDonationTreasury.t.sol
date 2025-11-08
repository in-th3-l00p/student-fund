// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EduDonationTreasury.sol";

contract EduDonationTreasuryTest is Test {
    EduDonationTreasury internal treasury;
    address internal owner = address(0x1001);
    address internal donor = address(0x4444);
    address internal profA = address(0x1111);
    address internal profB = address(0x2222);
    address internal profC = address(0x3333);

    function setUp() public {
        treasury = new EduDonationTreasury(owner, 1 ether);
        vm.deal(donor, 100 ether);
    }

    function test_AddUpdateRemoveProfessors() public {
        vm.prank(owner);
        treasury.addOrUpdateProfessor(profA, 10);
        vm.prank(owner);
        treasury.addOrUpdateProfessor(profB, 20);
        (bool existsA, uint256 wA) = treasury.getProfessorInfo(profA);
        (bool existsB, uint256 wB) = treasury.getProfessorInfo(profB);
        assertTrue(existsA && existsB);
        assertEq(wA, 10);
        assertEq(wB, 20);
        assertEq(treasury.totalRatingWeight(), 30);

        vm.prank(owner);
        treasury.addOrUpdateProfessor(profA, 15);
        (, wA) = treasury.getProfessorInfo(profA);
        assertEq(wA, 15);
        assertEq(treasury.totalRatingWeight(), 35);

        vm.prank(owner);
        treasury.removeProfessor(profB);
        (bool existsB2, ) = treasury.getProfessorInfo(profB);
        assertTrue(!existsB2);
        assertEq(treasury.totalRatingWeight(), 15);
    }

    function test_DistributeProportionally_WhenThresholdReached() public {
        vm.startPrank(owner);
        treasury.addOrUpdateProfessor(profA, 10);
        treasury.addOrUpdateProfessor(profB, 30);
        treasury.addOrUpdateProfessor(profC, 60);
        treasury.setDistributionThreshold(5 ether);
        vm.stopPrank();

        // donate 10 ETH
        vm.prank(donor);
        (bool ok, ) = address(treasury).call{value: 10 ether}("");
        assertTrue(ok);
        assertEq(address(treasury).balance, 10 ether);

        // Anyone can trigger distribution
        treasury.distribute();

        // 10 ETH split by weights: A=1, B=3, C=6 ETH
        assertEq(profA.balance, 1 ether);
        assertEq(profB.balance, 3 ether);
        assertEq(profC.balance, 6 ether);

        // No ETH left (except dust if any rounding occurred)
        assertEq(address(treasury).balance, 0);
    }

    function test_Distribute_RevertsBelowThreshold() public {
        vm.prank(owner);
        treasury.addOrUpdateProfessor(profA, 1);

        vm.deal(address(treasury), 0.5 ether);
        vm.expectRevert("Below threshold");
        treasury.distribute();
    }
}


