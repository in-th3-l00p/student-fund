// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EduCoin.sol";
import "../src/EduRewardToken.sol";
import "../src/EduCoinStakingVault.sol";

contract EduCoinStakingVaultTest is Test {
    EduCoin internal edu;
    EduCoinStakingVault internal vault;
    EduRewardToken internal rwd;

    address internal owner = address(0x1001);
    address internal user = address(0x2002);
    address internal donationSink = address(0x3003);

    function setUp() public {
        edu = new EduCoin(owner, 1_000_000 ether);

        // Deploy a simple vault with modest APR and split
        vault = new EduCoinStakingVault(
            IERC20(address(edu)),
            "EduCoin Staking Vault",
            "eEDU",
            owner,
            500,          // 5% APR
            2000,         // 20% donation split
            30 days,      // max lock duration
            donationSink  // donation sink
        );

        // User gets EDU and approves vault
        vm.startPrank(owner);
        edu.mint(user, 10_000 ether);
        vm.stopPrank();

        vm.prank(user);
        edu.approve(address(vault), type(uint256).max);
    }

    function test_DepositAndLockAndWithdrawAfterUnlock() public {
        vm.startPrank(user);
        uint256 shares = vault.depositLocked(1_000 ether, user, 7 days);
        assertGt(shares, 0);
        assertEq(vault.lockExpiry(user) > 0, true);
        vm.expectRevert("Vault: assets locked");
        vault.withdraw(100 ether, user, user);
        vm.warp(block.timestamp + 8 days);
        vault.withdraw(100 ether, user, user);
        vm.stopPrank();
    }

    function test_EstimateAndShowcase_MintsRewardToken() public {
        // Deploy reward token and enable showcase mode
        rwd = new EduRewardToken(owner, 0);
        vm.startPrank(owner);
        // grant vault MINTER_ROLE
        rwd.grantRole(rwd.MINTER_ROLE(), address(vault));
        vault.setRewardToken(address(rwd), true);
        vm.stopPrank();

        // Simulate 1000 EDU for 90 days
        vm.prank(user);
        (uint256 donationAmount, uint256 userCredited) = vault.simulateAndCreditShowcase(user, 1_000 ether, 90 days);
        assertGt(donationAmount, 0);
        assertGt(userCredited, 0);

        // Donation minted to donationSink; user credited minted to user
        assertEq(rwd.balanceOf(donationSink), donationAmount);
        assertEq(rwd.balanceOf(user), userCredited);
        assertEq(vault.showcaseBalances(user), userCredited);
    }
}


