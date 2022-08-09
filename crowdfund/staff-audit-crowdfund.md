
https://github.com/0xMacro/student.mtwichan/tree/9f6652f5a5c06299a44edd875b7f35717c8986ad/crowdfund

Audited By: Cameron Voell

# General Comments

Nice work on this Matt, especially given interview schdeuling you had last week (hope they went well!) You got all the main concepts down. See the notes below for how some minor tweaks could prevent several issues. Nice job getting this handed in, I think with more time to dedicate, you'll be on a good track for future projects. 


# Design Exercise

Utilizing metadata is a good idea for implementing different reward tiers for NFT rewards. However storing JSON data on chain can be quite expensive, and could push you over the smart contract data limit. It is an important detail that a good option would likely be to just store the hash of different json data options on chain, and then point the user to using the hash to access the relevant json data using a content addressed decentralized storage protocol like IPFS. 


# Issues

**[H-1]** Contributors can't withdraw from projects who missed funding deadline unless owner calls the `cancelCrowdfund` function. But owners can't call cancelCrowdfund after the deadline. This means the refund wont work for projects unlesss they are canceled before the deadline.

Project.sol line 100 contains the following code:

```solidity
function withdraw() payable public isNotNullAddress {
        require(projectState == State.FAILED, "Project must be in the failed state");
```

However, the only code that updates the project state to equal `State.FAILED` is the owner only `cancelCrowdfund` function:

```solidity
function cancelCrowdfund() public isOwner isInDeadline isNotNullAddress {
        require(projectState == State.RUNNING, "Project must be in the running state");
        projectState = State.FAILED;
        emit CancelCrowdfundEvent(msg.sender, projectState);
    }
```

Consider modifying projectState to automatically return State.FAILED if target is not met and the deadline is past, or updating the require statement of withdraw function some other way so contributors dont need owner to cancel before they can withdraw from underfunded projects past the deadline. 

---

**[M-1]** Users with 1 ETH contribution can keep minting NFTs with only minimal contribution if they transfer NFTs. 

Project.sol line 65 contains the following code:

```solidity
        amountNFTOwing[msg.sender] = (amountOwing[msg.sender] / 10 ** 18) - balanceOf(msg.sender);
```

However, balanceOf(msg.sender) is not a reliable way to check if the user is owed another NFT because they may have transfered their previous NFT to another wallet they control. This means after 1 ETH contribution, user could claim an NFT, transfer it, and then each time they do an additional .01 contribution, they could claim another NFT and repeat. 

Consider storing a counter for how many NFTs each person has claimed and using that to calculate how many NFTs they are owed. 

---

**[L-1]** Functions are unnecessarily marked as `payable` (logged as 1 point technical mistake)

Project.sol line 100 contains the following code:

```solidity
function withdraw() payable public isNotNullAddress {
```

Project.sol line 112 contains the following code:

```solidity
    function withdrawCreator(uint256 _amount) payable public isOwner {
```

The `payable` modifier allows a caller of the function to send ETH with the transaction that will be passed in with msg.value. However, neither withdraw functions require the ability of the user to send ETH with the transaction when calling those functions. The only function that requires sending ETH with the transaction(and therefore needs to be `payable`) is `contribute`. 

Consider removing the `payable` modifier from relevant functions that
do not need to receive ETH. 

---

**[Q-1]** ProjectFactory project id missing `indexed` modifier
Since the same address can create multiple projects it is important to associate project contract addresses with ids somewhere so that they can access your `childrenContracts` mapping for accessing project contracts. For this reason making the projectId indexable would be very useful.

---

**[Q-2]** Unecessary split into two allocateunds and withdrawCreator functions
These two functions can be combined and we can remove the code for deleting amountOwing(Project state checks will stop people from being able to withdraw amountOwing anyway)

---
## Extra Feature - Project Factory owner, not utilized
Since the `owner` field is not being used in the ProjectFactory is should be removed as it makes the contract harder to understand in its current state. 

## Counter.sol, unnecessary import
Heads up, we are advising only importing bare minimum ERC standard contracts in order to have a better learning experience, and will add points for extra imports in future projects. In this case, Counter functionality can be implemented with a simple field variable. 



# Nitpicks
Some comments especially on harder to understand functions would be helpful. The Natspec standards are often utilized:  It is recommended that Solidity contracts are fully annotated using NatSpec for all public interfaces (everything in the ABI).

Using NatSpec will make your contracts more familiar for others audit, as well
as making your contracts look more standard.

For more info on NatSpec, check out [this guide](https://docs.soliditylang.org/en/develop/natspec-format.html).

Consider annotating your contract code via the NatSpec comment standard.





# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | 1 |
| Vulnerability              | 5 |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | 1 |

Total: 7

Good effort!
