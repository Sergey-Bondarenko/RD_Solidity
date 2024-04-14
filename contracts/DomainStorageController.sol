// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "solidity-stringutils/src/strings.sol";

/**
 * @title Domain Storage controller
 * @author Serhii Bondarenko
 * @notice You can use this contract for storing a domain name and an address of the domain owners. If subdomains are reused, their owners receive 5% of the domain value
 * @dev The contract owner can change the price of domains and withdraw ether from the contract
 * @custom:experimental This is an experimental contract.
 */
contract DomainStorageController is Initializable {

    using strings for *;

    address public owner;
    uint256 public domainCost;
    uint64 public domainCount;
    mapping(string => address) public domains;
    mapping(string => address) public subDomains;
    mapping(address => uint256) private domainOwnersWallets;
    uint256 private ownerEth;

    /// @notice Event during the registration of a new domain
    event DomainAdded(
        address indexed from,
        uint indexed when,
        string domain,
        address domainOwner
    );

    error Unauthorized();

    /**
     * @notice Create a new domain storage contract
     * @param _domainCost The price of each domain in Ether
     * @dev Set deployer as the contract owner
     */
    function initialize(uint256 _domainCost) public initializer  {
        owner = msg.sender;
        domainCost = _domainCost;
    }

    /**
     * @notice Upgrade domain storage contract
     * @param _domainCost  price of each domain in Ether
     * @dev Set deployer as the contract owner
     */
    function reinitialize(uint256 _domainCost) public reinitializer(2) {
        owner = msg.sender;
        domainCost = _domainCost;
        ownerEth = address(this).balance;
    }

    /**
     * @notice Buy an available domain for the specific owner address. Domain must be unique and only first level
     * @param domain The domain name
     * @param buyer The owner of domain
     * @dev Requires that the amount of Ether must be equal to domainCost value
     */
    function buyDomainName(string memory domain, address buyer) external payable {
        require(msg.value == domainCost, "Incorrect domain payment");
        if (domains[domain] != address(0x0)) {
            revert("Domain already owned");
        }
        uint256 reward = msg.value;
        strings.slice memory s = domain.toSlice();
        strings.slice memory delim = ".".toSlice();
        uint256 subdomainCount = s.count(delim);
        string memory checkSubdomain = s.rsplit(delim).toString(); // reverse split return first domain
        for (uint i = 0; i < subdomainCount; ++i) {
            if (domains[checkSubdomain] != address (0x0)) {
                domainOwnersWallets[domains[checkSubdomain]] += domainCost / 20; // 5% reward
                reward -= domainCost / 20;
            }
            checkSubdomain = string.concat(s.rsplit(delim).toString(), ".", checkSubdomain);
        }
        ownerEth += reward;
        domains[domain] = buyer;
        ++domainCount;
        emit DomainAdded(msg.sender, block.timestamp, domain, buyer);
    }

    /**
     * @notice Changes the price of domains
     * @param newCost New domain price
     * @dev Can be called only by the contract owner
     */
    function updateCost(uint256 newCost) external {
        require(newCost > 0, "Free domains are not available");
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        domainCost = newCost;
    }

    /**
     * @return Contract balance
     * @dev Can be called only by the contract owner
     */
    function getContractBalance() external view returns(uint)  {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        return address(this).balance;
    }

    /**
     * @return Owner balance
     * @dev Can be called only by the contract owner
     */
    function getOwnerBalance() external view returns(uint)  {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        return ownerEth;
    }

    /**
     * @return Domain owner balance
     * @param domain The domain name
     * @dev Can be called only by the domain owner
     */
    function getDomainOwnerBalance(string memory domain) external view returns(uint)  {
        if (msg.sender != domains[domain]) {
            revert Unauthorized();
        }
        return domainOwnersWallets[domains[domain]];
    }

    /**
     * @notice Withdraw owner money from the contract
     * @dev Can be called only by the contract owner
     */
    function withdrawOwner() external {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        (bool success,) = owner.call{value: ownerEth}("");
        require(success, "Failed to withdraw Ether");
        ownerEth = 0;
    }

    /**
     * @notice Withdraw domain owner reward money from the contract
     * @param domain The domain name
     * @dev Can be called only by the contract owner
     */
    function withdrawDomainReward(string memory domain) external {
        if (msg.sender != domains[domain]) {
            revert Unauthorized();
        }
        (bool success,) = msg.sender.call{value: domainOwnersWallets[domains[domain]]}("");
        require(success, "Failed to withdraw Ether");
        domainOwnersWallets[domains[domain]] = 0;
    }
}