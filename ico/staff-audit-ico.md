https://github.com/0xMacro/student.mtwichan/tree/385c8ff91eb83ac9f267e7753733711a462082f6/ico

Audited By: brianwatroba

# General Comments

1. Great work! I really appreciated the simplicity of your code. You keep things very methodical and logic-based (your if conditions by state are very clear). This is especially helpful for this project because there is individual logic by ICO state.
2. Your tests are in-depth and detailed. A good testing process is key in smart contract development and something we reinforce heavily. You also made an awesome effort to translate specifics from the spec into individual tests. This is also a great practice and helps to minimize error.

_To think about:_

1. Consider adding comments to your code to help readability. Your code is very clear already, but comments are generally helpful. Consider using the NatSpec format, check out [this guide](https://docs.soliditylang.org/en/develop/natspec-format.html) for more info.

# Design Exercise

This is a good approach! You explain the constraints and assumptions for your solution very well. You keep the rules simple yet scalable: measuring current time vs. a static time when contract is deployed.

_To think about_:

- How would you track how many tokens a user has collected to ensure they don't overcollect at each new vesting point? In other words, they collect < their total allowed at vesting point 1, how would you allow them to collect their full running total at point 2?
- How would you measure and compare time? For further reading, check out the [discepancy and uses of block.timestamp vs. block.number](https://medium.com/@phillipgoldberg/smart-contract-best-practices-revisited-block-number-vs-timestamp-648905104323#:~:text=timestamp%20%3F,minimally%20gamed%20by%20a%20miner.)

# Issues

**[M-1]** Treasury cannot access tax funds

The spec states that the tax amount should be sent to the ICO
treasury address.

You designate a separate address for the treasury in your ICO contract's constructor and allow tax funds to collect in your SpaceCoinToken.sol contract upon each transfer call.

However, your `transferTreasury()` function does not `_transfer` the collected tax to the treasury from your SpaceCoinToken.sol contract to the Treasury. Instead, the full current tax balance is sent from the Contract Owner's address.

Consider sending tax amount directly to the treasury address.

**[M-1]** Users can exceed individual contribution limits in GENERAL phase

The spec describes that a user can contribute a max of 1500 ETH in the SEED phase, and a max of 1000 _total ETH_ (including what was contributed in SEED phase) in the GENERAL phase.

In this case, a user could contribute 1500 ETH in the SEED phase, and an additional 1000 ETH in the GENERAL phase. Your balance tracking using `.totalBalance` and `.generalBalance` makes me think you thought through separating limits, but possibly didn't catch the specific rule that SEED and GENERAL phase individual contributions should be cumulative for limit checks.

Consider checking (for each phase) if the past contributions for a user + their desired new contribution amount goes over the given phase contribution limit.

**[L-1]** Dangerous Phase Transitions

If the `setNextState()` function is called twice, a phase can accidentally
be skipped. There are a few situations where this might occur:

1. Front-end client code malfunction calling the function twice.
2. Human error double-clicking a button on the interface on accident.
3. Repeat invocations with intent - Uncertainty around whether or not a
   transaction went through, or having a delay before a transaction processes,
   are common occurrences on Ethereum today.

Consider refactoring this function by adding an input parameter that
specifies either the expected current phase, or the expected phase to
transition to.

**[Technical Mistake-1]** Additional phases beyond SEED, GENERAL, and OPEN

In your ICO contract, you allow for the owner to manually advance phases per the spec.

However, you include an andditional phase (Phase CLOSED). This is good intution! "General" still sends the message that the ICO is available, so a separate state for "over" or "closed" makes logical sense.

However, it's import to stay in line with the spec and its specific requirements.

Consider only allowing three phases for your ICO: SEED, GENERAL, and OPEN.

**[Q-1]** Leaving hardhat/console.sol in production project

Your contract imports hardhat/console.sol, which is a development package.

Consider removing hardhat/console.sol from your production code.

**[Q-2]** Overriding both `transfer()` and `transferFrom()`

In your SpaceCoinToken.sol contract, you override both the `transfer()` and `transferFrom()` functions to account for tax. This is great intuition and spot on. Had you only overridden one of the functions, users could evade the tax.

However, you could save some gas and complexity by overriding just the ERC-20 `_transfer()` function, which is called by both `transfer()` and `transferFrom()`.

Consider overriding `_transfer()` function rather than both the `transfer()` and `transferFrom()` functions.

# Nitpicks

- `isMsgValueGTZero` modifier is only used once. Consider only using modifiers in cases where they'll apply to two or more functions.
- Consider adding events for phase changes, external apps may want to know about those events
- The default value for an enum in Solditiy is the first enum (or 0). You don't need to set the initial state in the constructor

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | -     |
| Vulnerability              | 5     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | 1     |

Total: 6

Good job!
