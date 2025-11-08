// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin-contracts-5.5.0/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin-contracts-5.5.0/access/Ownable.sol";

/**
 * @title EduCoin
 * @notice ERC20 utility token for the EduChain protocol.
 *         Owner can mint new tokens; initial supply can be minted at deployment.
 */
contract EduCoin is ERC20, Ownable {
    /**
     * @param initialOwner The address that will be set as the initial contract owner.
     * @param initialSupply The amount of tokens to mint to the initial owner on deployment (in wei units, considering 18 decimals).
     */
    constructor(address initialOwner, uint256 initialSupply)
        ERC20("EduCoin", "EDU")
        Ownable(initialOwner)
    {
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
        }
    }

    /**
     * @notice Mint new tokens to a recipient.
     * @dev Only callable by the contract owner.
     * @param to Recipient address.
     * @param amount Token amount to mint (in wei units, considering 18 decimals).
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

