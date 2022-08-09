https://github.com/0xMacro/student.mtwichan/tree/aba753dfa692a33c60a9d17ee9bb6243d7ab3ed6/dao

Audited By: Melville

# General Comments

1. Great test coverage for the happy cases. Check out the `coverage/index.html` file generated when you run `npx hardhat coverage` and it will show you the branches that your tests didn't cover. You want near 100% branch coverage both to act as regression tests, and to ensure that every single line of code is working like you expect it does. But testing is just the first step, because full test coverage would not have prevented the 2 issues found in this audit.

2. Your DAO code shows a solid understanding of the EIP-712 signature pattern, and your business logic for proposal creation, execution, and membership addition are spot on. Well done!

3. Check out the Code Quality issues for ways to make your code more readable, and more gas efficient

4. One of the issues that I found was a reentrancy bug. Every time you write a non-static function, before you commit code ask yourself "am I following the checks effects interaction pattern?" Once this thought is automatic, you'll have a strong defense against one of web3's most devastating bugs.

# Design Exercise
 
This is a good interface for a `delegateBySig` function, but what storage variables and logic would you use to keep track of delegation?

Check out how Compound implemented delegation: https://github.com/compound-finance/compound-protocol/blob/master/contracts/Governance/Comp.sol#L223

However, here they use ERC20 tokens for voting power, so for our case where we simply have 1 member 1 vote you could use a `mapping(address => uint32)` storage variable which keeps track of the total voting power of a member, and increments/decrements it.

For Question 2, the biggest problem is gas cost. If someone wants to undo their delegation. A delegation chain could become really large, and the only way to return votes, would require O(n) storage writes, where n is the length of the chain.

# Issues

**[H-1]** Proposals can be executed more than once via reentrancy

Your Proposal execution logic checks to make sure the Proposal is in the correct state in line 128:

`require(state(proposalId) == ProposalState.SUCCEEDED`

but then it uses `.call` to make an external call. This doesn't follow the checks-effects-interaction pattern, and there is not ReentrancyGuard, so any one of the Proposals functions can result in code that re-enters into the `CollectorDao.execute` function, and re-executes the same Proposal functions.

To protect against this, follow the checks-effects-interaction pattern by moving line 149:

`p.proposalState = ProposalState.EXECUTED;`

to be immediately after line 128. That will change the state of the Proposal, and cause any re-executions to revert.

**[M-2]** NFT purchase price has no upper limit

When the DAO creates a proposal to purchase an NFT, the NFT seller could take advantage of that by raising the NFT price to some arbitrarily high amount.

Because the DAO does not call `NftMarketplace.getPrice` and check to make sure the price is reasonable, there is nothing stopping the NFT's funds from being drained by a malicious NFT seller.

Consider adding a `maxPrice` variable into the NFT-buying function and then check `price <= maxPrice` in your `buyNft` function.

**[Q-1]** Lack of comments makes understanding the code more difficult

The reason for certain lines of code would be clearer if there were inline comments, and Natspec would make the purpose of storage vars and functions easier to understand.

When it comes times for auditors to understand your code, you and them will thank you!

**[Q-2]** Missing validation checks on Proposal creation

It's possible to create a Proposal with different array lengths for `targets` and `signatures`. In line 101 of CollectorDAO.sol you do not verify that the length of the `signatures` array is equal to the `targes` array.

Consider verifying that those arrays have equal length before creating a Proposal that will possibly fail when executed.

**[Q-3]** Event emitted when it should not be

In lines 154-157 you emit `ExecuteEvent`, even though in that code branch no function executions will have occurred (that happens in the `if` branch).

Consider changing this section of code:

```
if (state(proposalId) == ProposalState.SUCCEEDED) {
    require(state(proposalId) == ProposalState.SUCCEEDED, "Proposal must be in succeeded state to execute");                        
    bytes memory callData;
    for (uint256 idx = 0; idx < targets.length; ++idx) {
        if (bytes(signatures[idx]).length == 0) {
            callData = calldatas[idx];
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signatures[idx]))), calldatas[idx]);
        }
        (bool success, bytes memory returnData) = targets[idx].call{value: values[idx]}(callData);
        if (!success) {                
            // failed without revert message
            if (returnData.length < 68) {
                revert('Transaction reverted silently');
            }   
            assembly {
                returnData := add(returnData, 0x04)
            }
            revert(abi.decode(returnData, (string)));
        }
    }
    p.proposalState = ProposalState.EXECUTED;
    executeLock = false;
    emit ExecuteEvent(msg.sender, proposalId, p.proposalState);
    return (p.proposalState, proposalId);
} else {
    executeLock = false;
    emit ExecuteEvent(msg.sender, proposalId, p.proposalState);
    return (p.proposalState, proposalId);
}
```

into

```
require(state(proposalId) == ProposalState.SUCCEEDED, "Proposal must be in succeeded state to execute");
p.proposalState = ProposalState.EXECUTED;
bytes memory callData;
for (uint256 idx = 0; idx < targets.length; ++idx) {
    if (bytes(signatures[idx]).length == 0) {
        callData = calldatas[idx];
    } else {
        callData = abi.encodePacked(bytes4(keccak256(bytes(signatures[idx]))), calldatas[idx]);
    }
    (bool success, bytes memory returnData) = targets[idx].call{value: values[idx]}(callData);
    if (!success) {                
        // failed without revert message
        if (returnData.length < 68) {
            revert('Transaction reverted silently');
        }   
        assembly {
            returnData := add(returnData, 0x04)
        }
        revert(abi.decode(returnData, (string)));
    }
}
emit ExecuteEvent(msg.sender, proposalId, p.proposalState);
return (p.proposalState, proposalId);
```

**[Q-4]** `startBlock` is redundant with `endBlock`

`startBlock` is only ever used in this line 48:

`require(p.endBlock != 0 && p.startBlock != 0, "Selected proposalId has not been initialized");`

That line can be reduced to just checking `p.endBlock`, because any situation where `endBlock` is non-zero, `startBlock` will also be nonzero.

Consider removing `startBlock` entirely, and saving on SSTORES

**[Q-5]** Code should be formatted

It was difficult to read parts of your code because it didn't follow the idiomatic formatting of most Solidity code. For example, the incorrect indenting in `execute`

Consider running the prettier formatter before submitting your code:

`npx prettier '**/*.{json,sol,md,ts}' --write`

**[Q-6]** Duplicated code in castVote-related functions

You have almost identical code in your 3 castVote-related functions:

```
Proposal storage p = proposals[proposalId];
    require(members[msg.sender], "Must be a member of the DAO to execute");
    require(state(proposalId) == ProposalState.ACTIVE, "Proposal must be in the active state");
    require(p.id != 0, "Proposal does not exist");
    require(p.voters[msg.sender] == false, "Caller has already voted");

    if (support == Vote.FOR_VOTE) {
        p.forVotes += 1;
    } else if (support == Vote.AGAINST_VOTE) {
        p.againstVotes += 1;
    } else {
        p.abstainVotes += 1;
    }
    p.voters[msg.sender] = true;
```

which makes it harder to audit, and causes you to miss certain logic that should be shared in all of them (all of them should emit a `CastVoteEvent` event, but only `castVoteBySig` does)

Consider refactoring that block of code into its own `internal` function that is called by the 3 `external` functions

# Nitpicks

* In line 75 you have:

`if total >= quorum && (total * 4 >= numberOfMembers)) {`

But in all cases where `(total * 4 >= numberOfMembers)` is true, `total >= quorum` will also be true, so the first term can be removed to save a small amount of gas


# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | - |
| Vulnerability              | 5 |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | - |

Total:  5

Good job!