// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/// @title Domain controller
/// @author Serhii Bondarenko
/// @notice You can use this contract for storing a domain name and an address of the domain owners
/// @dev The contract owner can change the price of domains and withdraw ether from the contract
/// @custom:experimental This is an experimental contract.
contract DomainStorage {

    address public owner;
    uint256 public domainCost;
    Domain[] public domains;

    /// @notice Event during the registration of a new domain
    event DomainAdded(
        address indexed from,
        uint indexed when,
        string domain,
        address domainOwner
    );

    /// @notice Domain structure that contains a domain name and the owner address
    struct Domain {
        string domainName;
        address domainOwner;
    }

    /// @notice Create a new domain storage contract
    /// @param _domainCost The price of each domain in Ether
    /// @dev Set deployer as the contract owner
    constructor(uint256 _domainCost) {
        owner = msg.sender;
        domainCost = _domainCost;
    }

    /// @notice Modifier to check for contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    /// @notice Modifier to check that provided domain can be only first level
    modifier checkSingleDomain(string memory domain) {
        bytes memory dotBytes = bytes (".");
        bytes memory domainBytes = bytes (domain);

        require(domainBytes.length >= dotBytes.length);

        bool found = false;
        for (uint i = 0; i <= domainBytes.length - dotBytes.length; i++) {
            bool flag = true;
            for (uint j = 0; j < dotBytes.length; j++)
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

    /// @notice Add a new domain for the specific owner address. Domain must be unique and only first level
    /// @param _domain The domain name
    /// @param _owner The owner of domain
    /// @dev Requires that the amount of Ether must be equal to domainCost value
    function add(string memory _domain, address _owner) public payable checkSingleDomain(_domain) {
        require(msg.value == domainCost, "Incorrect domain payment");
        bool isOwned = false;
        bytes32 domainHash = keccak256(abi.encodePacked(_domain));
        for (uint i=0; i < domains.length; i++) {
            if (domainHash == keccak256(abi.encodePacked(domains[i].domainName))) {
                isOwned = true;
                break;
            }
        }
        require(!isOwned, "Domain already owned");
        domains.push(Domain(_domain, _owner));
        emit DomainAdded(msg.sender, block.timestamp, _domain, _owner);
    }

    /// @return The number of registered domains
    function getDomainsCount() public onlyOwner view returns(uint) {
        return domains.length;
    }

    /// @notice Changes the price of domains
    /// @dev Can only be changed by the contract owner
    function updateCost(uint256 _newCost) public onlyOwner {
        domainCost = _newCost;
    }

    /// @return Current price for domain
    function getCost() public view returns(uint256) {
        return domainCost;
    }

    /// @return Contract balance
    /// @dev Can only be changed by the contract owner
    function getBalance() public onlyOwner view returns(uint)  {
        return address(this).balance;
    }

    /// @notice Withdraw money from the contract
    /// @dev Can only be changed by the contract owner
    function withdraw() public onlyOwner {
        address payable to = payable(msg.sender);
        to.transfer(getBalance());
    }
}