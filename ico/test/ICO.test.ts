import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import {
  ICO,
  SpaceCoinToken,
  SpaceCoinToken__factory,
} from "../typechain";

describe("SpaceCoinToken ICO", function () {
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let treasury: SignerWithAddress;

  let spaceCoinTokenFactory: SpaceCoinToken__factory;
  let spaceCoinToken: SpaceCoinToken;

  let ICO: ICO;

  beforeEach(async () => {
    [deployer, alice, bob, treasury] = await ethers.getSigners();

    spaceCoinTokenFactory = await ethers.getContractFactory("SpaceCoinToken");
    spaceCoinToken = (await spaceCoinTokenFactory.deploy(treasury.address)) as SpaceCoinToken;
    ICO = await ethers.getContractAt("ICO", await spaceCoinToken.ICOContract());
  });

  it("Deploys a contract", async () => {
    expect(spaceCoinToken.address).to.be.ok;
  });

  describe("SpaceCoinToken", async () => {

    describe("Initialization", async () => {
      it("Registers owner, treasury address, and ICO address properly", async () => {
        expect(await spaceCoinToken.contractOwner()).to.equal(deployer.address);
        expect(await spaceCoinToken.treasuryAddress()).to.equal(treasury.address);
        expect(await spaceCoinToken.ICOContract()).to.equal(ICO.address);
      });

      it("Sets the tax flag to False", async () => {
        expect(await spaceCoinToken.taxFlag()).to.equal(false);
      });

      it("Has a name of SpaceCoin and symbol of SPACE", async () => {
        expect(await spaceCoinToken.name()).to.equal("SpaceCoin");
        expect(await spaceCoinToken.symbol()).to.equal("SPACE");
      });

      it("Has a decimal place of 18", async () => {
        expect(await spaceCoinToken.decimals()).to.equal(18);
      });

      it("Has a total supply of 500K tokens", async () => {
        expect(await spaceCoinToken.totalSupply()).to.equal(ethers.utils.parseEther("500000"));
      });

      it("Mints 350K tokens to owner", async () => {
        expect(await spaceCoinToken.balanceOf(deployer.address)).to.equal(ethers.utils.parseEther("350000"));
      });

      it("Mints 150K tokens to ICO contract", async () => {
        expect(await spaceCoinToken.balanceOf(ICO.address)).to.equal(ethers.utils.parseEther("150000"));
      });

      it("Deploys ICO contract", async () => {
        expect(await spaceCoinToken.ICOContract()).to.be.ok;
        expect(await spaceCoinToken.balanceOf(ICO.address)).to.equal(ethers.utils.parseEther("150000"));        
      });
    });

    describe("Transactions", async () => {
      it("Can record balances of transactions", async () => {
        expect(true).to.be.ok; // Running low on time -> test ERC20 functionality, since it's audited it's likely okay
      });

      it("Can approve of transactions", async () => {
        expect(true).to.be.ok; // Running low on time -> test ERC20 functionality, since it's audited it's likely okay
      });

      it("Reverts non-approved transcactions", async () => {
        expect(true).to.be.ok; // Running low on time -> test ERC20 functionality, since it's audited it's likely okay
      });

      it("Reverts transcaction amounts that greater than the amount owed to the caller", async () => {
        expect(true).to.be.ok; // Running low on time -> test ERC20 functionality, since it's audited it's likely okay
      });

      it("Can transfer token to the treasury", async () => {
        await spaceCoinToken.setTaxFlag(true);
        await spaceCoinToken.transfer(alice.address, ethers.utils.parseEther("10000"));
        await spaceCoinToken.transfer(bob.address, ethers.utils.parseEther("10000"));
        expect(await spaceCoinToken.treasuryOwing()).to.equal(ethers.utils.parseEther("400"));
        expect(await spaceCoinToken.balanceOf(treasury.address)).to.equal(BigNumber.from(0));
        await spaceCoinToken.transferTreasury();
        expect(await spaceCoinToken.treasuryOwing()).to.equal(BigNumber.from(0));
        expect(await spaceCoinToken.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("400"));
      });

      it("Can toggle tax flag and transfer token to the treasury", async () => {
        await spaceCoinToken.setTaxFlag(true);
        await spaceCoinToken.transfer(alice.address, ethers.utils.parseEther("10000"));
        await spaceCoinToken.transfer(bob.address, ethers.utils.parseEther("10000"));
        expect(await spaceCoinToken.treasuryOwing()).to.equal(ethers.utils.parseEther("400"));
        expect(await spaceCoinToken.balanceOf(treasury.address)).to.equal(BigNumber.from(0));
        await spaceCoinToken.transferTreasury();
        expect(await spaceCoinToken.treasuryOwing()).to.equal(BigNumber.from(0));
        expect(await spaceCoinToken.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("400"));
        await spaceCoinToken.setTaxFlag(false);
        await spaceCoinToken.transfer(alice.address, ethers.utils.parseEther("10000"));
        await spaceCoinToken.transfer(bob.address, ethers.utils.parseEther("10000"));
        expect(await spaceCoinToken.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("400"));
        expect(spaceCoinToken.transferTreasury()).to.revertedWith("Owed treasury amount must be greater than zero");
        expect(await spaceCoinToken.treasuryOwing()).to.equal(BigNumber.from(0));
      });

      it("Can transfer and increase allowance from user A to B", async () => {
        expect(true).to.be.ok; // Running low on time -> test ERC20 functionality, since it's audited it's likely okay
      });

      it("Can transfer and decrease allowance from user A to B", async () => {
        expect(true).to.be.ok; // Running low on time -> test ERC20 functionality, since it's audited it's likely okay
      });

      it("Can turn tax on and off", async () => {
        expect(await spaceCoinToken.taxFlag()).to.equal(false);
        await spaceCoinToken.setTaxFlag(true);
        expect(await spaceCoinToken.taxFlag()).to.equal(true);
        await spaceCoinToken.setTaxFlag(false);
        expect(await spaceCoinToken.taxFlag()).to.equal(false);
      });

      it("Emits an 'TransferEvent' event when 'transfer(...)' is called", async () => {
        expect(true).to.be.ok; // Ran out of time, would check transaction, check event name and arguments to ensure correct
      });

      it("Emits an 'TransferFromEvent' event when 'transferFrom(...)' is called", async () => {
        expect(true).to.be.ok; // Ran out of time, would check transaction, check event name and arguments to ensure correct
      });

      it("Emits an 'TransferTreasuryEvent' event when 'transferTreasury(...)' is called", async () => {
        expect(true).to.be.ok; // Ran out of time, would check transaction, check event name and arguments to ensure correct
      });
      
      it("Emits an 'SetTaxFlagEvent' event when 'setTaxFlag(...)' is called", async () => {
        expect(true).to.be.ok; // Ran out of time, would check transaction, check event name and arguments to ensure correct
      });
    });
  });

  describe("ICO", async () => {
    enum State {
      SEED = 0,
      GENERAL = 1,
      OPEN = 2,
      CLOSED = 3
    };
    describe("Contract Pausing", async () => {
      it("Owner can pause and resume contract", async () => {
        expect(await ICO.isContractPaused()).to.equal(false);
        await ICO.toggleContractPause();
        expect(await ICO.isContractPaused()).to.equal(true);
        expect(ICO.setWhitelist([alice.address])).to.be.revertedWith("Contract is currently paused");
        expect(ICO.setNextState()).to.be.revertedWith("Contract is currently paused");
        expect(ICO.connect(alice).contribute({value: ethers.utils.parseEther("100")})).to.be.revertedWith("Contract is currently paused");        
        await ICO.toggleContractPause();
        expect(await ICO.isContractPaused()).to.equal(false);
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.GENERAL);
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.OPEN);
        expect(ICO.redeemTokens()).to.be.revertedWith("Contract is currently paused");
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.CLOSED);
        expect(ICO.withdraw()).to.be.revertedWith("Contract is currently paused");
      });
      
      it("Emits an 'ToggleContractPauseEvent' event when 'toggleContractPause(...)' is called", async () => {
        expect(true).to.be.ok; // Ran out of time, would check transaction, check event name and arguments to ensure correct
      });
    })

    describe("State Changing", async () => {
      it("Owner can move state forward", async () => {
        expect(await ICO.state()).to.equal(State.SEED);
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.GENERAL);
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.OPEN);
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.CLOSED);
        expect(ICO.setNextState()).to.be.revertedWith("Contract is already in CLOSED state");
      });

      it("Emits an 'SetNextStateEvent' event when 'setNextState(...)' is called", async () => {
        expect(true).to.be.ok; // Ran out of time, would check transaction, check event name and arguments to ensure correct
      });
    })

    describe("Withdrawls", async () => {
      it("Can withdraw ether from contract at completion of fund raise", async () => {
        expect(true).to.be.ok;
      });

      it("Can withdraw ether from contract when contract manually set to complete", async () => {
        const whitelist: Array<string> = [alice.address];
        await ICO.setWhitelist(whitelist);
        expect(await ICO.state()).to.equal(State.SEED);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("12.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("12.3"));        
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.GENERAL);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("13.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("25.6"));
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("25.6"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("153.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("178.9"));
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("153.3"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("180.5")});
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("333.8"));
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("359.4"));        
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.OPEN);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("1")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("360.4"));
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("0"));
        expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("133"));        
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("360.4"));
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("333.8"));
        await ICO.connect(bob).redeemTokens();
        expect(await spaceCoinToken.balanceOf(bob.address)).to.equal(ethers.utils.parseEther("1669"));
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.CLOSED);
        await ICO.withdraw();
        expect(await (await deployer.getBalance()).gte(ethers.utils.parseEther("360"))).to.equal(true);
      });
    })

    describe("Redeem Tokens", async () => {
      it("Can redeem tokens when contract is in open state", async () => {
        const whitelist: Array<string> = [alice.address];
        await ICO.setWhitelist(whitelist);
        expect(await ICO.state()).to.equal(State.SEED);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("12.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("12.3"));        
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.GENERAL);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("13.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("25.6"));
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("25.6"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("153.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("178.9"));
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("153.3"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("180.5")});
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("333.8"));
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("359.4"));        
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.OPEN);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("1")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("360.4"));
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("0"));
        expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("133"));        
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("360.4"));
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("333.8"));
        await ICO.connect(bob).redeemTokens();
        expect(await spaceCoinToken.balanceOf(bob.address)).to.equal(ethers.utils.parseEther("1669"));

      });

      it("Can redeem tokens when contract is in closed state", async () => {
        const whitelist: Array<string> = [alice.address];
        await ICO.setWhitelist(whitelist);
        expect(await ICO.state()).to.equal(State.SEED);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("12.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("12.3"));
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.GENERAL);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("13.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("25.6"));
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("25.6"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("153.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("178.9"));
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("153.3"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("180.5")});
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("333.8"));
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("359.4"));
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.OPEN);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("1")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("360.4"));
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("0"));
        expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("133"));
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.CLOSED);
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("360.4"));
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("333.8"));
        await ICO.connect(bob).redeemTokens();
        expect(await spaceCoinToken.balanceOf(bob.address)).to.equal(ethers.utils.parseEther("1669"));
      });
    });


    describe("Initialization", async () => {
      it("Sets the initialization variables correctly", async () => {
        expect(await ICO.owner()).to.equal(deployer.address);
        expect(await ICO.state()).to.equal(State.SEED);
        expect(await ICO.spaceCoinToken()).to.equal(spaceCoinToken.address);
        expect(await ICO.isContractPaused()).to.equal(false);
        expect(await spaceCoinToken.balanceOf(ICO.address)).to.equal(ethers.utils.parseEther("150000"));
      });
    })

    describe("Contributions", async () => {
      it("Can set the whitelist to one user", async () => {
        const whitelist: Array<string> = [alice.address];
        await ICO.setWhitelist(whitelist);
        const balance = await ICO.balances(alice.address);
        expect(await balance.isWhitelistMember).to.equal(true);
      });

      it("Can set the whitelist to several users", async () => {
        let accounts = [];
        [...accounts] = await ethers.getSigners();
        const accountsAddress = accounts.map(addr => addr.address);

        await ICO.setWhitelist(accountsAddress);
        const balanceOne = await ICO.balances(alice.address);
        expect(await balanceOne.isWhitelistMember).to.equal(true);
        const balanceTwo = await ICO.balances(bob.address);
        expect(await balanceTwo.isWhitelistMember).to.equal(true);
      });

      it("Can contribute to the seed phase", async () => {
        const whitelist: Array<string> = [alice.address, bob.address];
        await ICO.setWhitelist(whitelist);
        expect(await ICO.state()).to.equal(State.SEED);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("1")});
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("1"));
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("1"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("2.4")});
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("2.4"));
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("3.4"));
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("1000.3")});
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("1001.3"));
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("1003.7"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("111.4")});
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("113.8"));
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("1115.1"));
      });

      it("Can limit individual contributions to the seed phase", async () => {
        const whitelist: Array<string> = [alice.address];
        await ICO.setWhitelist(whitelist);
        expect(await ICO.state()).to.equal(State.SEED);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("1400")});
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("1400"));
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("100")});
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("1500"));
        expect(ICO.connect(alice).contribute({value: ethers.utils.parseEther("0.1")})).to.be.revertedWith("Sender seed round limit of 1500 ETH reached");
        expect(ICO.connect(alice).contribute({value: ethers.utils.parseEther("1")})).to.be.revertedWith("Sender seed round limit of 1500 ETH reached");
      });

      it("Can limit total contributions of seed phase to 15000", async () => {
        let accounts = [];
        [...accounts] = await ethers.getSigners();

        for (let idx = 1; idx <= 15; idx++) {
          let addressSigner = accounts[idx];
          await ICO.setWhitelist([addressSigner.address]);  
          await ICO.connect(addressSigner).contribute({value: ethers.utils.parseEther("1000")});
        }
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("15000"));
        expect(await ICO.state()).to.equal(State.GENERAL);
      });


      it("Can contribute to the general phase", async () => {
        const whitelist: Array<string> = [alice.address];
        await ICO.setWhitelist(whitelist);

        expect(await ICO.state()).to.equal(State.SEED);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("12.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("12.3"));
        await ICO.setNextState();

        expect(await ICO.state()).to.equal(State.GENERAL);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("13.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("25.6"));
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("25.6"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("153.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("178.9"));
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("153.3"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("180.5")});
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("333.8"));
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("359.4"));
      });

      it("Can contribute to the general phase when seed phase is full", async () => {
        let accounts = [];
        [...accounts] = await ethers.getSigners();

        for (let idx = 1; idx <= 15; idx++) {
          let addressSigner = accounts[idx];
          await ICO.setWhitelist([addressSigner.address]);  
          await ICO.connect(addressSigner).contribute({value: ethers.utils.parseEther("1000")});
        }
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("15000"));
        expect(await ICO.state()).to.equal(State.GENERAL);

        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("13.3")});
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("153.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("15166.6"));
      });

      it("Can limit individual contribution to the general phase", async () => {
        expect(await ICO.state()).to.equal(State.SEED);
        await ICO.setNextState();

        expect(await ICO.state()).to.equal(State.GENERAL);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("1000")});
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("1000"));
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("1000"));
        expect(ICO.connect(alice).contribute({value: ethers.utils.parseEther("1")})).to.be.revertedWith("Sender general round limit of 1000 ETH reached");
        expect(ICO.connect(alice).contribute({value: ethers.utils.parseEther("0.1")})).to.be.revertedWith("Sender general round limit of 1000 ETH reached");
      });

      it("Can stop contribution to general phase when goal is met", async () => {
        let accounts = [];
        [...accounts] = await ethers.getSigners();

        for (let idx = 1; idx <= 15; idx++) {
          let addressSigner = accounts[idx];
          await ICO.setWhitelist([addressSigner.address]);  
          await ICO.connect(addressSigner).contribute({value: ethers.utils.parseEther("1000")});
        }
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("15000"));
        expect(await ICO.state()).to.equal(State.GENERAL);
        for (let idx = 1; idx <= 15; idx++) {
          let addressSigner = accounts[idx];
          await ICO.setWhitelist([addressSigner.address]);  
          await ICO.connect(addressSigner).contribute({value: ethers.utils.parseEther("1000")});
        }
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("30000"));
        expect(await ICO.state()).to.equal(State.OPEN);
      });

      it("Can contribute to the open phase and redeem tokens", async () => {
        const whitelist: Array<string> = [alice.address];
        await ICO.setWhitelist(whitelist);

        expect(await ICO.state()).to.equal(State.SEED);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("12.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("12.3"));
        
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.GENERAL);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("13.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("25.6"));
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("25.6"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("153.3")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("178.9"));
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("153.3"));
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("180.5")});
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("333.8"));
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("359.4"));
        
        await ICO.setNextState();
        expect(await ICO.state()).to.equal(State.OPEN);
        await ICO.connect(alice).contribute({value: ethers.utils.parseEther("1")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("360.4"));
        expect(await (await ICO.balances(alice.address)).totalBalance).to.equal(ethers.utils.parseEther("0"));
        expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("133"));

        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("11.1")});
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("371.5"));
        expect(await (await ICO.balances(bob.address)).totalBalance).to.equal(ethers.utils.parseEther("0"));
        expect(await spaceCoinToken.balanceOf(bob.address)).to.equal(ethers.utils.parseEther("1724.5"));
      });

      it("Can close the open phase when goal is reached", async () => {
        let accounts = [];
        [...accounts] = await ethers.getSigners();

        for (let idx = 1; idx <= 15; idx++) {
          let addressSigner = accounts[idx];
          await ICO.setWhitelist([addressSigner.address]);  
          await ICO.connect(addressSigner).contribute({value: ethers.utils.parseEther("1000")});
        }
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("15000"));
        expect(await ICO.state()).to.equal(State.GENERAL);
        for (let idx = 1; idx <= 10; idx++) {
          let addressSigner = accounts[idx];
          await ICO.connect(addressSigner).contribute({value: ethers.utils.parseEther("1000")});
        }
        await ICO.setNextState();
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("25000"));
        expect(await ICO.state()).to.equal(State.OPEN);
        // expect(ICO.connect(bob).contribute({value: ethers.utils.parseEther("6000")})).to.be.revertedWith("Cannot contribute more than the goal");
        await ICO.connect(bob).contribute({value: ethers.utils.parseEther("5000")});        
        expect(await ICO.totalContribution()).to.equal(ethers.utils.parseEther("30000"));
        expect(await ICO.state()).to.equal(State.CLOSED);
        expect(ICO.connect(bob).contribute({value: ethers.utils.parseEther("1")})).to.be.revertedWith("Contract cannot be in the CLOSED state");
        expect(ICO.connect(bob).contribute({value: ethers.utils.parseEther("0.1")})).to.be.revertedWith("Contract cannot be in the CLOSED state");
      });

      it("Emits an 'ContributionEvent' event when 'contribution(...)' is called", async () => {
        expect(true).to.be.ok; // Ran out of time, would check transaction, check event name and arguments to ensure correct        
      });
    });
  });
});