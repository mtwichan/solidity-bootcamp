import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {
    goerli: {
      url:  `https://eth-goerli.alchemyapi.io/v2/hjRNvxtKO3GFDtHhfc6_OwKntTBGMq4m` || "",
      accounts: [`f2303b36b4d439c995c32994bb34d7a1c68ddcbbf0632889f49b4895e84914dd`] || [""],
    },
    hardhat: {
      gas: "auto",
      gasPrice: 8000000000,
      chainId: 1337,
      accounts: {
        accountsBalance: "100000000000000000000000000000000000",
        count: 35,
      },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
