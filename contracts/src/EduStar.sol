// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin-contracts-5.5.0/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin-contracts-5.5.0/token/ERC20/extensions/ERC20Burnable.sol";
import {AccessControl} from "@openzeppelin-contracts-5.5.0/access/AccessControl.sol";

/**
 * @title EduStar
 * @notice ERC20 token used for reputation/rewards within the EduChain protocol.
 *         Uses role-based access control for minting to support authorized distributors.
 */
contract EduStar is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @param admin The address that will receive DEFAULT_ADMIN_ROLE and MINTER_ROLE.
     * @param initialSupply The amount of tokens to mint to the admin at deployment (18 decimals).
     */
    constructor(address admin, uint256 initialSupply) ERC20("EduStar", "STAR") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        if (initialSupply > 0) {
            _mint(admin, initialSupply);
        }
    }

    /**
     * @notice Mint new tokens to a recipient.
     * @dev Callable only by accounts with MINTER_ROLE.
     * @param to Recipient address.
     * @param amount Token amount to mint (18 decimals).
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}


