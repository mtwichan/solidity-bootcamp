// ----------------------------------------------------------------------------
// REQUIRED: Instructions
// ----------------------------------------------------------------------------
/*
  For this first project, we've provided a significant amount of scaffolding
  in your test suite. We've done this to:

    1. Set expectations, by example, of where the bar for testing is.
    2. Encourage more students to embrace an Advanced Typescript Hardhat setup.
    3. Reduce the amount of time consumed this week by "getting started friction".

  Please note that:

    - We will not be so generous on future projects!
    - The tests provided are about ~90% complete.
    - IMPORTANT:
      - We've intentionally left out some tests that would reveal potential
        vulnerabilities you'll need to identify, solve for, AND TEST FOR!

      - Failing to address these vulnerabilities will leave your contracts
        exposed to hacks, and will certainly result in extra points being
        added to your micro-audit report! (Extra points are _bad_.)

  Your job (in this file):

    - DO NOT delete or change the test names for the tests provided
    - DO complete the testing logic inside each tests' callback function
    - DO add additional tests to test how you're securing your smart contracts
         against potential vulnerabilties you identify as you work through the
         project.

    - You will also find several places where "FILL_ME_IN" has been left for
      you. In those places, delete the "FILL_ME_IN" text, and replace with
      whatever is appropriate.
*/
// ----------------------------------------------------------------------------

import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  Project,
  ProjectFactory,
  ProjectFactory__factory,
  Project__factory,
} from "../typechain";

import { int } from "hardhat/internal/core/params/argumentTypes";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Result } from "ethers/lib/utils";
import exp from "constants";

// ----------------------------------------------------------------------------
// OPTIONAL: Constants and Helper Functions
// ----------------------------------------------------------------------------
// We've put these here for your convenience. Feel free to use them if they
// are helpful!
const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");
// Bump the timestamp by a specific amount of seconds
const timeTravel = async (seconds: number) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

// Or, set the time to be a specific amount (in seconds past epoch time)
const setBlockTimeTo = async (seconds: number) => {
  await network.provider.send("evm_setNextBlockTimestamp", [seconds]);
  await network.provider.send("evm_mine");
};
// ----------------------------------------------------------------------------

