// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/**
 * @title Domain controller
 * @author Serhii Bondarenko
 * @notice You can use this contract for storing a domain name and an address of the domain owners
 * @dev The contract owner can change the price of domains and withdraw ether from the contract
 * @custom:experimental This is an experimental contract.
 */
contract DomainStorage {

    address public owner;
    uint256 public domainCost;
    uint64 public domainCount;
    mapping(string => address) public domains;

    /// @notice Event during the registration of a new domain
    event DomainAdded(
        address indexed from,
        uint indexed when,
        string domain,
        address domainOwner
    );

    error Unauthorized();

    /// @notice Modifier to check that provided domain can be only first level
    modifier checkSingleDomain(string memory domain) {
        bytes memory dotBytes = bytes (".");
        bytes memory domainBytes = bytes (domain);

        require(domainBytes.length >= dotBytes.length);

        bool found;
        for (uint i = 0; i <= domainBytes.length - dotBytes.length; ++i) {
            bool flag = true;
            for (uint j = 0; j < dotBytes.length; ++j)
                if (domainBytes[i + j] != dotBytes[j]) {
                    flag = false;
                    break;
                }
            if (flag) {
                found = true;
                break;
            }
        }
        require(!found, "Only first-level domains are supported");
        _;
    }

    /**
     * @notice Create a new domain storage contract
     * @param _domainCost The price of each domain in Ether
     * @dev Set deployer as the contract owner
     */
    constructor(uint256 _domainCost) {
        owner = msg.sender;
        domainCost = _domainCost;
    }

    /**
     * @notice Buy an available domain for the specific owner address. Domain must be unique and only first level
     * @param domain The domain name
     * @param buyer The owner of domain
     * @dev Requires that the amount of Ether must be equal to domainCost value
     */
    function buyDomain(string memory domain, address buyer) external payable checkSingleDomain(domain) {
        require(msg.value == domainCost, "Incorrect domain payment");
        if (domains[domain] != address(0x0)) {
            revert("Domain already owned");
        }
        domains[domain] = buyer;
        ++domainCount;
        emit DomainAdded(msg.sender, block.timestamp, domain, buyer);
    }

    /**
     * @notice Changes the price of domains
     * @dev Can only be changed by the contract owner
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
     * @dev Can only be changed by the contract owner
     */
    function getBalance() external view returns(uint)  {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        return address(this).balance;
    }

    /**
     * @notice Withdraw money from the contract
     * @dev Can only be changed by the contract owner
     */
    function withdraw() external {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        (bool success,) = owner.call{value: address(this).balance}("");
        require(success, "Failed to withdraw Ether");
    }
}