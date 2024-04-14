import assert from "assert";

const tokens = (n) => {
    return ethers.parseUnits(n.toString(), 'ether')
}

(async () => {

    let [deployer, owner1, owner2] = await ethers.getSigners();

    const Contract = await ethers.getContractFactory("DomainStorage");
    // const contract = await Contract.deploy();
    const contract = await upgrades.deployProxy(Contract, [tokens(1)]);
    const contractAddress = await contract.getAddress();
    console.log("DomainStorage deployed to: ", contractAddress);

    await contract.connect(deployer).buyDomain("com", owner1.address, { value: tokens(1) });
    await contract.connect(deployer).buyDomain("test", owner2.address, { value: tokens(1) });

    const ContractV2 = await ethers.getContractFactory("DomainStorageController");
    const upgradedToContractV2 = await upgrades.upgradeProxy(contractAddress, ContractV2);
    console.log("DomainStorageController upgraded\n");
    console.log("address: ", contractAddress);
    console.log("upgradedToContractV2 address: ", await upgradedToContractV2.getAddress());
    assert(await upgradedToContractV2.getAddress() === contractAddress);
    console.log("\nAddresses are the same!\n");

    const contractReward = await upgradedToContractV2.connect(deployer).getBalance();
    console.log("balance: ", contractReward);

    await upgradedToContractV2.connect(deployer).buyDomainName("test.com", owner2.address, { value: tokens(1) });
})();
