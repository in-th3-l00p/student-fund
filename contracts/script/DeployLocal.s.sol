// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {IERC20} from "@openzeppelin-contracts-5.5.0/token/ERC20/IERC20.sol";

import {EduCoin} from "../src/EduCoin.sol";
import {EduStar} from "../src/EduStar.sol";
import {EduCoinStakingVault} from "../src/EduCoinStakingVault.sol";
import {EduDonationTreasury} from "../src/EduDonationTreasury.sol";
import {TaskRegistry} from "../src/TaskRegistry.sol";

contract DeployLocal is Script {

    struct Accounts {
        address deployer;
        address alice;
        address bob;
        address profA;
        address profB;
        address donor;
    }

    function run() external {
        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0));
        require(pk != 0, "PRIVATE_KEY env required");

        Accounts memory acc = _deriveOrEnvAccounts();

        vm.startBroadcast(pk);

        // Deploy core tokens
        EduCoin edu = new EduCoin(acc.deployer, 0);
        EduStar star = new EduStar(acc.deployer, 0);

        // Deploy treasury and set threshold
        EduDonationTreasury treasury = new EduDonationTreasury(acc.deployer, 1 ether);

        // Deploy staking vault, wire donation sink to treasury
        EduCoinStakingVault vault = new EduCoinStakingVault(
            IERC20(address(edu)),
            "EduCoin Staking Vault",
            "eEDU",
            acc.deployer,
            600,        // 6% APR
            2500,       // 25% donation split
            60 days,
            address(treasury)
        );

        // Enable showcase minting with EduStar
        star.grantRole(star.MINTER_ROLE(), address(vault));
        vault.setRewardToken(address(star), true);

        // Deploy task registry (uses EDU)
        TaskRegistry registry = new TaskRegistry(IERC20(address(edu)));

        // Seed accounts with EDU and ETH
        _seedAccounts(edu, acc);

        // Treasury professor setup
        treasury.addOrUpdateProfessor(acc.profA, 30);
        treasury.addOrUpdateProfessor(acc.profB, 70);

        // Optional: donate some ETH and trigger a distribution demonstration
        (bool ok, ) = address(treasury).call{value: 10 ether}("");
        require(ok, "seed eth to treasury failed");
        treasury.distribute();

        vm.stopBroadcast();

        // Persist outputs
        _writeOutputs(edu, star, vault, treasury, registry, acc);
        _printSummary(edu, star, vault, treasury, registry, acc);
    }

    function _deriveOrEnvAccounts() internal view returns (Accounts memory acc) {
        acc.deployer = vm.addr(vm.envOr("PRIVATE_KEY", uint256(0)));
        acc.alice = vm.envOr("ALICE", address(0));
        acc.bob = vm.envOr("BOB", address(0));
        acc.profA = vm.envOr("PROF_A", address(0));
        acc.profB = vm.envOr("PROF_B", address(0));
        acc.donor = vm.envOr("DONOR", address(0));

        // Fallback deterministic addresses (not necessarily funded until we fund them)
        if (acc.alice == address(0)) acc.alice = vm.addr(2);
        if (acc.bob == address(0)) acc.bob = vm.addr(3);
        if (acc.profA == address(0)) acc.profA = vm.addr(4);
        if (acc.profB == address(0)) acc.profB = vm.addr(5);
        if (acc.donor == address(0)) acc.donor = vm.addr(6);
    }

    function _seedAccounts(EduCoin edu, Accounts memory acc) internal {
        // Seed ETH
        payable(acc.alice).transfer(5 ether);
        payable(acc.bob).transfer(5 ether);
        payable(acc.profA).transfer(1 ether);
        payable(acc.profB).transfer(1 ether);
        payable(acc.donor).transfer(10 ether);

        // Seed EDU
        edu.mint(acc.alice, 20_000 ether);
        edu.mint(acc.bob, 10_000 ether);
        edu.mint(acc.profA, 1_000 ether);
        edu.mint(acc.profB, 1_000 ether);
    }

    function _writeOutputs(
        EduCoin edu,
        EduStar star,
        EduCoinStakingVault vault,
        EduDonationTreasury treasury,
        TaskRegistry registry,
        Accounts memory acc
    ) internal {
        string memory pathEnv = string.concat(vm.projectRoot(), "/deployments/local.env");

        // Write .env
        string memory env = string.concat(
            "NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545\n",
            "NEXT_PUBLIC_CHAIN_ID=31337\n",
            "NEXT_PUBLIC_EDUCOIN_ADDRESS=", _toHex(address(edu)), "\n",
            "NEXT_PUBLIC_EDUSTAR_ADDRESS=", _toHex(address(star)), "\n",
            "NEXT_PUBLIC_VAULT_ADDRESS=", _toHex(address(vault)), "\n",
            "NEXT_PUBLIC_DONATION_TREASURY_ADDRESS=", _toHex(address(treasury)), "\n",
            "NEXT_PUBLIC_TASK_REGISTRY_ADDRESS=", _toHex(address(registry)), "\n",
            "NEXT_PUBLIC_DEMO_ACCOUNTS_JSON=",
            _demoAccountsJson(acc),
            "\n"
        );
        vm.writeFile(pathEnv, env);
    }

    function _printSummary(
        EduCoin edu,
        EduStar star,
        EduCoinStakingVault vault,
        EduDonationTreasury treasury,
        TaskRegistry registry,
        Accounts memory acc
    ) internal view {
        console2.log("Deployed contracts:");
        console2.log("  EduCoin:             %s", address(edu));
        console2.log("  EduStar:             %s", address(star));
        console2.log("  EduCoinStakingVault: %s", address(vault));
        console2.log("  EduDonationTreasury: %s", address(treasury));
        console2.log("  TaskRegistry:        %s", address(registry));
        console2.log("");
        console2.log("Demo accounts:");
        console2.log("  Deployer: %s", acc.deployer);
        console2.log("  Alice:    %s", acc.alice);
        console2.log("  Bob:      %s", acc.bob);
        console2.log("  ProfA:    %s", acc.profA);
        console2.log("  ProfB:    %s", acc.profB);
        console2.log("  Donor:    %s", acc.donor);
    }

    function _toHex(address a) internal pure returns (string memory) {
        bytes20 data = bytes20(a);
        bytes memory hexChars = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = hexChars[uint8(data[i] >> 4)];
            str[3 + i * 2] = hexChars[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }

    function _demoAccountsJson(Accounts memory acc) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                "'[{\"label\":\"Deployer\",\"address\":\"",
                _toHex(acc.deployer),
                "\"},{\"label\":\"Alice\",\"address\":\"",
                _toHex(acc.alice),
                "\"},{\"label\":\"Bob\",\"address\":\"",
                _toHex(acc.bob),
                "\"},{\"label\":\"ProfA\",\"address\":\"",
                _toHex(acc.profA),
                "\"},{\"label\":\"ProfB\",\"address\":\"",
                _toHex(acc.profB),
                "\"},{\"label\":\"Donor\",\"address\":\"",
                _toHex(acc.donor),
                "\"}]'"
            )
        );
    }
}


