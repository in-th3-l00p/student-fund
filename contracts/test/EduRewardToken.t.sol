// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EduStar.sol";

contract EduStarTest is Test {
    EduStar internal star;
    address internal admin = address(0x1001);
    address internal minter = address(0x1002);
    address internal user = address(0x2002);

    function setUp() public {
        star = new EduStar(admin, 10_000 ether);
        // grant minter role from admin
        vm.startPrank(admin);
        star.grantRole(star.MINTER_ROLE(), minter);
        vm.stopPrank();
    }

    function test_MetadataAndInitialSupply() public {
        assertEq(star.name(), "EduStar");
        assertEq(star.symbol(), "STAR");
        assertEq(star.totalSupply(), 10_000 ether);
        assertEq(star.balanceOf(admin), 10_000 ether);
    }

    function test_MintByMinterRole() public {
        vm.prank(minter);
        star.mint(user, 777 ether);
        assertEq(star.balanceOf(user), 777 ether);
    }

    function test_MintDeniedWithoutRole() public {
        vm.prank(user);
        vm.expectRevert(); // AccessControl revert
        star.mint(user, 1 ether);
    }

    function test_Burn() public {
        vm.prank(admin);
        star.burn(100 ether);
        assertEq(star.balanceOf(admin), 9_900 ether);
    }
}


