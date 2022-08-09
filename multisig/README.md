# LP Multisig Project
In this short project you're going to work with a small group of other students to deploy a Gnosis Safe Multisignature wallet contract, and use it to deploy and interact with your LP Project contracts. In doing so you will:

Tweak the code of your LP project's contracts and deploy them to Rinkeby
Learn how multisignature contract wallets work
Create a new multisignature wallet on the Rinkeby testnet
Gain firsthand experience of the joys and sorrows of using a multisig wallet to deploy and interact with your contracts
Weigh the tradeoffs of the various configurations (M-of-N) when using a multisignature wallet

## Requirements & Comments
Note: I am still working on finishing up my LP project, so it may differ from the code here when I submit for project correct. Just writing tests.

Comments:
- Did approval to multisig in deployment script
- Made deployer the treasury address to make things easier
- Modified original code base to support `Ownable`

Etherscan URL of Contract Interaction -> Add Liquidity (Matthew & Dan): https://rinkeby.etherscan.io/tx/0x7bb5c926b2ffec16577017c6c5d73d5e37b0e8041590058628bf0b20dcdf360c

Etherscan URLs of Deployed LP Contracts:
- LPRouter: https://rinkeby.etherscan.io/address/0x5EBf248F47B583e749cD05D1C16e4877841825a4
- LPPair: https://rinkeby.etherscan.io/address/0x61499B77AEb9D1fF025c7359847f406BCc3726aE
- ICO: https://rinkeby.etherscan.io/address/0xcc08E9796e89984dA60BbeB4633aB88fAd3Ec95F
- SpaceCoinToken: https://rinkeby.etherscan.io/address/0x48E11D2edbA18fe1B2a40C78967B8e7A972249c5

Etherscan URL Transcation History (Transfer ownership, etc): https://rinkeby.etherscan.io/address/0xE8F6EcAa58DCd56013C1013Fd167Edf4dB3e5C96

Addresses:
Matthew - `0xE8F6EcAa58DCd56013C1013Fd167Edf4dB3e5C96`
Dan - `0xfa6b3dF826636Eb76E23C1Ee38180dB3b8f60a86`
Ryan - `0x0Aa4a70b0Dbc5F963D920EC5B21066fD374841C1`
Multisig - `0xBAe77dC8Ddb6dF14362Cc65116EC601B82721A7d`
Multisig URL (2/3 Quorum): https://gnosis-safe.io/app/rin:0xBAe77dC8Ddb6dF14362Cc65116EC601B82721A7d/

Deploy Script Output:
```
SpaceCoinToken deployed to: 0x48E11D2edbA18fe1B2a40C78967B8e7A972249c5
LPPair deployed to: 0x61499B77AEb9D1fF025c7359847f406BCc3726aE
LPRouter deployed to: 0x5EBf248F47B583e749cD05D1C16e4877841825a4
ICO deployed to: 0xcc08E9796e89984dA60BbeB4633aB88fAd3Ec95F

SpaceCoinToken owner: 0xE8F6EcAa58DCd56013C1013Fd167Edf4dB3e5C96
LPPair owner: 0xE8F6EcAa58DCd56013C1013Fd167Edf4dB3e5C96
LPRouter owner: 0xE8F6EcAa58DCd56013C1013Fd167Edf4dB3e5C96
ICO owner: 0xE8F6EcAa58DCd56013C1013Fd167Edf4dB3e5C96

SpaceCoinToken new owner: 0xBAe77dC8Ddb6dF14362Cc65116EC601B82721A7d
LPPair new owner: 0xBAe77dC8Ddb6dF14362Cc65116EC601B82721A7d
LPRouter new owner: 0xBAe77dC8Ddb6dF14362Cc65116EC601B82721A7d
ICO new owner: 0xBAe77dC8Ddb6dF14362Cc65116EC601B82721A7d
```

## Design Exercises
1.Consider and write down the positive and negative tradeoffs of the following configurations for a multisig wallet. In particular, consider how each configuration handles the common failure modes of wallet security.

1-of-N
Positive:
- If all the users trust one another, they could use the wallet similar to a business bank account where they can use the shared funds with in the trust created between members

Negative:
- No group consensus. Anyone who signs can do what they want with the multisig wallet.

M-of-N
Positive:
-  Group consensus, no one member can grief consensus. Takes into account the majority

Negative:
- Not all members may be happy with the decision 
- Majority vs. minority

N-of-N
Positive:
- Majority consensus

Negative:
- All members have to agree, so slower to come to agreement
- One member can grief the consensus