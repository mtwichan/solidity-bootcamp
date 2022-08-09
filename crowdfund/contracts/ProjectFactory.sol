//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;
import "./Project.sol";

contract ProjectFactory {
    mapping(uint256 => Project) public childrenContracts;

    address public owner;
    uint256 public projectId;

    event CreateEvent(address indexed _sender, address indexed _project, uint _projectId); 

    constructor() {
        owner = msg.sender;
    }

    function create(uint256 _projectFundingGoal) external {
        require(_projectFundingGoal > 0 ether, "Project goal must be greater than 0 ETH");
        ++projectId;
 
        Project childContract = new Project(msg.sender, _projectFundingGoal);
        
        childrenContracts[projectId] = childContract;
        emit CreateEvent(msg.sender, address(childContract), projectId); 
    }
}
