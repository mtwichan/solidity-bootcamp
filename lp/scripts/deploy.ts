import { ethers } from "hardhat";
import { ICO, LPPair, LPRouter, SpaceCoinToken } from "../typechain";

async function main() {
  let ICO: ICO;
  let spaceCoinToken: SpaceCoinToken;
  let lpPair: LPPair;
  let lpRouter: LPRouter;

  const deployer = "0xE8F6EcAa58DCd56013C1013Fd167Edf4dB3e5C96";
  const deployerSigner = await ethers.getSigner(deployer);  
  const SpaceCoinToken = await ethers.getContractFactory("SpaceCoinToken");
  spaceCoinToken = (await SpaceCoinToken.deploy(deployer)) as SpaceCoinToken;
  await spaceCoinToken.deployed();
  
  const LPPair = await ethers.getContractFactory("LPPair");
  lpPair = (await LPPair.deploy(spaceCoinToken.address)) as LPPair;
  await lpPair.deployed();

  ICO = await ethers.getContractAt("ICO", await spaceCoinToken.ICOContract());
  lpRouter = await ethers.getContractAt("LPRouter", await lpPair.lpRouterContract());
  
  const txIco1 = await ICO.connect(deployerSigner).setNextState();
  await txIco1.wait();
  const txIco2 = await ICO.connect(deployerSigner).setNextState();
  await txIco2.wait();

  const txSpc = await spaceCoinToken.connect(deployerSigner).approve(lpRouter.address, ethers.utils.parseEther("1"));
  await txSpc.wait();
  const txLp = await lpRouter.connect(deployerSigner).addLiquidity(ethers.utils.parseEther("0.001"), ethers.utils.parseEther("0.005"), {value: ethers.utils.parseEther("0.001")});
  await txLp.wait();

  console.log("SpaceCoinToken deployed to:", spaceCoinToken.address);
  console.log("LPPair deployed to:", lpPair.address);
  console.log("LPRouter deployed to:", lpRouter.address);
  console.log("ICO deployed to:", ICO.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
