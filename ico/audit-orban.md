---
title: ICO project micro-audit for Matthew Chan
author: Ryan Orban
date: 7/10/2022
---

# [H-1] Tax is not applied to all transfers

In `SpaceCoinToken.sol`, the ERC20 `transferFrom()` method has been overridden to implement the tax. However, the new method calls non-existent function `spendAllowance()` which causes the transaction to fail. The ICO contract itself uses `transfer()` to distribute tokens, but any external calls trying to transfer tokens using `transferFrom()` will fail.

# [H-2] Investors can overshoot the total contribution limit for each phase

On lines 111-139 of ICO.sol, no checks are performed to ensure that a contribution will not exceed the overall contribution limit for a particular phase. Instead, a conditional checks if `totalContribution` has exceeded the phase goal and if true, automatically proceeds to the next stage:

    if (state == State.SEED) {
        ...
        if (totalContribution >= SEED_GOAL) {
            state = State.GENERAL;
        }

For example, let's assume we have a total contribution during the seed phase is 14,500 ether. A contributor could contribute 1500 ether (the individual limit for this phase) which would bring the total contribution to 16,000 ether, 1,000 ether _over_ the total seed phase limit of 15,000 ether.

# [H-3] Individual contributions limits are not inclusive across phases

On lines 127-128 of ICO.sol, the use of different accounting variables for each phase allows users to contribute 1,500 ether during the seed phase and an additional 1,000 ether during the general phase. This is because `totalBalance` is used during the seed phase and `generalBalance` is used during the general phase.

    balances[msg.sender].totalBalance += msg.value;
    balances[msg.sender].generalBalance += msg.value;

Said another way: during the seed phase, the value of the contribution is added to `balances[msg.sender].totalBalance` and `totalContribution`. The conditional then checks that the contribution is under the individual cap using `balances[msg.sender].totalBalance + msg.value <= SEED_INDIVIDUAL_LIMIT`.

During the general phase, however, the value of `balance[msg.sender].generalBalance` (which is initialized to zero) is used in lieu of `balance[msg.sender].totalBalance` to perform the individual limit check.

    require(balances[msg.sender].generalBalance + msg.value <= GENERAL_INDIVIDUAL_LIMIT,
    "Sender general round limit of 1000 ETH reached");

# [M-1] Tokens are not minted to the treasury

On lines 26-27 of `ICO.sol`, the following code is executed when calling the constructor:

    _mint(contractOwner, CONTRACT_MINT_AMOUNT * (MULTIPLIER));
    _mint(address(ICOContract), ICO_CONTRACT_MINT_AMOUNT * (MULTIPLIER));

As shown, 350k SPACE tokens are minted to the contract owner's address (`contractOwner`) instead of the treasury (`treasuryAddress`). This may have been intended behavior, but for clarity the tokens should be held by the SpaceCoinToken contract itself or sent to the treasury for later use.

---

_The following are all small nits:_

# [L-1] Withdraw function not in spec

On lines 137-148 in ICO.sol, a withdraw function is defined which allows the owner to withdraw all ether held by the contract. In general, this is a good idea so that the contract doesn't capture the ETH indefinitely, such a function was not called for in the project specifications.

# [L-2] Phase.CLOSED not in spec

Additionally, the addition of a fourth phase `Phase.CLOSED` is not in spec.

# [L-3] Owner should be able to add to whitelist when contract is paused

As stated, on lines 78-97 on ICO.sol, `setWhitelist()` can only be called if `isPaused` is false.
