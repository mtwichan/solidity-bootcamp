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
      await ICO.connect(alice).contribute({value: ethers.utils.parseEther("5000")});
      await ICO.connect(bob).contribute({value: ethers.utils.parseEther("5000")});
      await ICO.setNextState();
      await ICO.withdraw(lpPair.address);
      expect(await lpPair.totalETH()).to.equal(ethers.utils.parseEther("10000"));      
      expect(await spaceCoinToken.balanceOf(lpPair.address)).to.equal(ethers.utils.parseEther("50000"));
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("25000"));
      expect(await spaceCoinToken.balanceOf(bob.address)).to.equal(ethers.utils.parseEther("25000"));
    });

    it("Can add liquidity initially", async () => {
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("25000"));
      await spaceCoinToken.connect(alice).approve(lpRouter.address, ethers.utils.parseEther("5"));
      expect(await lpPair.totalSupply()).to.equal(0);      
      await lpRouter.connect(alice).addLiquidity(ethers.utils.parseEther("5"), ethers.utils.parseEther("5"), {value: ethers.utils.parseEther("5")});          
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("24995"));      
      expect(await lpPair.balanceOf('0x0000000000000000000000000000000000000001')).to.equal(1000);
      expect(await lpPair.balanceOf(alice.address)).to.equal(BigNumber.from("22367387531850920205607"));
    });

    it("Can add liquidity after", async () => {
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("25000"));
      await spaceCoinToken.connect(alice).approve(lpRouter.address, ethers.utils.parseEther("5"));
      expect(await lpPair.totalSupply()).to.equal(0);
      await lpRouter.connect(alice).addLiquidity(ethers.utils.parseEther("5"), ethers.utils.parseEther("5"), {value: ethers.utils.parseEther("5")});          
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("24995"));      
      expect(await lpPair.balanceOf('0x0000000000000000000000000000000000000001')).to.equal(1000);
      expect(await lpPair.balanceOf(alice.address)).to.equal(BigNumber.from("22367387531850920205607"));

      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("5"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("5"), ethers.utils.parseEther("5"), {value: ethers.utils.parseEther("5")});
      
    });

    it("Can remove liquidity", async () => {
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("25000"));
      await spaceCoinToken.connect(alice).approve(lpRouter.address, ethers.utils.parseEther("5"));
      expect(await lpPair.totalSupply()).to.equal(0);
      await lpRouter.connect(alice).addLiquidity(ethers.utils.parseEther("5"), ethers.utils.parseEther("5"), {value: ethers.utils.parseEther("5")});          
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("24995"));      
      expect(await lpPair.balanceOf('0x0000000000000000000000000000000000000001')).to.equal(1000);
      expect(await lpPair.balanceOf(alice.address)).to.equal(BigNumber.from("22367387531850920205607"));
      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("5"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("5"), ethers.utils.parseEther("5"), {value: ethers.utils.parseEther("5")});
      expect(await spaceCoinToken.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("24995"));      
      
      await lpPair.connect(bob).approve(lpRouter.address, BigNumber.from("2236515101674924528"));
      await lpRouter.connect(bob).removeLiquidity(BigNumber.from("2236515101674924528"));
      expect(await lpPair.balanceOf(bob.address)).to.equal(0);
      expect((await spaceCoinToken.balanceOf(bob.address)).gte(ethers.utils.parseEther("24995"))).to.equal(true);
    });


    it("Can perform a swap for ETH", async () => {
      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("10"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("10"), ethers.utils.parseEther("10"), {value: ethers.utils.parseEther("10")});          

      const prevBalance = await alice.getBalance();
      await spaceCoinToken.connect(alice).approve(lpRouter.address, ethers.utils.parseEther("100"));
      await lpRouter.connect(alice).swapTokens(0, ethers.utils.parseEther("100"), 0, 0);
      expect((await alice.getBalance()).gte(prevBalance)).to.be.equal(true);
    });

    it("Can perform a swap for SpaceCoinToken", async () => {
      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("10"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("10"), ethers.utils.parseEther("10"), {value: ethers.utils.parseEther("10")});          
      const prevBalance = await spaceCoinToken.balanceOf(alice.address);
      expect((await spaceCoinToken.balanceOf(alice.address)).gte(prevBalance)).to.be.equal(true);
    });

    it("Can perform a swap for SpaceCoinToken and ETH", async () => {
      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("200"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("10"), ethers.utils.parseEther("200"), {value: ethers.utils.parseEther("10")});          
      const prevBalanceETH = await alice.getBalance();
      const prevBalanceSPC = await spaceCoinToken.balanceOf(alice.address);
      await spaceCoinToken.connect(alice).approve(lpRouter.address, ethers.utils.parseEther("100"));
      await lpRouter.connect(alice).swapTokens(ethers.utils.parseEther("100"), ethers.utils.parseEther("100"), 0, 0, {value: ethers.utils.parseEther("100")});
      expect((await alice.getBalance()).lte(prevBalanceETH)).to.be.equal(true);
      expect((await spaceCoinToken.balanceOf(alice.address)).gte(prevBalanceSPC)).to.be.equal(true);
    });

    it("Can prevent swaping tokens if slippage conditions not met ETH", async () => {
      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("10"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("10"), ethers.utils.parseEther("10"), {value: ethers.utils.parseEther("10")});          
      await spaceCoinToken.connect(alice).approve(lpRouter.address, ethers.utils.parseEther("100"));
      expect((lpRouter.connect(alice).swapTokens(0, ethers.utils.parseEther("100"), ethers.utils.parseEther("100"), 0))).to.be.revertedWith('LPRouter: Slippage threshhold reached');
    });

    it("Can prevent swaping tokens if slippage conditions not met SPC", async () => {
      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("10"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("10"), ethers.utils.parseEther("10"), {value: ethers.utils.parseEther("10")});          
      expect(lpRouter.connect(alice).swapTokens(ethers.utils.parseEther("5"), 0,0, ethers.utils.parseEther("100"), {value: ethers.utils.parseEther("5")})).to.be.revertedWith('LPRouter: Slippage threshhold reached'); 
    });

    it("Can predict swap amount ETH with fee", async () => {
      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("10"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("10"), ethers.utils.parseEther("10"), {value: ethers.utils.parseEther("10")});
      const reserveETH = await lpPair.reserveETH();
      const reserveSpaceCoinToken = await lpPair.reserveSpaceCoinToken();
      const result = await lpRouter.getSwapAmount(reserveETH, reserveSpaceCoinToken, ethers.utils.parseEther("10"), 0, true)
      expect(result).to.be.equal(BigNumber.from("49411570973762213196"));
    });
    
    it("Can predict swap amount SpaceCoinToken with fee", async () => {
      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("10"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("10"), ethers.utils.parseEther("10"), {value: ethers.utils.parseEther("10")});
      const reserveETH = await lpPair.reserveETH();
      const reserveSpaceCoinToken = await lpPair.reserveSpaceCoinToken();
      const result = await lpRouter.getSwapAmount(reserveETH, reserveSpaceCoinToken, 0, ethers.utils.parseEther("10"), true)
      expect(result).to.be.equal(BigNumber.from("1981191485788656115"));
    });

    it("Can predict swap amount ETH without fee", async () => {
      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("10"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("10"), ethers.utils.parseEther("10"), {value: ethers.utils.parseEther("10")});
      const reserveETH = await lpPair.reserveETH();
      const reserveSpaceCoinToken = await lpPair.reserveSpaceCoinToken();
      const result = await lpRouter.getSwapAmount(reserveETH, reserveSpaceCoinToken, ethers.utils.parseEther("10"), 0, false)
      expect(result).to.be.equal(BigNumber.from("49910179640718562875"));
    });
    
    it("Can predict swap amount SpaceCoinToken without fee", async () => {
      await spaceCoinToken.connect(bob).approve(lpRouter.address, ethers.utils.parseEther("10"));
      await lpRouter.connect(bob).addLiquidity(ethers.utils.parseEther("10"), ethers.utils.parseEther("10"), {value: ethers.utils.parseEther("10")});
      const reserveETH = await lpPair.reserveETH();
      const reserveSpaceCoinToken = await lpPair.reserveSpaceCoinToken();
      const result = await lpRouter.getSwapAmount(reserveETH, reserveSpaceCoinToken, 0, ethers.utils.parseEther("10"), false)
      expect(result).to.be.equal(BigNumber.from("2001199520191923231"));
    });
  });
});
