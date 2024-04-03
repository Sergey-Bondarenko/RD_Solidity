import { expect } from "chai";

const tokens = (n) => {
    return ethers.parseUnits(n.toString(), 'ether')
}

describe("DomainStorage", () => {
    let contract
    let deployer, owner1, owner2

    beforeEach(async  () => {
        // Setup
        [deployer, owner1, owner2] = await ethers.getSigners();

        // Deploy
        const factory = await ethers.getContractFactory('DomainStorage');
        contract = await factory.deploy(tokens(1));

        // Add a domain
        const transaction = await contract.connect(deployer).buyDomain("test", owner1.address, { value: tokens(1) });
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
            const result = await contract.connect(deployer).getDomainsCount();
            expect(result).to.be.equal("1");
        })
        it("Get balance", async () => {
            const result = await contract.connect(deployer).getBalance();
            expect(result).to.be.equal("1000000000000000000");
        })
        it("Get balance with reject", async () => {
            await expect(contract.connect(owner1).getBalance()).to.be.rejectedWith(
                "Unauthorized"
            );
        })
        it("Withdraw", async () => {
            await contract.connect(deployer).withdraw();
            const result = await contract.connect(deployer).getBalance();
            expect(result).to.be.equal("0");
        })
        it("Withdraw with reject", async () => {
            await expect(contract.connect(owner1).withdraw()).to.be.rejectedWith(
                "Unauthorized"
            );
        })
    })

    describe("Domain", () => {
        it("Check first domain", async () => {
            let domain = await contract.domains(0);
            expect(domain.domainName).to.be.equal("test");
            expect(domain.domainOwner).to.be.equal(owner1);
        })
        it("Check add owned domain", async () => {
            await expect(contract.connect(owner1).buyDomain("test", owner1.address, { value: tokens(1) }))
                .to.be.revertedWith("Domain already owned");
        })
    })

    describe("DomainStorage", () => {
        it("should emit a DomainAdded event with correct data", async () =>  {
            const contractEvent = await ethers.deployContract("DomainStorage", [tokens(1)]);
            contractEvent.on("DomainAdded", (from, when, domain, domainOwner) => {
                console.log("[%d] Added a new domain %s for %s from %s controller", when, domain, domainOwner, from);
            });

            await contractEvent.connect(deployer).buyDomain("test1", owner1.address, { value: tokens(1) });
            await contractEvent.connect(owner1).buyDomain("test2", owner2.address, { value: tokens(1) });
            await contractEvent.connect(owner2).buyDomain("test3", deployer.address, { value: tokens(1) });
            await contractEvent.connect(deployer).buyDomain("test4", owner2.address, { value: tokens(1) });
            await contractEvent.connect(deployer).buyDomain("test5", owner1.address, { value: tokens(1) });

            const filter = contractEvent.filters.DomainAdded(deployer.address, null, null, null);
            const logs = await contractEvent.queryFilter(filter, 1, "latest");
            logs.map((log) => {
                console.log("log.args: ", log.args);
            });
            expect(logs.length).to.equal(3);
        })
    })
})

