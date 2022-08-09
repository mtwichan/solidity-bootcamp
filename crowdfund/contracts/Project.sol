pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Project is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    address public owner;
    uint256 public fundingGoal;
    uint256 public totalContribution;
    uint256 public deadline;
    address[] public contributors;
    mapping(address => uint256) public amountOwing;
    mapping(address => uint256) public amountNFTOwing;
    enum State {RUNNING, FAILED, SUCCESSFUL}
    State public projectState;
    event ContributeEvent(address indexed _sender, uint256 _contribution, uint256 _totalContribution);
    event CancelCrowdfundEvent(address indexed _sender, State _projectState);
    event WithdrawCreatorEvent(address indexed _sender, uint256 _amountWithdrawn, uint256 _totalContribution);
    event WithdrawEvent(address indexed _sender, uint256 _amountWithdrawn, uint256 _amountRemaining);

    modifier isOwner() {
        require(msg.sender == owner, "Function can only be called by owner");
        _;
    }

    modifier isInDeadline() {
        require(block.timestamp <= deadline, "Crowdfunding is past deadline of 30 days");
        _;
    }

    modifier isNotNullAddress() {
        require(msg.sender != address(0), "Address cannot be 0x");
        _;
    }

    constructor(address _projectOwner, uint256 _fundingGoal) ERC721("BadgeNFT", "BNFT") {
        owner = _projectOwner;
        fundingGoal = _fundingGoal;
        deadline = block.timestamp + 30 days;
        projectState = State.RUNNING;
    }

    function mintBadge(address _sender) public {
        require(amountNFTOwing[_sender] >= 1, "Must be owed 1 or more NFT badges");

        uint256 newItemId;
        _tokenIds.increment();
        newItemId = _tokenIds.current();
        amountNFTOwing[_sender] -= 1;
        _safeMint(_sender, newItemId);
    }

    function contribute() public payable isInDeadline  {
        require(projectState == State.RUNNING, "Project must be in the running state");
        require(msg.value >= 0.01 ether, "Contribution must be larger than 0.01 ETH");
        
        if (amountOwing[msg.sender] == 0) {            
            contributors.push(msg.sender);
        }

        amountOwing[msg.sender] += msg.value; 
        totalContribution += msg.value;
        amountNFTOwing[msg.sender] = (amountOwing[msg.sender] / 10 ** 18) - balanceOf(msg.sender);
        
        if (totalContribution >= fundingGoal) {
            projectState = State.SUCCESSFUL;
        }
        
        if (amountNFTOwing[msg.sender] >= 1) {
            mintBadge(msg.sender);
        }
        
        emit ContributeEvent(msg.sender, msg.value, amountOwing[msg.sender]);
    }

    function allocateFunds() public isOwner {
        require(projectState == State.SUCCESSFUL, "Project must be in the successful state");
        require(totalContribution > 0, "Total contribution must be greater than zero");

        uint256 length = contributors.length;
        address[] memory _contributors = contributors;

        for (uint256 idx = 0; idx < length;) {
            delete amountOwing[_contributors[idx]];
            ++idx;
        }

        amountOwing[owner] = totalContribution;
        delete totalContribution;
    }

    function cancelCrowdfund() public isOwner isInDeadline isNotNullAddress {
        require(projectState == State.RUNNING, "Project must be in the running state");
        projectState = State.FAILED;
        emit CancelCrowdfundEvent(msg.sender, projectState);
    }

    function withdraw() payable public isNotNullAddress {
        require(projectState == State.FAILED, "Project must be in the failed state");
        require(amountOwing[msg.sender] > 0, "Amount owed to sender must be greater than zero");

        uint256 amountOwed = amountOwing[msg.sender];        
        amountOwing[msg.sender] = 0;
        totalContribution -= amountOwed;
        (bool sent, ) = payable(msg.sender).call{value: amountOwed}("");
        require(sent, "Failed to send Ether");
        emit WithdrawEvent(msg.sender, amountOwed, totalContribution);
    }

    function withdrawCreator(uint256 _amount) payable public isOwner {
        require(projectState == State.SUCCESSFUL, "Project must be in the successful state");
        require(totalContribution == 0, "Total contribution must be zero, have you ran allocateFunds yet?");
        require(_amount <= amountOwing[owner], "Amount withdrawn must be less than or equal to amount owed");
        
        amountOwing[owner] -= _amount;
        (bool sent, ) = payable(owner).call{value: _amount}("");
        require(sent, "Failed to send Ether");
        emit WithdrawCreatorEvent(owner, _amount, amountOwing[owner]);
    }
    
}
