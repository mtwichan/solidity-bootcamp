## **[H-1]** There is no way to mark a project as "FAILED" in Project.sol contract. So user will not be able to withdraw their contribution even if the project cross 30 days deadline and didn't meet the goal.

**Bug Description:**
If a project is not funded after 30 days then user will just see an error message during withdraw or during contribution. On the other side owner will not be able to cancel the project due to isInDeadline modifier.

Consider: adding a logic to FAIL the project automatically.

## **[H-2]** Broken badge creation logic in Project.sol contract.

On line 38, Project.sol is missing a major requirement related to badge creation: `Each project should use its own NFT contract`.

**Bug Description:**
Token name & symbol are hard coded, hence every project will be using the same badge details.

Consider: accepting the token name & symbol as a parameter during project creation.

## **[M-1]** User cannot deposit to the contract address directly.

**Bug Description:**
If user try to deposit using sendTransaction method it might fail as there is no receive/ fallback method defined.

Consider: defining the receive/ fallback method and call contribute method from receive/ fallback method.

## **[QC-1]** Stakeholders will not be able to distinguise a FAILED & a CANCELLED project in future.

**Description:**
We are using same flag for FAILED & CANCELLED project. This way user will not be able to understand in future why the project was failed?

Consider: using a seperate flag/ status for cancel and add a log to mark the project as FAILED after 30 days.

## **[QC-2]** _contributors array is an extra variable in Project.sol contract.

**Description:**
On line number 83, Project.allocateFunds function: we declared a new memory variable i.e. _contributors. It requires some extra space in memory.

Consider: using the same storage variable unless that is creating another issue.

## **[QC-3]** For loop in allocateFunds function of Project.sol contract.

**Description:**
On line number 85, Project.allocateFunds function: a for loop is being used. If length is significantly high then it can take a lot of gas.

Consider: avoiding such a loop, especially when it can be very long.

## **[QC-4]** Payable keyword may not be required in withdraw & withdrawCreator function in Project.sol.

**Description:**
On line number 100 & 112, Project.withdrawCreator & Project.withdraw function are using payable keyword, which may not be required here.

Consider: using it if really required.

## **[QC-5]** Counters.sol maybe an unnecessary import.

**Description:**
On line number 4, Counters.sol was imported for tokenID generation only, which may not be good choice in this scenario.

Consider: using a storage variable [say counter] and increse it each time generating a badge.

## **[QC-6]** childrenContracts mapping variable maybe an unnecessary addition in ProjectFactory.sol contract.

**Description:**
On line number 6, ProjectFactory.sol contract is using childrenContracts mapping variable. This may not be gas efficient in few cases.

Consider: storing this kind of data in offchain [if possible].
