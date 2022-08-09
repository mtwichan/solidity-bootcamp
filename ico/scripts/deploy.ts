// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { ICO, SpaceCoinToken, SpaceCoinToken__factory } from "../typechain";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const deployer: string = "0xE8F6EcAa58DCd56013C1013Fd167Edf4dB3e5C96";
  const treasury: string = "0xf5908Ef52E5a1FE7638d76B717efdB09F7ff32C8";
  const spaceCoinTokenFactory: SpaceCoinToken__factory = await ethers.getContractFactory("SpaceCoinToken");
  const spaceCoinToken:SpaceCoinToken = await spaceCoinTokenFactory.deploy(treasury);
  await spaceCoinToken.deployed();
  const ICO: ICO = await ethers.getContractAt("ICO", await spaceCoinToken.ICOContract());
  await ICO.setWhitelist([deployer, treasury]);

  console.log("Deployer account address >>>", deployer);
  console.log("Treasury account address >>>", treasury);
  console.log("SpaceCoinToken contract address >>>", spaceCoinToken.address);  
  console.log("ICO contract address >>>", await spaceCoinToken.ICOContract());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
