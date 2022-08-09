# LP Project
In this project you're going to extend your previous project by writing a specific type of liquidity pool contract based off of Uniswap V2's decentralized exchange protocol. In doing so you will:

- Learn how liquidity pools work
- Write a Uniswap v2 style liquidity pool contract
- Deploy to a testnet
- Update your Space ICO contract to move its funds to your pool contract
- Extend a frontend for liquidity providers to manage their ETH-SPC LP tokens

## Requirements & Comments
- Assuming even withdrawl is 5 SpaceCoin Token for 1 ETH
- Tracking the amount of total ETH using a variable may be redundant, but I wanted to protect the contract from any attack vectors just in case
- Need to add comments
- Did not write tests for `events` as I thought it was redundant and running out of time

Deployment Links:

SpaceCoinToken -> https://rinkeby.etherscan.io/address/0x941288560265da5F1aa3F2f72164681c28fAFa78

LPPair -> https://rinkeby.etherscan.io/address/0x398fe7CEFbb437F0C32c87dC4dee2d961351F92B

LPRouter -> https://rinkeby.etherscan.io/address/0x57FC3EdeeFb8683f73E1b97C19feBb57924906A3

ICO -> https://rinkeby.etherscan.io/address/0xfC4Ec9efdf1B5105cD884DEfb1499D0aE348c1Cf

Deployment:
```
SpaceCoinToken deployed to: 0x941288560265da5F1aa3F2f72164681c28fAFa78
LPPair deployed to: 0x398fe7CEFbb437F0C32c87dC4dee2d961351F92B
LPRouter deployed to: 0x57FC3EdeeFb8683f73E1b97C19feBb57924906A3
ICO deployed to: 0xfC4Ec9efdf1B5105cD884DEfb1499D0aE348c1Cf
```

## Design Exercises
1. How would you extend your LP contract to award additional rewards – say, a separate ERC-20 token – to further incentivize liquidity providers to deposit into your pool?

Could reward users with an ERC-20 token, where each token represents a vote in a DAO that determines how the pool functions, better yet, include this functionality as part of the current LP-ERC20 token.
