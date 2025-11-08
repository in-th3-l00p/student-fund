// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EduCoin.sol";
import "../src/EduRewardToken.sol";
import "../src/EduCoinStakingVault.sol";
import "../src/EduDonationTreasury.sol";

/**
 * @title Integration tests across EduCoin, StakingVault, RewardToken, and DonationTreasury
 */
contract IntegrationTest is Test {
    EduCoin internal edu;
    EduRewardToken internal rwd;
    EduCoinStakingVault internal vault;
    EduDonationTreasury internal treasury;

    address internal owner = address(0x1001);
    address internal alice = address(0x1002);
    address internal bob = address(0x1003);
    address internal profA = address(0x1111);
    address internal profB = address(0x2222);
    address internal donor = address(0x3333);

    function setUp() public {
        edu = new EduCoin(owner, 1_000_000 ether);
        rwd = new EduRewardToken(owner, 0);
        treasury = new EduDonationTreasury(owner, 1 ether);

        // Setup professors and threshold
        vm.startPrank(owner);
        treasury.addOrUpdateProfessor(profA, 30);
        treasury.addOrUpdateProfessor(profB, 70);
        treasury.setDistributionThreshold(5 ether);
        vm.stopPrank();

        // Deploy staking vault and wire reward token + donation sink
        vault = new EduCoinStakingVault(
            IERC20(address(edu)),
            "EduCoin Staking Vault",
            "eEDU",
            owner,
            600,         // 6% APR
            2500,        // 25% donation split
            60 days,
            address(treasury) // donation sink points to treasury (it will hold RWD passively)
        );

        // Grant vault minting rights on reward token and enable showcase
        vm.startPrank(owner);
        rwd.grantRole(rwd.MINTER_ROLE(), address(vault));
        vault.setRewardToken(address(rwd), true);
        vm.stopPrank();

        // Fund users with EDU for staking
        vm.startPrank(owner);
        edu.mint(alice, 20_000 ether);
        edu.mint(bob, 10_000 ether);
        vm.stopPrank();

        vm.prank(alice);
        edu.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        edu.approve(address(vault), type(uint256).max);

        vm.deal(donor, 100 ether);
    }

    function test_EndToEnd_ShowcaseMintingAndDonationDistribution() public {
        // Alice simulates yield and gets RWD; donation portion minted to treasury
        vm.prank(alice);
        (uint256 donation1, uint256 user1) = vault.simulateAndCreditShowcase(alice, 5_000 ether, 120 days);
        assertGt(donation1, 0);
        assertGt(user1, 0);
        assertEq(rwd.balanceOf(alice), user1);
        assertEq(rwd.balanceOf(address(treasury)), donation1);

        // Bob simulates too
        vm.prank(bob);
        (uint256 donation2, uint256 user2) = vault.simulateAndCreditShowcase(bob, 2_500 ether, 60 days);
        assertGt(donation2, 0);
        assertGt(user2, 0);
        assertEq(rwd.balanceOf(bob), user2);
        assertEq(rwd.balanceOf(address(treasury)), donation1 + donation2);

        // External ETH donations arrive to the treasury
        vm.prank(donor);
        (bool ok, ) = address(treasury).call{value: 10 ether}("");
        assertTrue(ok);
        assertEq(address(treasury).balance, 10 ether);

        // Distribute ETH to professors according to weights (30/70)
        treasury.distribute();
        assertEq(profA.balance, 3 ether);
        assertEq(profB.balance, 7 ether);
        assertEq(address(treasury).balance, 0);
    }

    function test_Vault_LockPreventsWithdraw_UntilExpiry() public {
        // Alice deposits with lock
        vm.startPrank(alice);
        uint256 shares = vault.depositLocked(2_000 ether, alice, 10 days);
        assertGt(shares, 0);
        vm.expectRevert("Vault: assets locked");
        vault.redeem(100 ether, alice, alice);
        vm.warp(block.timestamp + 11 days);
        vault.redeem(100 ether, alice, alice);
        vm.stopPrank();
    }
}


