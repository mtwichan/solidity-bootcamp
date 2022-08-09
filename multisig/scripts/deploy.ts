import { ethers } from "hardhat";
import { ICO, LPPair, LPRouter, SpaceCoinToken } from "../typechain";

async function main() {
  let ICO: ICO;
  let spaceCoinToken: SpaceCoinToken;
  let lpPair: LPPair;
  let lpRouter: LPRouter;

  const deployer = "0xE8F6EcAa58DCd56013C1013Fd167Edf4dB3e5C96";
  const deployerSigner = await ethers.getSigner(deployer);  
  const multisig = "0xBAe77dC8Ddb6dF14362Cc65116EC601B82721A7d";
  const SpaceCoinToken = await ethers.getContractFactory("SpaceCoinToken");
  spaceCoinToken = (await SpaceCoinToken.deploy(deployer)) as SpaceCoinToken;
  await spaceCoinToken.deployed();
  
  const LPPair = await ethers.getContractFactory("LPPair");
  lpPair = (await LPPair.deploy(spaceCoinToken.address)) as LPPair;
  await lpPair.deployed();

  ICO = await ethers.getContractAt("ICO", await spaceCoinToken.ICOContract());
  lpRouter = await ethers.getContractAt("LPRouter", await lpPair.lpRouterContract());
  
  console.log("SpaceCoinToken deployed to:", spaceCoinToken.address);
  console.log("LPPair deployed to:", lpPair.address);
  console.log("LPRouter deployed to:", lpRouter.address);
  console.log("ICO deployed to:", ICO.address);

  console.log("SpaceCoinToken owner:", await spaceCoinToken.owner());
  console.log("LPPair owner:", await lpPair.owner());
  console.log("LPRouter owner:", await lpRouter.owner());
  console.log("ICO owner:", await ICO.owner());

  const txIco1 = await ICO.connect(deployerSigner).setNextState();
  await txIco1.wait();
  const txIco2 = await ICO.connect(deployerSigner).setNextState();
  await txIco2.wait();
  const txIco3 = await ICO.connect(deployerSigner).contribute({value: ethers.utils.parseEther("0.01")});
  await txIco3.wait();
  const txIco4 = await ICO.connect(deployerSigner).setNextState();
  await txIco4.wait();
  const txIco5 = await ICO.connect(deployerSigner).withdraw(lpPair.address);
  await txIco5.wait();
  const txLp = await spaceCoinToken.transfer(multisig, ethers.utils.parseEther("1000"));
  await txLp.wait();

  const tx1 = await spaceCoinToken.connect(deployerSigner).transferOwnership(multisig);
  const tx2 = await lpPair.connect(deployerSigner).transferOwnership(multisig);
  const tx3 = await lpRouter.connect(deployerSigner).transferOwnership(multisig);
  const tx4 = await ICO.connect(deployerSigner).transferOwnership(multisig);

  await tx1.wait();
  await tx2.wait();
  await tx3.wait();
  await tx4.wait();

  console.log("SpaceCoinToken new owner:", await spaceCoinToken.owner());
  console.log("LPPair new owner:", await lpPair.owner());
  console.log("LPRouter new owner:", await lpRouter.owner());
  console.log("ICO new owner:", await ICO.owner());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
