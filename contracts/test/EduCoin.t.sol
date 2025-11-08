// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EduCoin.sol";
import "@openzeppelin-contracts-5.5.0/access/Ownable.sol";

contract EduCoinTest is Test {
    EduCoin internal coin;
    address internal owner = address(0x1001);
    address internal user = address(0x2002);

    function setUp() public {
        coin = new EduCoin(owner, 1_000_000 ether);
    }

    function test_Metadata() public view {
        assertEq(coin.name(), "EduCoin");
        assertEq(coin.symbol(), "EDU");
        assertEq(coin.decimals(), 18);
    }

    function test_ConstructorMintsInitialSupplyToOwner() public view {
        assertEq(coin.balanceOf(owner), 1_000_000 ether);
        assertEq(coin.totalSupply(), 1_000_000 ether);
    }

    function test_OwnerCanMint() public {
        vm.prank(owner);
        coin.mint(user, 123 ether);
        assertEq(coin.balanceOf(user), 123 ether);
        assertEq(coin.totalSupply(), 1_000_000 ether + 123 ether);
    }

    function test_NonOwnerCannotMint() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        coin.mint(user, 1 ether);
    }
}


