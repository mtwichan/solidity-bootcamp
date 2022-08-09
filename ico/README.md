# Space Coin ICO

## Frontend
![Screen Shot 2022-06-10 at 12 02 41 AM](https://user-images.githubusercontent.com/33464965/173115254-2621febe-e98c-4343-95ac-0150b4572e80.png)


## Specification

The smart contract aims to raise 30,000 Ether by performing an ICO. The ICO should only be available to whitelisted private investors starting in Phase Seed with a maximum total private contribution limit of 15,000 Ether and an individual contribution limit of 1,500 Ether. The ICO should become available to the general public during Phase General, with a total contribution limit equal to 30,000 Ether, inclusive of funds raised from the private phase. During this phase, the individual contribution limit should be 1,000 Ether, until Phase Open, at which point the individual contribution limit should be removed. At that point, the ICO contract should immediately release ERC20-compatible tokens for all contributors at an exchange rate of 5 tokens to 1 Ether. The owner of the contract should have the ability to pause and resume fundraising at any time, as well as move a phase forwards (but not backwards) at will.


### ICO Contract
- goal of 30K ETH
- 3 phases
- 5 tokens per 1 ETH
- 150000 tokens at 30K * 5 tokens
- owner can pause contract
- owner can move state forward but not backward
- phase seed
    - max contribution limit 15K ETH
    - individual contribution limit of 1.5K ETH
    - whitelist members only
- phase general
    - max contribution limit of 30K ETH
    - individual contribution limit of 1K ETH
    - anyone can participate
- phase open
    - fund until hit goal of 30K ETH
    - no individual contribution limit
    - anyone can participate
    - contributors redeem tokens on contribution and other contributors can redeem as well
- phase close
    - the goal has been hit or the ICO has been manually closed by owner
    - no one can participate
    - owner can withdraw funds from contract

### Token Contract
- ERC20 token
- 500K supply
- 350K coins for contract
- 150K coins for ICO
- Token contract deploys ICO
- 2 % tax
- Treasury

## Improvements & Features
- add contribution overflow functionality so if user goes over, send extra eth to an `amountOwing` map where the user can get their ETH back. It would also make contributing back to owner easier and cleaner when the contract completes - currently users can contribute more than 15K ETH to the seed contribution - ran out of time, but noted
- add comments, I ran out of time, but comments would be a great improvement as per my previous audit, I will try to do this for the next one!
- time state changes instead of manual state changes
- tests on test! I only could get through so many, but there's still tons of edge cases I can think of
- `require` and `fallback` methods to reverse transactions sent by users for the times folks send ETH to the contract by accident using the wrong method - I was going to add this but I recall some security concerns that I need to review so best to add them when I'm 100% sure
- didn't have a chance to test gas optimization would love to do this next time
- didn't have a change to try fuzzy testing, would love to do this next time too

## Deployment

The contract is deployed on the `Goerli` testnet network.

Addresses:
```
Deployer account address >>> 0xE8F6EcAa58DCd56013C1013Fd167Edf4dB3e5C96
Treasury account address >>> 0xf5908Ef52E5a1FE7638d76B717efdB09F7ff32C8
SpaceCoinToken contract address >>> 0x2Ef6890794309BE330D8A4b24917570D919bC5E0
ICO contract address >>> 0x2AEA0148a04085373406f149Ff26143014C55533

```
View the SpaceCoinToken contract here: https://goerli.etherscan.io/address/0x2ef6890794309be330d8a4b24917570d919bc5e0

View the ICO contract here: https://goerli.etherscan.io/address/0x2aea0148a04085373406f149ff26143014c55533

## Design Question
Question: The base requirements give contributors their SPC tokens immediately. How would you design your contract to vest the awarded tokens instead, i.e. award tokens to users over time, linearly?

Answer: Users could keep the tokens in the contract and we could record the time from when the contract was deployed and the time in the future when the tokens are withdrawn. Based on when the tokens are withdrawn, we can take the time delta and multiply the amount of tokens by some constant multiplier. Essentially, the time delta will increase linerarly over time, and this the user should be rewarded lineraly as well based on how long they keep their tokens in the contract for.
