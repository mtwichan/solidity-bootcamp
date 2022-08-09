https://github.com/0xMacro/student.mtwichan/tree/a5edb9279ced120f5be7a37b7b416a3b5a96a99a/interview-prep

Audited By: Brandon Junus

# Sudoku Challenge

Below you will find the staff audit for both of the interview question solutions you submitted. For the Sudoku Exchange problem, the audit
will look a little different than you're used to. Instead of issues in the code you submitted, you will find several checklists of known
vulnerabilities and known gas optimizations. We've added an `[x]` next to each item if you correctly identified that item in your
submission, and a `[]` if not.

## General Comments

A gentle heads up: the Sudoku Exchange problem is intentionally very difficult. Usually only 1 student manages to find enough vulnerabilities and gas optimizations to pass. Please, use this as a benchmark for how much you've learned in the last 6 weeks (only 6 weeks!). Even better, for those items you missed we hope you use it as a guide for the attack vectors to look out for on your next interview/audit.

That being said, overall great job on this assignment! You caught most of the major vulerabilities. Be sure to always check ERC20 Transfer return value for success!

Finally, I would encourage you to check out front-running and why it may be an issue for this project.

Great job! Congradulations on completing the course!

## Issues

### High Severity Vulnerabilities

- [ ] `createReward()`'s `ERC20.transferFrom` call does not check the return value for success.

- [x] `createReward()` allows overwriting of existing challenge reward/token/solved.

- [x] Need to change the `.transfer` call to transfer to `msg.sender` so that it rewards the caller.

- [x] Need to change data type from `memory` to `storage` so that it changes the storage value of the `ChallengeReward`.

- [ ] `claimReward` can be front-run. `SudokuExchange` needs to change the `claimReward` logic to use a 2-stage commit-reveal process where the first transaction commits `keccak256(msg.sender + random_salt)`, and then, after some number of a blocks, in a second transaction the actual solution is provided. The `msg.sender + random_salt` hash ensures that the second transaction cannot be front-run.

- [x] Can be double-claimed. Need to check that it's not solved (or remove it from mapping).

- [x] `claimReward` is vulnerable to a reentrancy attack. (It would not be if it followed checks-effects-interactions.)

### Low Severity Vulnerabilities

- [ ] `claimReward`'s `ERC20.transfer` call does not check the return value for success.

- [x] `createReward()` allows creating an already solved challenge (`solved=true`), locking tokens.

- [ ] The `challenge` argument in `claimReward` is controlled by the user, so they could pass in a contract address with a `validate` function that always returns `true`.

### Gas Optimizations

- [ ] Turn solc gas optimizations on.
- [ ] Gas savings from shorter error strings or Solidity Custom Errors.
- [ ] Do not create new contract with every challenge, instead store within `Challenge` struct on `SudokuExchange`.
- [x] Use `external` instead of `public` on all of `SudokuExchange.sol`'s functions.
- [ ] Remove `hardhat/console.sol`. See the NPM package [hardhat-log-remover](https://www.npmjs.com/package/hardhat-log-remover)
- [ ] Eliminate duplicate information from `ChallengeReward` struct. The `challenge` struct member on line 20 is identical to the key of `rewardChallenges` on line 30. Consider removing the `challenge` struct member.
- [x] Use `calldata` type in `createReward` to avoid unnecessary copying.
- [ ] Remove a memory variable allocation by getting rid of `isCorrect` function variable in `claimReward`. It can be passed directly to the `require` on the next line.

### Code Quality Issues

- [ ] There are no tests!
- [ ] The documentation is sparse. Consider using the NatSpec format for comments, and add more variable, function, and contract comments.
- [x] Explicitly mark the visibility of contract fields like `rewardChallenges` to be `public`.
- [x] Add events to signify changes in the contract state.

## Score

1. You must find all but 1 of the High and Medium severity vulnerabilities in order to pass this interview.
2. You must have at least 3 of the Gas Optimizations to pass this interview.

H-5/7 L-1/3 G-2/8 Q-2/4

"Interview failed. :slightly_frowning_face" -->

# Signature MerkleDrop

## General Comments

Great work on the project, and good luck with your newly found web 3 knowledge!

## Issues


**[Technical Mistake]** `signatureClaim` prevents smart contract wallets from claiming their MACRO

In `Airdrop.sol` you call `ECDSA.recover` on the passed in signature. This works fine for EOA addresses, but does not support EIP-1271 smart contract signatures. So if the airdrop included an address of a smart contract wallet like a Gnosis Safe, it would be un-claimable.

You can use something like OZ's [SignatureChecker.isValidSignatureNow](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/SignatureChecker.sol#L25) function to handle EIP-1271 contract signatures.


**[L-1]** `merkleClaim` verifies signature against `_to`, when it should check `msg.sender`

In `merkleClaim` the address checked and then updated in the `alreadyClaimed` mapping is `_to` but it should be `msg.sender`. `msg.sender` is the address claiming tokens, `_to` is just the address the claimer wants to the tokens to be held in. Similarly, the address checked in the merkle proof leaf should be `msg.sender`. This is a Low Vulnerability because it implies that someone other than the `msg.sender` can submit a merkle proof to claim the MACRO token. This means it’s possible for a single user to cause all the tokens to be claimed. The actual `_to` recipients may not want this, for example for tax purposes (an honest claimer could have waited until the next tax year to claim their token, and pay their capital gains tax).

[Q-1] Leaving hardhat/console.sol in production project

Your contract imports hardhat/console.sol, which is a development package.

Consider removing hardhat/console.sol from your production code.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | -     |
| Vulnerability              | 1     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | 1     |

Total: 2

Good job!
