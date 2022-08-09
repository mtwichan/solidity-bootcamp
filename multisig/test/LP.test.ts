import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { ethers } from "hardhat";
import { ICO, LPPair, LPRouter, SpaceCoinToken } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("LP", function () {
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let treasury: SignerWithAddress;
  let ICO: ICO;
  let spaceCoinToken: SpaceCoinToken;
  let lpPair: LPPair;
  let lpRouter: LPRouter;

  beforeEach("Deploy", async () => {
    [deployer, alice, bob, treasury] = await ethers.getSigners();
    const SpaceCoinToken = await ethers.getContractFactory("SpaceCoinToken");
    spaceCoinToken = (await SpaceCoinToken.deploy(treasury.address)) as SpaceCoinToken;
    await spaceCoinToken.deployed();
    
    const LPPair = await ethers.getContractFactory("LPPair");
    lpPair = (await LPPair.deploy(spaceCoinToken.address)) as LPPair;
    await lpPair.deployed();

    ICO = await ethers.getContractAt("ICO", await spaceCoinToken.ICOContract());
    lpRouter = await ethers.getContractAt("LPRouter", await lpPair.lpRouterContract());
  });

  describe("SpaceCoinToken", async () => {
    // Note: Have already tested this contract throughly in previous project
  });
  
  describe("ICO", async () => {
    enum State {SEED, GENERAL, OPEN, CLOSED};
    
    // Note: Have already tested this contract throughly in previous project
    // so not worrying about those tests here
    it("Can withdraw raised funds to LP", async () => {
      await ICO.setNextState();
      await ICO.setNextState();
      expect(await ICO.state()).to.equal(State.OPEN);
      await ICO.connect(alice).contribute({value: ethers.utils.parseEther("1000")});
      await ICO.connect(bob).contribute({value: ethers.utils.parseEther("1500")});
      await ICO.setNextState();
      expect(await ICO.state()).to.equal(State.CLOSED);
      await ICO.withdraw(lpPair.address);
      expect(await lpPair.totalETH()).to.equal(ethers.utils.parseEther("2500"));
      expect(await spaceCoinToken.balanceOf(lpPair.address)).to.equal(ethers.utils.parseEther("12500"));
    });

    it("Can withdraw max raised funds to LP", async () => {
      await ICO.setNextState();
      await ICO.setNextState();
      expect(await ICO.state()).to.equal(State.OPEN);
      await ICO.connect(alice).contribute({value: ethers.utils.parseEther("10000")});
      await ICO.connect(bob).contribute({value: ethers.utils.parseEther("20000")});
      expect(await ICO.state()).to.equal(State.CLOSED);
      await ICO.withdraw(lpPair.address);
      expect(await lpPair.totalETH()).to.equal(ethers.utils.parseEther("30000"));
      expect(await spaceCoinToken.balanceOf(lpPair.address)).to.equal(ethers.utils.parseEther("150000"));
    });

    it("Can only withdraw in closed state", async () => {
      await ICO.setNextState();
      await ICO.connect(alice).contribute({value: ethers.utils.parseEther("1000")});
      expect(ICO.withdraw(lpPair.address)).to.revertedWith("ICO: Contract must be in the CLOSED state"); 
      await ICO.setNextState();
      await ICO.connect(bob).contribute({value: ethers.utils.parseEther("1000")});
      expect(ICO.withdraw(lpPair.address)).to.revertedWith("ICO: Contract must be in the CLOSED state"); 
      expect(await ICO.state()).to.equal(State.OPEN);
      await ICO.connect(alice).contribute({value: ethers.utils.parseEther("9000")});
      await ICO.connect(bob).contribute({value: ethers.utils.parseEther("9000")});
      await ICO.setNextState();
      expect(await ICO.state()).to.equal(State.CLOSED);
      await ICO.withdraw(lpPair.address);
      expect(await lpPair.totalETH()).to.equal(ethers.utils.parseEther("20000"));
      expect(await spaceCoinToken.balanceOf(lpPair.address)).to.equal(ethers.utils.parseEther("100000"));
    });

    it("Can only withdraw from contract owner", async () => {
      await ICO.setNextState();
      await ICO.connect(alice).contribute({value: ethers.utils.parseEther("1000")});
      expect(ICO.connect(alice).withdraw(lpPair.address)).to.revertedWith("ICO: Caller must be contract owner"); 
      await ICO.setNextState();
      await ICO.connect(bob).contribute({value: ethers.utils.parseEther("1000")});
      expect(ICO.connect(alice).withdraw(lpPair.address)).to.revertedWith("ICO: Caller must be contract owner"); 
      expect(await ICO.state()).to.equal(State.OPEN);
      await ICO.connect(alice).contribute({value: ethers.utils.parseEther("9000")});
      await ICO.connect(bob).contribute({value: ethers.utils.parseEther("9000")});
      await ICO.setNextState();
      expect(await ICO.state()).to.equal(State.CLOSED);
      await ICO.withdraw(lpPair.address);
      expect(await lpPair.totalETH()).to.equal(ethers.utils.parseEther("20000"));
      expect(await spaceCoinToken.balanceOf(lpPair.address)).to.equal(ethers.utils.parseEther("100000"));
    });
  });

  describe("Liquidity Pool", async () => {
    beforeEach("Populate LPPair with Funds", async () => {
      await ICO.setNextState();
      await ICO.setNextState();
      await ICO.connect(alice).contribute({value: ethers.utils.parseEther("8000")});
      await ICO.connect(bob).contribute({value: ethers.utils.parseEther("7000")});
      await ICO.setNextState();
      await ICO.withdraw(lpPair.address);
      expect(await lpPair.totalETH()).to.equal(ethers.utils.parseEther("15000"));      
      expect(await spaceCoinToken.balanceOf(lpPair.address)).to.equal(ethers.utils.parseEther("75000"));
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("40000"));
      expect(await spaceCoinToken.balanceOf(bob.address)).to.equal(ethers.utils.parseEther("35000"));
    });

    it("Can only allow functions to be called if called from LP Router", async () => {});
    it("Cannot burn LP tokens if the supply is zero", async () => {});
    it("Can add liquidity initially", async () => {
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("40000"));
      await spaceCoinToken.connect(alice).approve(lpRouter.address, ethers.utils.parseEther("5"));
      expect(await lpPair.totalSupply()).to.equal(0);      
      await lpRouter.connect(alice).addLiquidity(ethers.utils.parseEther("5"), ethers.utils.parseEther("5"), {value: ethers.utils.parseEther("5")});          
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("39995"));      
      expect(await lpPair.balanceOf('0x0000000000000000000000000000000000000001')).to.equal(1000);
      expect(await lpPair.balanceOf(alice.address)).to.equal(BigNumber.from("33547727568346563046061"));
    });

    it("Can add liquidity after", async () => {
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("40000"));
      await spaceCoinToken.connect(alice).approve(lpRouter.address, ethers.utils.parseEther("5"));
      expect(await lpPair.totalSupply()).to.equal(0);      
      await lpRouter.connect(alice).addLiquidity(ethers.utils.parseEther("5"), ethers.utils.parseEther("5"), {value: ethers.utils.parseEther("5")});          
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("39995"));      
      expect(await lpPair.balanceOf('0x0000000000000000000000000000000000000001')).to.equal(1000);
      expect(await lpPair.balanceOf(alice.address)).to.equal(BigNumber.from("33547727568346563046061"));

      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("5"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("5"), ethers.utils.parseEther("5"), {value: ethers.utils.parseEther("5")});
      // to be continued
    });

    it("Cannot add liquidity if has no liquidity", async () => {});
    it("Can failing add liquidity if msg.value and _amountETH do not match", async () => {});
    it.only("Can remove liquidity", async () => {
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("40000"));
      await spaceCoinToken.connect(alice).approve(lpRouter.address, ethers.utils.parseEther("5"));
      expect(await lpPair.totalSupply()).to.equal(0);      
      await lpRouter.connect(alice).addLiquidity(ethers.utils.parseEther("5"), ethers.utils.parseEther("5"), {value: ethers.utils.parseEther("5")});          
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("39995"));      
      expect(await lpPair.balanceOf('0x0000000000000000000000000000000000000001')).to.equal(1000);
      expect(await lpPair.balanceOf(alice.address)).to.equal(BigNumber.from("33547727568346563046061"));
      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("5"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("5"), ethers.utils.parseEther("5"), {value: ethers.utils.parseEther("5")});
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("39995"));      
      
      await lpPair.connect(bob).approve(lpRouter.address, BigNumber.from("2236366080151094130"));
      await lpRouter.connect(bob).removeLiquidity(BigNumber.from("2236366080151094130"));
      expect(await lpPair.balanceOf(bob.address)).to.equal(0);
      expect((await spaceCoinToken.balanceOf(bob.address)).gte(ethers.utils.parseEther("34995"))).to.equal(true);
      // Might be a good idea to pass in the burn amount via function parameters instead b/c IDK
      // if someone can just transfer LP tokens to the contract in which case it might fux with some stuff
    });
    
    it("Can perform a swap for ETH", async () => {});
    it("Can perform a swap for SpaceCoinToken", async () => {});
    it("Can perform a swap for SpaceCoinToken and ETH", async () => {});    
    it("Cannot remove liquidity if has no liquidity", async () => {});
    it("Can prevent swaping tokens if slippage conditons not met", async () => {});
    it("Can predict swap amount ETH ", async () => {});
    it("Can predict swap amount SpaceCoinToken ", async () => {});
  });
});
