import { expect } from "chai";

const tokens = (n) => {
    return ethers.parseUnits(n.toString(), 'ether')
}

describe("DomainStorageController", () => {
    let contract
    let DSContract
    let deployer, owner1, owner2, owner3

    beforeEach(async  () => {
        // Setup
        [deployer, owner1, owner2, owner3] = await ethers.getSigners();

        // Deploy
        DSContract = await ethers.getContractFactory('DomainStorageController');
        contract = await upgrades.deployProxy(DSContract, [tokens(1)]);

        // Add a domain
        const transaction = await contract.connect(deployer).buyDomainName("com", owner1.address, { value: tokens(1) });
        await transaction.wait();
    })

    describe("Deploy", () => {
        it("Sets the owner", async () => {
            const result = await contract.owner();
            expect(result).to.equal(deployer.address);
        })
    })

    describe("Contract", () => {
        it("Set the new cost", async () => {
            await contract.connect(deployer).updateCost(tokens(2));
            const result = await contract.connect(owner1).domainCost();
            expect(result).to.be.equal("2000000000000000000");
        })
        it("Set the new cost with reject", async () => {
            await expect(contract.connect(owner1).updateCost(tokens(2))).to.be.rejectedWith(
                "Unauthorized"
            );
        })
        it("Get domains count", async () => {
            const result = await contract.connect(deployer).domainCount();
            expect(result).to.be.equal("1");
        })
        it("Get balance", async () => {
            const result = await contract.connect(deployer).getContractBalance();
            expect(result).to.be.equal("1000000000000000000");
        })
        it("Get balance with reject", async () => {
            await expect(contract.connect(owner1).getContractBalance()).to.be.rejectedWith(
                "Unauthorized"
            );
        })
        it("Withdraw", async () => {
            await contract.connect(deployer).withdrawOwner();
            const result = await contract.connect(deployer).getContractBalance();
            expect(result).to.be.equal("0");
        })
        it("Withdraw with reject", async () => {
            await expect(contract.connect(owner1).withdrawOwner()).to.be.rejectedWith(
                "Unauthorized"
            );
        })
        it("Withdraw for domain owner", async () => {
            await contract.connect(owner3).buyDomainName("buy.com", owner3.address, { value: tokens(1) });
            expect(await contract.connect(owner1).getDomainOwnerBalance("com")).to.be.equal("50000000000000000");
            await contract.connect(owner1).withdrawDomainReward("com");
            expect(await contract.connect(owner1).getDomainOwnerBalance("com")).to.be.equal("0");
        })
        it("Withdraw for domain owner (second level)", async () => {
            await contract.connect(owner3).buyDomainName("buy1.com", owner3.address, { value: tokens(1) });
            await contract.connect(owner2).buyDomainName("buy2.buy1.com", owner2.address, { value: tokens(1) });
            expect(await contract.connect(owner1).getDomainOwnerBalance("com")).to.be.equal("100000000000000000");
            expect(await contract.connect(owner3).getDomainOwnerBalance("buy1.com")).to.be.equal("50000000000000000");
            await contract.connect(owner1).withdrawDomainReward("com");
            expect(await contract.connect(owner1).getDomainOwnerBalance("com")).to.be.equal("0");
            expect(await contract.connect(deployer).getOwnerBalance()).to.be.equal("2850000000000000000");
        })
    })

    describe("Domain", () => {
        it("Check first domain", async () => {
            let domain = await contract.domains("com");
            expect(domain).to.be.equal(owner1);
        })
        it("Check add owned domain", async () => {
            await expect(contract.connect(owner1).buyDomainName("com", owner1.address, { value: tokens(1) }))
                .to.be.revertedWith("Domain already owned");
        })
        it("Check add domain with already used subdomain", async () => {
            await expect(contract.connect(owner1).buyDomainName("test.com", owner1.address, { value: tokens(1) }))
                .to.be.ok;
        })
    })

    describe("DomainStorage", () => {
        it("should emit a DomainAdded event with correct data", async () =>  {
            const contractEvent = await upgrades.deployProxy(DSContract, [tokens(1)]);
            await contractEvent.on("DomainAdded", (from, when, domain, domainOwner) => {
                console.log("[%d] Added a new domain %s for %s from %s controller", when, domain, domainOwner, from);
            });

            await contractEvent.connect(deployer).buyDomainName("com", deployer.address, { value: tokens(1) });
            await contractEvent.connect(deployer).buyDomainName("test1.com", owner1.address, { value: tokens(1) });
            await contractEvent.connect(owner1).buyDomainName("test2.test1.com", owner2.address, { value: tokens(1) });
            await contractEvent.connect(owner2).buyDomainName("test3.test2.test1.com", deployer.address, { value: tokens(1) });
            await contractEvent.connect(deployer).buyDomainName("test4.com", owner2.address, { value: tokens(1) });
            await contractEvent.connect(deployer).buyDomainName("test5.test4.com", owner1.address, { value: tokens(1) });



            const filter = contractEvent.filters.DomainAdded(deployer.address, null, null, null);
            const logs = await contractEvent.queryFilter(filter, 1, "latest");
            logs.map((log) => {
                console.log("log.args: ", log.args);
            });
            expect(logs.length).to.equal(4);
            const result = await contractEvent.connect(deployer).getOwnerBalance();
            expect(result).to.be.equal("5550000000000000000");
        })
    })
})

