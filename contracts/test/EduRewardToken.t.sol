// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EduRewardToken.sol";

contract EduRewardTokenTest is Test {
    EduRewardToken internal rwd;
    address internal admin = address(0x1001);
    address internal minter = address(0x1002);
    address internal user = address(0x2002);

    function setUp() public {
        rwd = new EduRewardToken(admin, 10_000 ether);
        // grant minter role from admin
        vm.startPrank(admin);
        rwd.grantRole(rwd.MINTER_ROLE(), minter);
        vm.stopPrank();
    }

    function test_MetadataAndInitialSupply() public {
        assertEq(rwd.name(), "EduReward");
        assertEq(rwd.symbol(), "RWD");
        assertEq(rwd.totalSupply(), 10_000 ether);
        assertEq(rwd.balanceOf(admin), 10_000 ether);
    }

    function test_MintByMinterRole() public {
        vm.prank(minter);
        rwd.mint(user, 777 ether);
        assertEq(rwd.balanceOf(user), 777 ether);
    }

    function test_MintDeniedWithoutRole() public {
        vm.prank(user);
        vm.expectRevert(); // AccessControl revert
        rwd.mint(user, 1 ether);
    }

    function test_Burn() public {
        vm.prank(admin);
        rwd.burn(100 ether);
        assertEq(rwd.balanceOf(admin), 9_900 ether);
    }
}


