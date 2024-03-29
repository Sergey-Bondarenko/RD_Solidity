import { expect } from "chai";

const tokens = (n) => {
    return ethers.parseUnits(n.toString(), 'ether')
}

describe("DomainStorage", () => {
    let contract
    let deployer, owner1

    beforeEach(async  () => {
        // Setup
        [deployer, owner1] = await ethers.getSigners();

        // Deploy
        const factory = await ethers.getContractFactory('DomainStorage');
        contract = await factory.deploy(tokens(1));

        // Add a domain
        const transaction = await contract.connect(deployer).add("test", owner1.address, { value: tokens(1) });
        await transaction.wait();
    })

    describe("Deploy", () => {
        it("Sets the owner", async () => {
            const result = await contract.owner();
            expect(result).to.equal(deployer.address);
        })
    })

    describe("Contract", () => {
        it("Get cost", async () => {
            const result = await contract.connect(deployer).getCost();
            expect(result).to.be.equal("1000000000000000000");
        })
        it("Set the new cost", async () => {
            await contract.connect(deployer).updateCost(tokens(2));
            const result = await contract.connect(owner1).getCost();
            expect(result).to.be.equal("2000000000000000000");
        })
        it("Set the new cost with reject", async () => {
            await expect(contract.connect(owner1).updateCost(tokens(2))).to.be.revertedWith(
                "Not contract owner"
            );
        })
        it("Get domains count", async () => {
            const result = await contract.connect(deployer).getDomainsCount();
            expect(result).to.be.equal("1");
        })
        it("Get domains count with reject", async () => {
            await expect(contract.connect(owner1).getDomainsCount()).to.be.revertedWith(
                "Not contract owner"
            );
        })
        it("Get balance", async () => {
            const result = await contract.connect(deployer).getBalance();
            expect(result).to.be.equal("1000000000000000000");
        })
        it("Get balance with reject", async () => {
            await expect(contract.connect(owner1).getBalance()).to.be.revertedWith(
                "Not contract owner"
            );
        })
        it("Withdraw", async () => {
            await contract.connect(deployer).withdraw();
            const result = await contract.connect(deployer).getBalance();
            expect(result).to.be.equal("0");
        })
        it("Withdraw with reject", async () => {
            await expect(contract.connect(owner1).withdraw()).to.be.revertedWith(
                "Not contract owner"
            );
        })
    })

    describe("Domain", () => {
        it("Check first domain", async  () => {
            let domain = await contract.domains(0);
            expect(domain.domainName).to.be.equal("test");
            expect(domain.domainOwner).to.be.equal(owner1);
        })
        it("Check add owned domain", async () => {
            await expect(contract.connect(owner1).add("test", owner1.address, { value: tokens(1) }))
                .to.be.revertedWith("Domain already owned");
        })
    })
})