describe("Crowdfundr", () => {
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  let Project: Project__factory;
  let ProjectFactory: ProjectFactory__factory;
  let projectFactory: ProjectFactory;
  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    // NOTE: You may need to pass arguments to the `deploy` function if your
    //       ProjectFactory contract's constructor has input parameters

    ProjectFactory = await ethers.getContractFactory("ProjectFactory");
    projectFactory = (await ProjectFactory.deploy()) as ProjectFactory;

    Project = await ethers.getContractFactory("Project");

    await projectFactory.deployed();
  });

  describe("ProjectFactory: Additional Tests", () => {
    /* 
      TODO: You may add additional tests here if you need to

      NOTE: If you wind up writing Solidity code to protect against a
            vulnerability that is not tested for below, you should add
            at least one test here.

      DO NOT: Delete or change the test names for the tests provided below
    */
  });

  describe("ProjectFactory", () => {
    it("Deploys a contract", () => {
      expect(projectFactory.address).to.be.ok;
      expect(projectFactory.address !== "0x").to.equal(true);
    });

    it("Can register a single project", async () => {
      let projectId: BigNumber;
      projectId = await projectFactory.projectId();
      expect(projectId).to.equal(BigNumber.from("0"));
      await projectFactory.connect(alice).create(ethers.utils.parseEther("10"));
      projectId = await projectFactory.projectId();
      expect(projectId).to.equal(BigNumber.from("1"));
      const projectAddress: string = await projectFactory.childrenContracts(projectId);
      expect((await ethers.provider.getCode(projectAddress)) !== "0x").to.equal(true);
    });

    it("Can register multiple projects", async () => {
      let projectId: BigNumber;
      let projectAddressOne: string;
      let projectAddressTwo: string;
      projectId = await projectFactory.projectId();
      expect(projectId).to.equal(BigNumber.from(0));
      await projectFactory.connect(alice).create(ethers.utils.parseEther("10"));
      await projectFactory.connect(bob).create(ethers.utils.parseEther("20"));
      projectId = await projectFactory.projectId();
      expect(projectId).to.equal(BigNumber.from("2"));
      projectAddressOne = await projectFactory.childrenContracts(BigNumber.from(1));
      projectAddressTwo = await projectFactory.childrenContracts(BigNumber.from(2));
      expect((await ethers.provider.getCode(projectAddressOne)) !== "0x").to.equal(true);      
      expect((await ethers.provider.getCode(projectAddressTwo)) !== "0x").to.equal(true);
    });

    it("Registers projects with the correct owner", async () => {
      let projectId: BigNumber;
      let projectAddress: string;
      let project: Project;
      await projectFactory.connect(alice).create(ethers.utils.parseEther("10"));
      await projectFactory.connect(bob).create(ethers.utils.parseEther("20"));
      projectId = await projectFactory.projectId();
      expect(projectId).to.equal(BigNumber.from("2"));
      projectAddress = await projectFactory.childrenContracts(BigNumber.from(1));
      project = await ethers.getContractAt("Project", projectAddress);
      expect((await ethers.provider.getCode(projectAddress)) !== "0x").to.equal(true);
      expect(await project.owner()).to.equal(await alice.address);
      projectAddress = await projectFactory.childrenContracts(BigNumber.from(2));
      project = await ethers.getContractAt("Project", projectAddress);
      expect((await ethers.provider.getCode(projectAddress)) !== "0x").to.equal(true);
      expect(await project.owner()).to.equal(await bob.address);
    });

    it("Registers projects with a preset funding goal (in units of ether)", async () => {
      let projectId: BigNumber;
      let projectAddress: string;
      let project: Project;
      await projectFactory.connect(alice).create(ethers.utils.parseEther("10"));
      projectId = await projectFactory.projectId();
      expect(projectId).to.equal(BigNumber.from(1));
      projectAddress = await projectFactory.childrenContracts(BigNumber.from(1));
      project = await ethers.getContractAt("Project", projectAddress);
      expect(await project.fundingGoal()).to.equal(ethers.utils.parseEther("10"));
    });

    it('Emits a "CreateEvent" event after registering a project', async () => {
      const tx: ContractTransaction = await projectFactory.connect(alice).create(ethers.utils.parseEther("10"));
      const txReceipt: ContractReceipt = await tx.wait();
      const eventArguments: any = txReceipt.events![0].args;
      const eventName: string = txReceipt.events![0].event!;
      const eventProjectSender: string = eventArguments[0];
      const eventProjectAddress: string = eventArguments[1];
      const eventProjectId: BigNumber = eventArguments[2];
      expect(eventName).to.equal("CreateEvent");
      expect(alice.address).to.equal(eventProjectSender);
      expect(await projectFactory.childrenContracts(BigNumber.from(1))).to.equal(eventProjectAddress);
      expect(await projectFactory.projectId()).to.equal(eventProjectId);
    });

    it("Allows multiple contracts to accept ETH simultaneously", async () => {
      await projectFactory.connect(alice).create(ethers.utils.parseEther("10"));
      await projectFactory.connect(bob).create(ethers.utils.parseEther("20"));
      const projectOneAddress: string = await projectFactory.childrenContracts(BigNumber.from(1));
      const projectTwoAddress: string = await projectFactory.childrenContracts(BigNumber.from(2));
      const projectOne: Project = await ethers.getContractAt("Project", projectOneAddress);
      const projectTwo: Project = await ethers.getContractAt("Project", projectTwoAddress);
      await projectOne.connect(alice).contribute({value: ethers.utils.parseEther("1")});
      await projectTwo.connect(bob).contribute({value: ethers.utils.parseEther("2")});
      expect(await projectOne.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("1"));
      expect(await projectTwo.amountOwing(bob.address)).to.equal(ethers.utils.parseEther("2"));
      expect(projectOne.address).not.be.equal(projectTwo.address);
    });
  });

  describe("Project: Additional Tests", () => {
    /* 
      TODO: You may add additional tests here if you need to

      NOTE: If you wind up protecting against a vulnerability that is not
            tested for below, you should add at least one test here.

      DO NOT: Delete or change the test names for the tests provided below
    */
  });

  describe("Project", () => {
    let projectAddress: string;
    let project: Project;
    const CROWDFUND_LIMIT: string = "10";
    enum State {
      RUNNING = 0,
      FAILED = 1,
      SUCCESSFUL = 2
    };

    beforeEach(async () => {
      // TODO: Your ProjectFactory contract will need a `create` method, to
      //       create new Projects
      const txReceiptUnresolved = await projectFactory.create(
        ethers.utils.parseEther(CROWDFUND_LIMIT)
      );
      const txReceipt = await txReceiptUnresolved.wait();

      projectAddress = txReceipt.events![0].args![1];
      project = await ethers.getContractAt("Project", projectAddress);
    });

    describe("Contributions", () => {
      describe("Contributors", () => {
        it("Allows the creator to contribute", async () => {
          await project.contribute({value:  ethers.utils.parseEther("5")});
          expect(await project.owner()).to.equal(deployer.address);
          expect(await project.amountOwing(deployer.address)).to.equal( ethers.utils.parseEther("5"));          
        });

        it("Allows any EOA to contribute", async () => {
          await project.connect(alice).contribute({value:  ethers.utils.parseEther("5")});
          expect(await project.contributors(0)).to.equal(alice.address);
          expect(await project.amountOwing(alice.address)).to.equal( ethers.utils.parseEther("5"));          
        });

        it("Allows an EOA to make many separate contributions", async () => {          
          await project.connect(alice).contribute({value: ethers.utils.parseEther("1")});
          expect(await project.contributors(0)).to.equal(alice.address);
          expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("1"));
          await project.connect(alice).contribute({value: ethers.utils.parseEther("1.5")});
          expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("2.5"));
          await project.connect(alice).contribute({value: ethers.utils.parseEther("0.2")});
          expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("2.7"));
          await project.connect(alice).contribute({value: ethers.utils.parseEther("4")});
          expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("6.7"));
        });

        it('Emits a "ContributeEvent" event after a contribution is made', async () => {
          const txReceiptUnresolved: ContractTransaction = await project.connect(alice).contribute({value: ethers.utils.parseEther("5")});
          const txReceipt: ContractReceipt = await txReceiptUnresolved.wait();
          const eventName: string = txReceipt.events![1].event!;
          const eventArguments: any = txReceipt.events![1]!.args;
          const eventSender: string = eventArguments[0];
          const eventContribution: BigNumber = eventArguments[1];
          const eventTotalContribution: BigNumber = eventArguments[2];
          expect(eventName).to.equal("ContributeEvent");
          expect(eventSender).to.equal(alice.address);
          expect(eventContribution).to.equal(ethers.utils.parseEther("5"));
          expect(eventTotalContribution).to.equal(ethers.utils.parseEther("5"));
        });
      });

      describe("Minimum ETH Per Contribution", () => {
        it("Reverts contributions below 0.01 ETH", async () => {
          expect(project.contribute({value: ethers.utils.parseEther("0.001")})).to.be.revertedWith("Contribution must be larger than 0.01 ETH");
          expect(project.contribute({value: ethers.utils.parseEther("0")})).to.be.revertedWith("Contribution must be larger than 0.01 ETH");
        });

        it("Accepts contributions of exactly 0.01 ETH", async () => {
          const CONTRIBUTION: BigNumber = ethers.utils.parseEther("0.01");
          await expect(project.contribute({value: CONTRIBUTION})).to.not.be.reverted;
          expect(await project.amountOwing(deployer.address)).to.equal(CONTRIBUTION);
        });
      });

      describe("Final Contributions", () => {
        it("Allows the final contribution to exceed the project funding goal", async () => {
          await project.contribute({value: ethers.utils.parseEther("9")});
          expect(await project.totalContribution()).to.equal(ethers.utils.parseEther("9"));
          expect(await project.projectState()).to.equal(State.RUNNING);
          await project.contribute({value: ethers.utils.parseEther("9")});          
          expect(await project.projectState()).to.equal(State.SUCCESSFUL);
          expect(await project.totalContribution()).to.equal(ethers.utils.parseEther("18"));
          expect(await project.amountOwing(await project.owner())).to.equal(ethers.utils.parseEther("18"));
        });

        it("Prevents additional contributions after a project is fully funded", async () => {
          expect(await project.projectState()).to.equal(State.RUNNING);
          await project.contribute({value: ethers.utils.parseEther(CROWDFUND_LIMIT)});
          expect(await project.totalContribution()).to.equal(ethers.utils.parseEther(CROWDFUND_LIMIT));
          expect(await project.projectState()).to.equal(State.SUCCESSFUL);
          expect(project.contribute({value: ethers.utils.parseEther("1")})).to.be.revertedWith("Project must be in the running state");          
          expect(project.contribute({value: ethers.utils.parseEther("0.1")})).to.be.revertedWith("Project must be in the running state");          
        });

        it("Prevents additional contributions after 30 days have passed since Project instance deployment", async () => {
          expect(await project.projectState()).to.equal(State.RUNNING);
          await project.contribute({value: ethers.utils.parseEther("5")});
          timeTravel(24 * 30 * 3600 + 10000);
          expect(project.contribute({value: ethers.utils.parseEther("5")})).to.be.revertedWith("Crowdfunding is past deadline of 30 days");
        });
      });
    });

    describe("Withdrawals", () => {
      describe("Project Status: Active", () => {
        it("Prevents the creator from withdrawing any funds", async () => {
          await project.contribute({value: ethers.utils.parseEther("5")});
          expect(await project.projectState()).to.equal(State.RUNNING);
          expect(project.withdrawCreator(ethers.utils.parseEther("4"))).to.be.revertedWith("Project must be in the successful state");
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          await project.contribute({value: ethers.utils.parseEther("5")});          
          expect(await project.amountOwing(deployer.address)).to.equal(ethers.utils.parseEther("5"));
          expect(await project.projectState()).to.equal(State.RUNNING);
          expect(project.withdraw()).to.be.revertedWith("Project must be in the failed state");
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          await project.contribute({value: ethers.utils.parseEther("5")});
          await project.cancelCrowdfund();
          expect(await project.projectState()).to.equal(State.FAILED);
          expect(project.connect(alice).withdraw()).to.be.revertedWith("Amount owed to sender must be greater than zero");
        });
      });

      describe("Project Status: Success", () => {
        it("Allows the creator to withdraw some of the contribution balance", async () => {
          await project.connect(alice).contribute({value: ethers.utils.parseEther("5")});
          await project.connect(bob).contribute({value: ethers.utils.parseEther("5.5")});
          expect(await project.projectState()).to.equal(State.SUCCESSFUL);
          expect(await project.totalContribution()).to.equal(ethers.utils.parseEther("10.5"));
          await project.allocateFunds();
          await project.withdrawCreator(ethers.utils.parseEther("5"));
          expect(await project.amountOwing(deployer.address)).to.equal(ethers.utils.parseEther("5.5"));        
        });

        it("Allows the creator to withdraw the entire contribution balance", async () => {
          await project.connect(alice).contribute({value: ethers.utils.parseEther("5")});
          await project.connect(bob).contribute({value: ethers.utils.parseEther("5.5")});
          expect(await project.projectState()).to.equal(State.SUCCESSFUL);
          expect(await project.totalContribution()).to.equal(ethers.utils.parseEther("10.5"));
          await project.allocateFunds();
          expect(await project.amountOwing(deployer.address)).to.equal(ethers.utils.parseEther("10.5"));
          await project.withdrawCreator(ethers.utils.parseEther("10.5"));
          expect(await project.amountOwing(deployer.address)).to.equal(BigNumber.from(0));
        });

        it("Allows the creator to make multiple withdrawals", async () => {
          await project.connect(alice).contribute({value: ethers.utils.parseEther("5")});
          await project.connect(bob).contribute({value: ethers.utils.parseEther("5.5")});
          expect(await project.projectState()).to.equal(State.SUCCESSFUL);
          expect(await project.totalContribution()).to.equal(ethers.utils.parseEther("10.5"));
          await project.allocateFunds();
          expect(await project.amountOwing(deployer.address)).to.equal(ethers.utils.parseEther("10.5"));
          await project.withdrawCreator(ethers.utils.parseEther("5"));
          // expect(await deployer.getBalance()).to.equal("10004984681428490017188");
          expect(await project.amountOwing(deployer.address)).to.equal(ethers.utils.parseEther("5.5"));
          await project.withdrawCreator(ethers.utils.parseEther("3"));
          // expect(await deployer.getBalance()).to.equal("10007977653674290812129");
          expect(await project.amountOwing(deployer.address)).to.equal(ethers.utils.parseEther("2.5"));
        });

        it("Prevents the creator from withdrawing more than the contribution balance", async () => {
          await project.connect(alice).contribute({value: ethers.utils.parseEther("5")});
          await project.connect(bob).contribute({value: ethers.utils.parseEther("5.5")});
          expect(await project.projectState()).to.equal(State.SUCCESSFUL);
          expect(await project.totalContribution()).to.equal(ethers.utils.parseEther("10.5"));
          await project.allocateFunds();
          expect(await project.amountOwing(deployer.address)).to.equal(ethers.utils.parseEther("10.5"));
          expect(project.withdrawCreator(ethers.utils.parseEther("10.6"))).to.be.revertedWith("Amount withdrawn must less than or equal to amount owed");
        });

        it('Emits a "WithdrawCreatorEvent" event after a withdrawal is made by the creator', async () => {
          await project.connect(alice).contribute({value: ethers.utils.parseEther("4")});
          await project.connect(bob).contribute({value: ethers.utils.parseEther("6.2")});
          expect(await project.projectState()).to.equal(State.SUCCESSFUL);     
          await project.allocateFunds();     
          const txReceiptUnresolved: ContractTransaction = await project.withdrawCreator(ethers.utils.parseEther("10.2"));
          const txReceipt: ContractReceipt = await txReceiptUnresolved.wait();
          const eventName: string = txReceipt.events![0].event!;
          const eventArguments: any = txReceipt.events![0].args!;
          const eventSender: string = eventArguments[0];
          const eventAmountWithdrawn: BigNumber = eventArguments[1];
          const eventTotalContribution: BigNumber = eventArguments[2];
          expect(eventName).to.equal("WithdrawCreatorEvent");
          expect(eventSender).to.equal(deployer.address);
          expect(eventAmountWithdrawn).to.equal(ethers.utils.parseEther("10.2"));
          expect(eventTotalContribution).to.equal(BigNumber.from(0));          
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          await project.connect(alice).contribute({value: ethers.utils.parseEther("3")});
          await project.connect(bob).contribute({value: ethers.utils.parseEther("2.4")});          
          expect(project.connect(alice).withdraw()).to.be.revertedWith("Project must be in the failed state");
          await project.connect(alice).contribute({value: ethers.utils.parseEther("5")});
          expect(await project.projectState()).to.equal(State.SUCCESSFUL);
          expect(project.connect(alice).withdraw()).to.be.revertedWith("Project must be in the failed state");
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          await project.connect(alice).contribute({value: ethers.utils.parseEther("3.5")});          
          expect(project.connect(bob).withdraw()).to.be.revertedWith("Project must be in the failed state");
          await project.cancelCrowdfund();
          expect(await project.projectState()).to.equal(State.FAILED);
          expect(project.connect(bob).withdraw()).to.be.revertedWith("Amount owed to sender must be greater than zero");
        });
      });

      describe("Project Status: Failure", () => {
        it("Prevents the creator from withdrawing any funds (if not a contributor)", async () => {
          await project.connect(alice).contribute({value: ethers.utils.parseEther("3.5")});    
          await project.connect(bob).contribute({value: ethers.utils.parseEther("4.5")});
          await project.cancelCrowdfund();
          expect(await project.projectState()).to.equal(State.FAILED);
          expect(project.withdrawCreator(ethers.utils.parseEther("9"))).to.be.revertedWith("Project must be in the successful state");
        });

        it("Prevents contributors from withdrawing any funds (though they can still refund)", async () => {
          await project.connect(alice).contribute({value: ethers.utils.parseEther("3.5")});    
          await project.connect(bob).contribute({value: ethers.utils.parseEther("4.5")});
          await project.cancelCrowdfund();
          expect(await project.projectState()).to.equal(State.FAILED);
          expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("3.5"));
          await project.connect(alice).withdraw();
          expect(await project.amountOwing(alice.address)).to.equal(BigNumber.from(0));
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          await project.connect(alice).contribute({value: ethers.utils.parseEther("3.5")});
          await project.cancelCrowdfund();
          expect(await project.projectState()).to.equal(State.FAILED);
          expect(project.connect(bob).withdraw()).to.be.revertedWith("Amount owed to sender must be greater than zero");
        });
      });
    });

    describe("Refunds", () => {
      it("Allows contributors to be refunded when a project fails", async () => {
        await project.connect(alice).contribute({value: ethers.utils.parseEther("3.5")});    
        await project.connect(bob).contribute({value: ethers.utils.parseEther("4.5")});
        await project.cancelCrowdfund();
        expect(await project.projectState()).to.equal(State.FAILED);
        expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("3.5"));
        expect(await project.amountOwing(bob.address)).to.equal(ethers.utils.parseEther("4.5"));
        expect(await project.totalContribution()).to.equal(ethers.utils.parseEther("8"));
        await project.connect(alice).withdraw();
        await project.connect(bob).withdraw();
        expect(await project.amountOwing(alice.address)).to.equal(BigNumber.from(0));
        expect(await project.amountOwing(bob.address)).to.equal(BigNumber.from(0));
        expect(await project.totalContribution()).to.equal(BigNumber.from(0));
      });

      it("Prevents contributors from being refunded if a project has not failed", async () => {
        await project.connect(alice).contribute({value: ethers.utils.parseEther("3.5")});    
        await project.connect(bob).contribute({value: ethers.utils.parseEther("4.5")});
        expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("3.5"));
        expect(await project.amountOwing(bob.address)).to.equal(ethers.utils.parseEther("4.5"));
        expect(await project.totalContribution()).to.equal(ethers.utils.parseEther("8"));
        expect(project.connect(alice).withdraw()).to.be.revertedWith("Project must be in the failed state");
        expect(project.connect(bob).withdraw()).to.be.revertedWith("Project must be in the failed state");
      });

      it('Emits a "WithdrawEvent" event after a a contributor receives a refund', async () => {
        await project.connect(alice).contribute({value: ethers.utils.parseEther("3.5")});    
        await project.connect(bob).contribute({value: ethers.utils.parseEther("4.5")});
        await project.cancelCrowdfund();
        expect(await project.projectState()).to.equal(State.FAILED);
        const txReceiptUnresolved = await project.connect(alice).withdraw();
        const txReceipt = await txReceiptUnresolved.wait();
        const eventName = txReceipt.events![0].event!;
        expect(eventName).to.equal("WithdrawEvent");
        // TODO: Check event fields
      });
    });

    describe("Cancelations (creator-triggered project failures)", () => {
      it("Allows the creator to cancel the project if < 30 days since deployment has passed ", async () => {
        await project.connect(alice).contribute({value: ethers.utils.parseEther("3.5")});    
        await project.connect(bob).contribute({value: ethers.utils.parseEther("2.5")});        
        timeTravel(3600 * 24);
        expect(await project.projectState()).to.equal(State.RUNNING);
        expect(deployer.address).to.equal(await project.owner());
        expect(project.cancelCrowdfund()).to.not.be.reverted;
        expect(await project.projectState()).to.equal(State.FAILED);
      });

      it("Prevents the creator from canceling the project if at least 30 days have passed", async () => {
        await project.connect(alice).contribute({value: ethers.utils.parseEther("3.5")});    
        await project.connect(bob).contribute({value: ethers.utils.parseEther("2.5")});                
        expect(await project.projectState()).to.equal(State.RUNNING);
        expect(deployer.address).to.equal(await project.owner());
        timeTravel(3600 * 24 * 30 + 10000);
        expect(project.cancelCrowdfund()).to.be.revertedWith("Crowdfunding is past deadline of 30 days");
      });

      it('Emits a "CancelCrowdFundEvent" event after a project is cancelled by the creator', async () => {        
        await project.connect(alice).contribute({value: ethers.utils.parseEther("3.5")});    
        await project.connect(bob).contribute({value: ethers.utils.parseEther("2.5")});        
        timeTravel(3600 * 24);
        expect(await project.projectState()).to.equal(State.RUNNING);
        expect(deployer.address).to.equal(await project.owner());
        const txReceiptUnresolved = await project.cancelCrowdfund();
        const txReceipt = await txReceiptUnresolved.wait();
        const eventName = txReceipt.events![0].event!;
        // TODO: Check event fields
        expect(eventName).to.equal("CancelCrowdfundEvent");
        expect(await project.projectState()).to.equal(State.FAILED);
      });
    });

    describe("NFT Contributor Badges", () => {
      it("Awards a contributor with a badge when they make a single contribution of at least 1 ETH", async () => {
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(0));
        project.connect(alice).contribute({value: ethers.utils.parseEther("1")});
        expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("1"));
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(1));      
      });

      it("Awards a contributor with a badge when they make multiple contributions to a single project that sum to at least 1 ETH", async () => {
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(0));
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.2")});
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.5")});
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.3")});
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(1));
        expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("1"));
      });

      it("Does not award a contributor with a badge if their total contribution to a single project sums to < 1 ETH", async () => {        
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.2")});
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(0));
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.5")});
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(0));
        expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("0.7"));
      });

      it("Awards a contributor with a second badge when their total contribution to a single project sums to at least 2 ETH", async () => {
        // Note: One address can receive multiple badges for a single project,
        //       but they should only receive 1 badge per 1 ETH contributed.
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(0));
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.2")});
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.5")});
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.3")});
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(1));
        expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("1"));
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.5")});
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.5")});
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(2));
        expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("2"));
      });

      it("Does not award a contributor with a second badge if their total contribution to a single project is > 1 ETH but < 2 ETH", async () => {
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(0));
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.2")});
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.5")});
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.3")});
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(1));
        expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("1"));
        project.connect(alice).contribute({value: ethers.utils.parseEther("0.5")});
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(1));
        expect(await project.amountOwing(alice.address)).to.equal(ethers.utils.parseEther("1.5"));
      });

      it("Awards contributors with different NFTs for contributions to different projects", async () => {
        const txReceiptUnresolvedTwo: ContractTransaction = await projectFactory.create(
          ethers.utils.parseEther(CROWDFUND_LIMIT)
        );
        const txReceiptTwo: ContractReceipt = await txReceiptUnresolvedTwo.wait();
        const projectAddressTwo = txReceiptTwo.events![0].args![1];
        const projectTwo = await ethers.getContractAt("Project", projectAddressTwo);

        project.connect(alice).contribute({value: ethers.utils.parseEther("1")});
        projectTwo.connect(bob).contribute({value: ethers.utils.parseEther("1")});
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(1));
        expect(await projectTwo.balanceOf(bob.address)).to.equal(BigNumber.from(1));
        expect(project.address !== projectTwo.address).to.equal(true);
      });

      it("Allows contributor badge holders to trade the NFT to another address", async () => {
        project.connect(alice).contribute({value: ethers.utils.parseEther("1")});
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(1));
        expect(await project.ownerOf(BigNumber.from(1))).to.equal(alice.address);
        await project.connect(alice).transferFrom(alice.address, bob.address, 1);
        expect(await project.ownerOf(BigNumber.from(1))).to.equal(bob.address);
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(0));
        expect(await project.balanceOf(bob.address)).to.equal(BigNumber.from(1));
      });

      it("Allows contributor badge holders to trade the NFT to another address even after its related project fails", async () => {
        project.connect(alice).contribute({value: ethers.utils.parseEther("1")});
        project.connect(bob).contribute({value: ethers.utils.parseEther("1")});
        expect(await project.balanceOf(alice.address)).to.equal(BigNumber.from(1));
        expect(await project.balanceOf(bob.address)).to.equal(BigNumber.from(1));
        expect(await project.ownerOf(BigNumber.from(1))).to.equal(alice.address);
        expect(await project.ownerOf(BigNumber.from(2))).to.equal(bob.address);
        project.cancelCrowdfund();
        expect(await project.projectState()).to.equal(State.FAILED);
        await project.connect(alice).transferFrom(alice.address, bob.address, 1);
        expect(await project.ownerOf(BigNumber.from(1))).to.equal(bob.address);
      });
    });
  });
});
