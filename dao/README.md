# DAO Project

## Project Description
In this project you're going to write a governance smart contract for a decentralized autonomous organization (DAO) aimed at buying valuable NFTs. In doing so, you will:

- Implement a treasury contract that buys NFTs
- Implement a voting system with signature votes
- Implement a proposal system that calls arbitrary functions.

You are writing a contract for Collector DAO, a DAO that aims to collect rare NFTs. This DAO wishes to have a contract that:

- Allows anyone to buy a membership for 1 ETH
- Allows a member to propose an NFT to buy
- Allows members to vote on proposals:
- With a 25% quorum
- If passed, have the contract purchase the NFT in a reasonably automated fashion.

## Voting System
I kept my voting system very simple because of the membership requirement.

Users pay 1 ETH for a membership to the DAO, and with their membership they can vote on any proposal once, and at a 25% quorum, they can choose to execute the proposal.

### The design decisions you made when creating your voting system
I kept the voting system simple. Since membership to the DAO was a requirement, the other voting systems didn't make much sense to me (quadratic voting for example) because 
they require multiple votes (tokens) in order to implement. I followed the specification and set a quorum of 25%.

### The risks and tradeoffs of said system
- Users could make multiple multiple wallets and buy multiple memberships thus having multiple votes
- The quorum at <= 4 users is tricky to implement, and thus the quorum isn't really effective until it reaches 8 users (2 quorum votes required), before this assuming rounding down
the quorum is 1 user, so any member can execute any proposal


## Comments and Notes
- The `TestContract.sol` file is used for the tests and is not apart of the project. Please ignore this file in your audit!
- I decided not to use a queue because the project description did not specify ordering of proposals as a requirement
- I didn't write tests for events because they're pretty trivial and I didn't need to use them in other parts of my code
- For the `castVoteBySigGroup` function, I wasn't quite sure what the best approach was to alert the user of errors... kept it as is for now
- In the future would add some sort of sell function for NFT so that users get rewarded, otherwise not sure what the benefit of this DAO is for the users
- Could definitely modularize the voting code and tests a bit more, but running out of time
- Would add comments!

## Design Exercises
1. Per project specs there is no vote delegation; it's not possible for Alice to delegate her voting power to Bob, so that when Bob votes he does so with the voting power of both himself and Alice in a single transaction. This means for someone's vote to count, that person must sign and broadcast their own transaction every time. How would you design your contract to allow for non-transitive vote delegation?

I could write a `permit(...)` function that allows Alice to delegate her voting power to Bob, by using her signature params (`v r s`). The `permit(...)` function could have a type hash that includes metadata that indicates Alice wants to delegate voting power to Bob, such as Bob's address, and the projectId she's allowing Bob to vote for.

2. What are some problems with implementing transitive vote delegation on-chain? (Transitive means: If A delegates to B, and B delegates to C, then C gains voting power from both A and B, while B has no voting power).
- A delegated to B assuming B would vote, but now C is voting for A
- I'm not to sure what else ... 
