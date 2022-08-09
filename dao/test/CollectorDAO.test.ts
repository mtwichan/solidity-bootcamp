import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract, providers } from "ethers";
import { AbiCoder } from "ethers/lib/utils";
import { ethers, network} from "hardhat";
import { version } from "process";
import {
  CollectorDAO,
  CollectorDAO__factory,
  TestContract,
  TestContract__factory
} from "../typechain";

const timeTravel = async (seconds: number) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

const setBlockTimeTo = async (seconds: number) => {
  await network.provider.send("evm_setNextBlockTimestamp", [seconds]);
  await network.provider.send("evm_mine");
};

describe("CollectorDAO", function () {
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let accounts: SignerWithAddress[];
  let collectorDAOFactory: CollectorDAO__factory;
  let collectorDAO: CollectorDAO;
  let testContractFactory: TestContract__factory;
  let testContract: TestContract;
  let abiCoder: AbiCoder;
  const TIME_PERIOD = 7 * 24 * 60 * 60;

  enum State {
    EXECUTED = 0,
    ACTIVE = 1,
    DEFEATED = 2,
    SUCCEEDED = 3
  };

  enum Vote {
    FOR_VOTE = 0,
    AGAINST_VOTE = 1,
    ABSTAIN_VOTE = 2
  }

  beforeEach(async () => {
    abiCoder = new ethers.utils.AbiCoder();
    [deployer, alice, bob] = await ethers.getSigners();
    [...accounts] = await ethers.getSigners();
    collectorDAOFactory = await ethers.getContractFactory("CollectorDAO");
    collectorDAO = (await collectorDAOFactory.deploy()) as CollectorDAO;
    testContractFactory = await ethers.getContractFactory("TestContract");
    testContract = (await testContractFactory.deploy()) as TestContract;
  });
  
  it("Deploys a contract", async () => {
    expect(collectorDAO.address).to.be.ok;
  });

  describe("Membership", async () => {
    it("Can become a member of the DAO", async () => {
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      expect(await collectorDAO.numberOfMembers()).to.equal(BigNumber.from("1"));
      expect(await collectorDAO.members(alice.address)).to.equal(true);
    });
    it("Cannot buy membership for less or more than 1 ETH", async() => {
      expect(collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1.1")})).to.be.revertedWith("Sender must send exactly 1 ETH to become a member");
      expect(collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("0.1")})).to.be.revertedWith("Sender must send exactly 1 ETH to become a member");
    });
    it("Can have multiple members", async () => {
      expect(await collectorDAO.members(alice.address)).to.equal(false);
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      expect(await collectorDAO.numberOfMembers()).to.equal(BigNumber.from("1"));
      expect(await collectorDAO.members(alice.address)).to.equal(true);

      expect(await collectorDAO.members(bob.address)).to.equal(false);
      await collectorDAO.connect(bob).becomeMember({value: ethers.utils.parseEther("1")});
      expect(await collectorDAO.numberOfMembers()).to.equal(BigNumber.from("2"));
      expect(await collectorDAO.members(bob.address)).to.equal(true);
    });
  });
  describe("Propose", async () => {
    let target, signature, value, calldata, description;
    // it("Cannot have non-member vote, empty proposal or invalid proposal length", async () => {});
    it("Can propose arbritrary function", async () => {
      
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("alice makes a proposal");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);
      
      expect(await (await collectorDAO.proposals(proposalId)).proposalState).to.equal(State.ACTIVE);
      expect(ethers.utils.parseBytes32String(await (await collectorDAO.proposals(proposalId)).description)).to.equal("alice makes a proposal");
      expect(await (await collectorDAO.proposals(proposalId)).proposer).to.equal(alice.address);
    });
    it("Can propose NFT function", async () => {
      target = [collectorDAO.address];
      value = [ethers.utils.parseEther("0")];
    
      calldata = [abiCoder.encode(["uint", "address", "address"], [1, testContract.address, testContract.address])];
      signature = ["buyNft(uint256,address,address)"];
      description = ethers.utils.formatBytes32String("Alice proposes to buy an NFT");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});

      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);
      
      expect(await (await collectorDAO.proposals(proposalId)).proposalState).to.equal(State.ACTIVE);
      expect(ethers.utils.parseBytes32String(await (await collectorDAO.proposals(proposalId)).description)).to.equal("Alice proposes to buy an NFT");
      expect(await (await collectorDAO.proposals(proposalId)).proposer).to.equal(alice.address);
    });
    it("Can create and set multiple new proposals", async () => {
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("alice makes a proposal");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      let tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      let receipt = await tx.wait();
      let proposalId = BigNumber.from(receipt.events![0].args!["_id"]);
      
      expect(await (await collectorDAO.proposals(proposalId)).proposalState).to.equal(State.ACTIVE);
      expect(ethers.utils.parseBytes32String(await (await collectorDAO.proposals(proposalId)).description)).to.equal("alice makes a proposal");
      expect(await (await collectorDAO.proposals(proposalId)).proposer).to.equal(alice.address);
      
      target = [collectorDAO.address];
      value = [ethers.utils.parseEther("1")];    
      calldata = [abiCoder.encode(["uint", "address", "address"], [1, testContract.address, testContract.address])];
      signature = ["buyNft(uint256,address,address)"];
      description = ethers.utils.formatBytes32String("Bob proposes to buy an NFT");
      await collectorDAO.connect(bob).becomeMember({value: ethers.utils.parseEther("1")});

      tx = await collectorDAO.connect(bob).propose(target, signature, value, calldata, description);
      receipt = await tx.wait();
      proposalId = BigNumber.from(receipt.events![0].args!["_id"]);
      
      expect(await (await collectorDAO.proposals(proposalId)).proposalState).to.equal(State.ACTIVE);
      expect(ethers.utils.parseBytes32String(await (await collectorDAO.proposals(proposalId)).description)).to.equal("Bob proposes to buy an NFT");
      expect(await (await collectorDAO.proposals(proposalId)).proposer).to.equal(bob.address);
    });

    it("Can create multiple function calls in one proposal", async () => {
      target = [testContract.address, collectorDAO.address];
      value = [ethers.utils.parseEther("0"), ethers.utils.parseEther("1")];
      calldata = [ethers.utils.formatBytes32String(""), abiCoder.encode(["uint", "address", "address"], [1, testContract.address, testContract.address])];
      signature = ["getAndIncrementTestNum()", "buyNft(uint256,address,address)"];
      description = ethers.utils.formatBytes32String("alice makes a big proposal");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});

      let tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      let receipt = await tx.wait();
      let proposalId = BigNumber.from(receipt.events![0].args!["_id"]);
      
      expect(await (await collectorDAO.proposals(proposalId)).proposalState).to.equal(State.ACTIVE);
      expect(ethers.utils.parseBytes32String(await (await collectorDAO.proposals(proposalId)).description)).to.equal("alice makes a big proposal");
      expect(await (await collectorDAO.proposals(proposalId)).proposer).to.equal(alice.address);
    });

  });
  describe("Voting", async () => {    
    let target, signature, value, calldata, description;
    it("Has a voting period of 5 day", async () => {
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("alice makes a proposal");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);
      
      expect(await (await collectorDAO.proposals(proposalId)).proposalState).to.equal(State.ACTIVE);
      expect(ethers.utils.parseBytes32String(await (await collectorDAO.proposals(proposalId)).description)).to.equal("alice makes a proposal");
      expect(await (await collectorDAO.proposals(proposalId)).proposer).to.equal(alice.address);

      await collectorDAO.connect(accounts[3]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[3]).castVote(proposalId, 0);
      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(1);
      timeTravel(TIME_PERIOD);
      await collectorDAO.connect(accounts[4]).becomeMember({value: ethers.utils.parseEther("1")});
      expect(collectorDAO.connect(accounts[4]).castVote(proposalId, 0)).to.be.revertedWith("Proposal must be in the active state'");
    });
    it("Can have member vote", async () => {
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("bob makes a proposal");
      await collectorDAO.connect(bob).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(bob).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);
      
      expect(await (await collectorDAO.proposals(proposalId)).proposalState).to.equal(State.ACTIVE);
      expect(ethers.utils.parseBytes32String(await (await collectorDAO.proposals(proposalId)).description)).to.equal("bob makes a proposal");
      expect(await (await collectorDAO.proposals(proposalId)).proposer).to.equal(bob.address);

      await collectorDAO.connect(accounts[3]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[3]).castVote(proposalId, 0);
      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(1);
    });
    it("Can have multiple members vote", async () => {
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("bob makes a proposal");
      await collectorDAO.connect(bob).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(bob).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);
      
      expect(await (await collectorDAO.proposals(proposalId)).proposalState).to.equal(State.ACTIVE);
      expect(ethers.utils.parseBytes32String(await (await collectorDAO.proposals(proposalId)).description)).to.equal("bob makes a proposal");
      expect(await (await collectorDAO.proposals(proposalId)).proposer).to.equal(bob.address);

      await collectorDAO.connect(accounts[3]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[3]).castVote(proposalId, 0);
      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(1);

      await collectorDAO.connect(accounts[4]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[4]).castVote(proposalId, 1);
      expect(await (await collectorDAO.proposals(proposalId)).againstVotes).to.equal(1);

      await collectorDAO.connect(accounts[5]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[5]).castVote(proposalId, 2);
      expect(await (await collectorDAO.proposals(proposalId)).abstainVotes).to.equal(1);

      await collectorDAO.connect(accounts[6]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[6]).castVote(proposalId, 0);
      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(2);

      await collectorDAO.connect(accounts[7]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[7]).castVote(proposalId, 1);
      expect(await (await collectorDAO.proposals(proposalId)).againstVotes).to.equal(2);

      await collectorDAO.connect(accounts[8]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[8]).castVote(proposalId, 2);
      expect(await (await collectorDAO.proposals(proposalId)).abstainVotes).to.equal(2);
    });
    it("Can have member vote by signature", async () => {
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("alice makes a proposal");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(bob).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);

      expect(await (await collectorDAO.proposals(proposalId)).proposalState).to.equal(State.ACTIVE);
      expect(ethers.utils.parseBytes32String(await (await collectorDAO.proposals(proposalId)).description)).to.equal("alice makes a proposal");
      expect(await (await collectorDAO.proposals(proposalId)).proposer).to.equal(alice.address);

      const types = {
        Vote: [
          {name: "proposalId", type: "uint256"},
          {name: "support", type: "uint8"}
        ]
      };

      const domainData = {
        name: "CollectorDAO",
        chainId: await bob.getChainId(),
        verifyingContract: collectorDAO.address,
        salt: "0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a558",
      };

      const data = {
        proposalId: proposalId,
        support: 0,
      };
      
      const digest = await bob._signTypedData(
        domainData,
        types,
        data
      )

      const { v,r,s } = await ethers.utils.splitSignature(digest);
      await collectorDAO.castVoteBySig(proposalId, 0, v, r, s);

      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(1);
    });
    it("Can have multiple member vote by signature", async () => {
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("alice makes a proposal");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(bob).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[3]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[4]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[5]).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);

      expect(await (await collectorDAO.proposals(proposalId)).proposalState).to.equal(State.ACTIVE);
      expect(ethers.utils.parseBytes32String(await (await collectorDAO.proposals(proposalId)).description)).to.equal("alice makes a proposal");
      expect(await (await collectorDAO.proposals(proposalId)).proposer).to.equal(alice.address);

      const types = {
        Vote: [
          {name: "proposalId", type: "uint256"},
          {name: "support", type: "uint8"}
        ]
      };

      const domainData = {
        name: "CollectorDAO",
        chainId: await bob.getChainId(),
        verifyingContract: collectorDAO.address,
        salt: "0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a558",
      };

      let data = {
        proposalId: proposalId,
        support: 0,
      };
      
      let digest = await bob._signTypedData(
        domainData,
        types,
        data
      )

      let { v,r,s } = await ethers.utils.splitSignature(digest);
      await collectorDAO.castVoteBySig(proposalId, 0, v, r, s);

      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(1);
      expect(collectorDAO.castVoteBySig(proposalId, 0, v, r, s)).to.be.revertedWith("Caller has already voted");
      data = {
        proposalId: proposalId,
        support: 1,
      };
      
      digest = await accounts[3]._signTypedData(
        domainData,
        types,
        data
      );

      ({ v,r,s } = await ethers.utils.splitSignature(digest));
      await collectorDAO.castVoteBySig(proposalId, 1, v, r, s);
      expect(await (await collectorDAO.proposals(proposalId)).againstVotes).to.equal(1);
      expect(collectorDAO.castVoteBySig(proposalId, 1, v, r, s)).to.be.revertedWith("Caller has already voted");
      data = {
        proposalId: proposalId,
        support: 2,
      };
      
      digest = await accounts[4]._signTypedData(
        domainData,
        types,
        data
      );

      ({ v,r,s } = await ethers.utils.splitSignature(digest));
      await collectorDAO.castVoteBySig(proposalId, 2, v, r, s);
      expect(await (await collectorDAO.proposals(proposalId)).abstainVotes).to.equal(1);
      expect(collectorDAO.castVoteBySig(proposalId, 2, v, r, s)).to.be.revertedWith("Caller has already voted");
    });
    it("Can have members vote by signature and vote", async () => {
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("alice makes a proposal");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(bob).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);

      expect(await (await collectorDAO.proposals(proposalId)).proposalState).to.equal(State.ACTIVE);
      expect(ethers.utils.parseBytes32String(await (await collectorDAO.proposals(proposalId)).description)).to.equal("alice makes a proposal");
      expect(await (await collectorDAO.proposals(proposalId)).proposer).to.equal(alice.address);

      const types = {
        Vote: [
          {name: "proposalId", type: "uint256"},
          {name: "support", type: "uint8"}
        ]
      };

      const domainData = {
        name: "CollectorDAO",
        chainId: await bob.getChainId(),
        verifyingContract: collectorDAO.address,
        salt: "0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a558",
      };

      const data = {
        proposalId: proposalId,
        support: 0,
      };
      
      const digest = await bob._signTypedData(
        domainData,
        types,
        data
      )

      const { v,r,s } = await ethers.utils.splitSignature(digest);
      await collectorDAO.castVoteBySig(proposalId, 0, v, r, s);

      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(1);
      await collectorDAO.connect(alice).castVote(proposalId, 1);
      expect(await (await collectorDAO.proposals(proposalId)).againstVotes).to.equal(1);

    });
    it("Can have members vote by signature group", async () => {
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("alice makes a proposal");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);

      const types = {
        Vote: [
          {name: "proposalId", type: "uint256"},
          {name: "support", type: "uint8"}
        ]
      };

      const domainData = {
        name: "CollectorDAO",
        chainId: await bob.getChainId(),
        verifyingContract: collectorDAO.address,
        salt: "0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a558",
      };

      const data = {
        proposalId: proposalId,
        support: 0,
      };
      
      const vArray = [];
      const rArray = [];
      const sArray = [];
      const supportArray = [];
      let digest;
      let v, r, s;
      for (let idx = 2; idx <= 10; idx++) {
        await collectorDAO.connect(accounts[idx]).becomeMember({value: ethers.utils.parseEther("1")});
        digest = await accounts[idx]._signTypedData(
          domainData,
          types,
          data
        );
        ({ v,r,s } = await ethers.utils.splitSignature(digest));
        vArray.push(v);
        rArray.push(r);
        sArray.push(s);
        supportArray.push(0);
      };
      digest = await accounts[2]._signTypedData(
        domainData,
        types,
        data
      );

      // push member that has already voted
      ({ v,r,s } = await ethers.utils.splitSignature(digest));
      vArray.push(v);
      rArray.push(r);
      sArray.push(s);
      supportArray.push(0);
      
      await collectorDAO.castVoteBySigGroup(proposalId, supportArray, vArray, rArray, sArray);
      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(9);
    });

    it("Can transition vote to succeeded and executed if vote above quorum", async () => {
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("alice makes a proposal");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);
      
      for (let idx = 2; idx <= 10; idx++) {
        await collectorDAO.connect(accounts[idx]).becomeMember({value: ethers.utils.parseEther("1")});
      }
      expect(await collectorDAO.numberOfMembers()).to.equal("10");
      expect(collectorDAO.connect(accounts[6]).execute(target, signature, value, calldata)).to.be.revertedWith("Proposal must be in succeeded state to execute");
      await collectorDAO.connect(accounts[3]).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[4]).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[5]).castVote(proposalId, 0);
      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(3);
      expect(await collectorDAO.getProposalState(proposalId)).to.equal(State.ACTIVE);
      timeTravel(TIME_PERIOD);
      expect(collectorDAO.connect(accounts[6]).castVote(proposalId, 0)).to.be.revertedWith("Proposal must be in the active state");
      expect(await testContract.testNum()).to.be.equal(+0);
      await collectorDAO.connect(accounts[6]).execute(target, signature, value, calldata);
      expect(await collectorDAO.getProposalState(proposalId)).to.equal(State.EXECUTED);
      expect(await testContract.testNum()).to.be.equal(1);
    });

    it("Can transition vote to failed if below quorum and time expiry", async () => {
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("alice makes a proposal");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);
      
      for (let idx = 2; idx <= 10; idx++) {
        await collectorDAO.connect(accounts[idx]).becomeMember({value: ethers.utils.parseEther("1")});
      }
      expect(await collectorDAO.numberOfMembers()).to.equal("10");
      await collectorDAO.connect(accounts[3]).castVote(proposalId, 0);
      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(1);
      expect(await collectorDAO.getProposalState(proposalId)).to.equal(State.ACTIVE);
      await timeTravel(TIME_PERIOD);
      await collectorDAO.connect(accounts[6]).execute(target, signature, value, calldata);
      expect(await collectorDAO.getProposalState(proposalId)).to.equal(State.DEFEATED);      
    });
  });
  describe("Execute", async () => {
    let target, signature, value, calldata, description;
    it("Can buy NFT from marketplace", async () => {
      target = [collectorDAO.address];
      value = [ethers.utils.parseEther("5")];
      calldata = [abiCoder.encode(["uint256","address","address"],[1,testContract.address,testContract.address])];
      signature = ["buyNft(uint256,address,address)"];
      description = ethers.utils.formatBytes32String("propose to buy NFT");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(bob).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[3]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[4]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[5]).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);

      await collectorDAO.connect(alice).castVote(proposalId, 0);
      await collectorDAO.connect(bob).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[3]).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[4]).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[5]).castVote(proposalId, 0);
      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(5);
      await timeTravel(TIME_PERIOD);
      await collectorDAO.connect(alice).execute(target, signature, value, calldata, {value: ethers.utils.parseEther("5")});
      expect(await collectorDAO.getProposalState(proposalId)).to.equal(State.EXECUTED);

    });
    it("Can execute arbritrary function", async () => {
      target = [testContract.address];
      value = [ethers.utils.parseEther("0")];
      calldata = [ethers.utils.formatBytes32String("")];
      signature = ["getAndIncrementTestNum()"];
      description = ethers.utils.formatBytes32String("alice makes a proposal");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(bob).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[3]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[4]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[5]).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);

      await collectorDAO.connect(alice).castVote(proposalId, 0);
      await collectorDAO.connect(bob).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[3]).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[4]).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[5]).castVote(proposalId, 0);
      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(5);
      await timeTravel(TIME_PERIOD);
      expect(await testContract.testNum()).to.be.equal(+0);
      await collectorDAO.connect(alice).execute(target, signature, value, calldata);
      expect(await collectorDAO.getProposalState(proposalId)).to.equal(State.EXECUTED);
      expect(await testContract.testNum()).to.be.equal(1);                  
    });

    it("Can revert execution of function with error message", async () => {
      target = [collectorDAO.address];
      value = [ethers.utils.parseEther("0.1")];
      calldata = [abiCoder.encode(["uint256","address","address"],[1,testContract.address,testContract.address])];
      signature = ["buyNft(uint256,address,address)"];
      description = ethers.utils.formatBytes32String("propose to buy NFT");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(bob).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[3]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[4]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[5]).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);

      await collectorDAO.connect(alice).castVote(proposalId, 0);
      await collectorDAO.connect(bob).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[3]).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[4]).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[5]).castVote(proposalId, 0);
      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(5);
      await timeTravel(TIME_PERIOD);
      expect(collectorDAO.connect(alice).execute(target, signature, value, calldata, {value: ethers.utils.parseEther("0.1")})).to.be.revertedWith("Msg.value must be greater than NFT price");
    });

    it("Can revert execution of function without error message", async () => {
      target = [collectorDAO.address];
      value = [ethers.utils.parseEther("2")];
      calldata = [abiCoder.encode(["uint256","address","address"],[1,testContract.address,testContract.address])];
      signature = ["buyNft(uint256 a,address,address)"];
      description = ethers.utils.formatBytes32String("propose to buy NFT");
      await collectorDAO.connect(alice).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(bob).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[3]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[4]).becomeMember({value: ethers.utils.parseEther("1")});
      await collectorDAO.connect(accounts[5]).becomeMember({value: ethers.utils.parseEther("1")});
      const tx = await collectorDAO.connect(alice).propose(target, signature, value, calldata, description);
      const receipt = await tx.wait();
      const proposalId = BigNumber.from(receipt.events![0].args!["_id"]);

      await collectorDAO.connect(alice).castVote(proposalId, 0);
      await collectorDAO.connect(bob).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[3]).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[4]).castVote(proposalId, 0);
      await collectorDAO.connect(accounts[5]).castVote(proposalId, 0);
      expect(await (await collectorDAO.proposals(proposalId)).forVotes).to.equal(5);
      await timeTravel(TIME_PERIOD);
      expect(collectorDAO.connect(alice).execute(target, signature, value, calldata, {value: ethers.utils.parseEther("2")})).to.be.revertedWith("Transaction reverted silently");
    });
  });
});