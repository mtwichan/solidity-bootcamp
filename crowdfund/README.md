# Crowdfund
 
## Mock Technical Client Exercise

### Owner and Operator

#### General

- Create a separate contract for the NFT and crowdfunding
    - Use ERC 721 Openzepplin interface for NFT
- Store NFT metadata on IPFS
- Factory design pattern for both NFT and crowdfunding

#### Prevention

- Circuit breaker
    - Self-checks to ensure the amount of money in the total contract matches transactions
    - Allow owner to stop contract which sends money back to all contributors (huge gas) or allows them to withdraw their funds
- Separate storage variables to track the amount stored in the contract

#### Permissions

- Allocate operator permissions to allow for trusted entities such as OpenSea

#### Incentive

- Charge project owners fee for registering projects

### Project Owners

- Can register, cancel, and delete project
    - Reimburse users if canceled or deleted projects
    - Pay a fee to register a project
- Can withdraw funds if amount raised condition has been met
- Can set a time limit of 30 days for funding
- Can set amount project goal amount above a some minimum limit
- Can mint their own NFT collectible and set images for their NFT using the NFT factory contract

### Contributors

- Can contribute to projects up to some upper bound set by the contract
- Is rewarded an NFT if contributing a certain amount set by the contract (1 ETH)
- Can withdraw contributed funds if the project has not met its goal
- Can trade rewarded NFT anywhere
- Can trade rewarded NFT on list of approved operators given by client for a lower fee (OpenSea)
- If contribution changes project fundraising status to complete, the user will pay extra gas fee’s in order to transfer the project fundraising amount to the project owner in the contract. They will be compensated for this by reimbursing the gas fee up to a certain amount (so the user can’t manipulate the gas fee to take a massive portion of the fundraising amount), where the gas fee is taken from the project fundraising amount

## Feature Improvements & Question Marks
- I realized line 6 `mapping(uint256 => Project) public childrenContracts;` in `ProjectFactory.sol` could be removed in favour of reducing the size of the contract and saving space. I ran out of time so kept it because I would have to refactor a load of tests that rely on the project ID.
- I wasn't sure what the best route was for distributing the funds when the crowdfunding goal has been reached. I added a function `allocateFunds()` in `Project.sol` that does this. I wasn't sure if it was a best practice or not to clear all the owed amounts to contributors. There's a `for loop` in this contract that could be vulnerable to huge gas costs because it has to take all of the users and set their contribution status to zero -- in reality I don't think the state of the contributors matters because my contract is based on the `State` of the contract, so I could just remove the for loop and save gas and remove the security vulernability. If I kept this, I would put an upperbound on the number of contributors in order to keep this for loop safe. Also, I wasn't sure where the best place to run the function is, so I kept it separate and have it so the `creator` needs to run the `allocateFunds()` function before withdrawing anything.
- I could write more tests in the future on the NFT functionality to see if the interplay between the two contracts opens up any security vulernabilities.
- I ran out of time due to interviewing, and I need to do more through testing using `mythril` and `Slither`, test gas costs and contract size

## Design Exercises
Smart contracts have a hard limit of 24kb. Crowdfundr hands out an NFT to everyone who contributes. However, consider how Kickstarter has multiple contribution tiers. How would you design your contract to support this, without creating three separate NFT contracts?

- Instead of creating three separate NFT contracts I could add NFT metadata (JSON data) that would allow me to add attributes to the NFT tokens. I could then reward people with the different NFT tiers based on the metadata the NFT possesses. In the `badgeMint` function I could create a new parameter that defines the amount someone has contributed and based on that amount determine which type of NFT to award to the user.