# Sudoku Exchange

## Vulnerabilities
SudokuExchange.sol
- Reentrancy in `claimReward` at lines 57 - 59, no code to set the current `ChallengeReward.reward` to zero and to solved before transfering it. Before calling the external function on line 58, it should set the `challengeReward.solved = true` and optionally set `challengeReward.reward = 0`, otherwise bad actor can get paid multiple times
- Reentrancy in `createReward` at lines 38 and 42. Making a state change after external function call. Change the state variable before the `transferFrom` function call.
- There should be a `require` statement to check if the selected `challengeReward` has already been solved, otherwise can run function multiple times over. Ex: `require(challengeReward.solved == False, 'has already been solved')`
- For `createReward` line 42, the `address(challengeReward.challenge)` could be zero and will burn the challenge reward and tokens transfered by the caller. Should remove this variable, and validate it using a `require` statement. 
- Data validation should  be done for all the variables in the `ChallengeReward` struct, for example `token` could point to a burn address, or `solved` could be already set to `true`
- The provided ERC20 could be malicious and when we call functions such that `transfer` and `transferFrom` it could could perform unintended behaviour, so perhaps we could add an allow list of addresses of ERC20 tokens that we trust.
- For `claimReward` line 57 the data storage parameter should be `storage` otherwise it will never set the data in the contract
- For `claimReward` line 58 the reward is being sent to the back to the contract and not to the caller, so the reward is locked in the contract
- Attacker can overwrite saved `ChallengeReward` because there's no check in `createReward` to prevent this, so folks can change parameters in malicious ways (ex: griefing by making reward zero)
- Rewards in `claimReward` do not take into account taxes by ERC20 tokens and other side effects, thus a user may be bricked from claiming their reward in the `claimReward` function because they're attempting to claim a reward that is greater than they are able to recieve (revert)

SudokuChallenge.sol
- The purpose of this is to validate a solve Sudoku, but the solution is not stored anywhere. I would consider this a missing feature thus high vulnerability

## Gas Optimizations
SudokuExchange.sol
- Change `createReward` access modifier to `external` and change parameter `challengeReward` to `calldata`. Since it's only being read and written to it's okay to use `calldata` here. Function is not being used in other parts of contract.
- Change `claimReward` access modifier to `external` and change parameter `challengeReward` to `calldata`. Since it's only being read and written to it's okay to use `calldata` here. Function is not being used in other parts of contract.
-

SudokuChallenge.sol
- Change `validate` access modifier to `external view` since it's not being used in other parts of the smart contract. External uses less gas than public because of the way it copies and modifies data (calldata vs memory)
- Could set `challenge` to `immutable` since it's not meant to change and assigned in the constructor

## Code Quality Issues
SudokuExchange.sol
- Line 49, can do `address(0)` instead of `address(0x0)`
- Line 42, line 49, multi-nesting of addresses makes the code confusing and verbose. When errors are thrown, it's even more confusing because we don't know which part of the the nesting is causing the error. Could assign the variables beforehand and pass them in, although it costs a little gas, it makes for much more readable code, and we could write `require` statements for the nested statements to validate the data further :).
- For line 30, `mapping(address => ChallengeReward) rewardChallenges;` the variable should be `public` since this data is important to validate challenges and creating other apps
- No events? Events could be useful to show the solution for solved Sudoku puzzles and general data querying


SudokuChallenge.sol
- `uint8[81] calldata potentialSolution` makes it difficult to access data at a specific row and column unless you use some math. This could done in an easier way by using a 2D array so that users could access data based on row and column (albiet backwards in Solidity)
- the `validate` function should assign the resulting data to `isCorrect`, otherwise change the return to just a `bool` instead
- No events? Events could be useful to show the solution for solved Sudoku puzzles and general data querying