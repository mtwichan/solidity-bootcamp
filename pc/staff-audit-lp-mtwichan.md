https://github.com/0xMacro/student.mtwichan/tree/0e90ed573b49e5f614b9adce93e34e6c0acbbd44/lp

Audited By: brianwatroba

# General Comments

Great effort. This is by far the most difficult project of the fellowship (which is why we allow more time). But I also think it has the most to teach us. Liquidity pools are truly innovative and fascinating! You made a really good effort to implement all the requirements of the spec and think through the systems design yourself. I can tell you used Uniswap as a guide, but took the time to pare down the implementation to fit this project. That's a sign that you really absorbed how liquidity pools work, but more importantly, how to build a liquidity pool that fits a specific limited feature set. Awesome!

You anticipated most of the "gotchas" in this type of project, which is great! For instance: you guarded against reentrancy in key spots, implement the core separation of concerns between the Router and the Pair contracts, and calculated max slippage in a correct and user friendly way.

One thing I especially liked: you saved the constant product formula calculations into a separate function: `_calculateAmountOut`. This way, you call `swap()` with only the to address for simplicity. You also assume whatever ETH and SPC amounts a user sends into the the Pair contract are what they expect to receive a swap based on.

Great test coverage. You were around ~85% overall, so there is some room for improvement, but you hit the high notes. You are thorough to test both "sad" and "happy" paths, as well as all expected revert behavior. This definitely contributes to lower scores and helps you catch the outlier instances.

I've mentioned a few vulnerbalities and technical mistakes below, but I've also included a few stylistic recommendations that are hopefully helpful as you continue your journey as a Solidity engineer.

Overall: great work, and I hope you enjoyed this project. Any follow up questions, feel free to message me directly on Discord.

# Design Exercise

This is an interesting idea, I like it. As we've seen with some real world liquidity pools, providing additional incentive is key to attracting new liquidity and fostering community/reward amongst LPs. This is partly why Uniswap released their governance token, and how Sushi Swap gained users early on.

_To think about_

How would you award the ERC-20? Would it be based on just volume of liquidity added? If so, how would you control against people who add and remove liquidity repeatedly to "farm" the rewards tokens? If you took another route and rewarded based on _duration of liquidity provided_, meaning how long people kept their liquidity in, how might that work? What would the tradeoffs be?

# Issues

**[Extra Feature-1]** Redundant reentrancy guards

You include a reentrancy guards in your LPPair contract (`lock()`). You include guards on all of the functions that have any external calls: LiquidityPool: `mint()`, `burn()`, and `swap()`.

Reentrancy is a very serious vulnerability, especially when you're dealing with tokens/ETH, so this is great intuition.

However, in some of these cases, a reentrancy guard isn't needed. Reentrancy adds additional gas overhead to your protocol's function calls, and it's important to understand exactly when it's needed and when it isn't.

Whenever you make external calls that send eth (example: a `.call()`) and you don't implement the checks effects interaction pattern, a re-entrancy guard is needed. We don't know where the ETH is being sent to, and what it might trigger on receipt, so there is a risk for reentrancy. This means you do need a guard on the following functions: `burn()` and `swap()`.

However, for `mint()` you are only ever calling out to SpaceToken.sol, which you wrote and know does not have a re entrancy risk. You're trusting yourself that you wrote both contracts to always update state before making any other external calls. For this reason, you _do not_ need a reentrancy guard on the `mint()` function.

If you look at Uniswap's code, they do include reentrancy guards on all of their mint, burn, and swap functions in their Pair contract. The reason: their code must work for any arbitrary ERC-20 that someone creates a pool for. Uniswap can't vouch for the transfer() and transferFrom() functions in any new coin that creates a pool. This was actually an issue in Uniswap V1: https://medium.com/amber-group/preventing-re-entrancy-attacks-lessons-from-history-c2d96480fac3.

Consider removing reentrancy guards from your LPPair's `mint()` function.

**[Quality-1]** LPPair Contract gates function calls to onlyRouter

In your LPPair contract, you include an `onlyOwner()` style modifer (`isLPRouter()`) to external functions `mint()`, `burn()`, and `swap()` functions.

While this doesn't surface any vulnerabilities, it does undermines some of the intentions of separating the Router and Pair contracts.

Reasons why a Router/Pair contract separation is helpful:

1. **Shows a clever way to separate concerns within a single set of contracts:** the pair defends the core swap and constant product formula logic. It separates all of the input sanitation and possible user error (letting the Router handle that) so that the highest risk functions don't have added complexity.
2. **Shows a clever example of partial upgradability:** We can upgrade our router contract to include new features that don't require any changes in the core swap functionality if they aren't tied to one another. Uniswap has already done this in their V2 release by having mutliple router updates. Pretty cool. Because you gate your LPPair contract to only be called by the Router, any Router upgrades will also require a LPPair contract upgrade.

Consider not gating your LPPair contract to only be called by your Router.

# Nitpicks

- I liked how you combined your the two swap cases into a single function for both the Router and LPPair contracts. It makes for simplicity, smaller bytecode size, and better readability.
- Great intuition in minting a minimum liquidity for a new pool. Uniswap does this as well. That said, Uniswap does this to prevent the value of a single unit of LP token becoming so valuable it becomes prohibitively expensive to interact with the protocol. We do not need this for and ETH-SPC pool, because ETH, SPC, and the LP Token (assuming it inherits from OZ’s ERC20) all use 18 decimals and so the value of a single unit of either asset will be infinitesimally small.
- - Similar to constants, error strings are often written `LIKE_THIS` by convention. When a project has mutliple contracts that interact, it is also common to designate which contract the error is coming from for easier error tracing. Instead of `"Can only be called by creator"`, consider writing `Project.sol: ONLY_CALLABLE_BY_CREATOR`. Solidity has also recently introduced custom errors, which you can also use.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | 1     |
| Vulnerability              | -     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | -     |

Total: 1

Great job!
