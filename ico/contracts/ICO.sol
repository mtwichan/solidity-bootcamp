pragma solidity ^0.8.4;

import "./SpaceCoinToken.sol";
import "hardhat/console.sol";

contract ICO {
    struct AccountBalance {
        uint256 generalBalance;
        uint256 totalBalance;
        bool isWhitelistMember;
    }
    enum State {SEED, GENERAL, OPEN, CLOSED}

    uint256 public constant GOAL = 30000 ether;
    uint256 public constant SEED_GOAL = 15000 ether;
    uint256 public constant SEED_INDIVIDUAL_LIMIT = 1500 ether;
    uint256 public constant GENERAL_INDIVIDUAL_LIMIT = 1000 ether;
    uint256 public constant MULTIPLIER = 10 ** 18;

    mapping (address => AccountBalance) public balances;
    uint256 public totalContribution;
    address public owner;
    bool public isContractPaused;
    SpaceCoinToken public spaceCoinToken;
    State public state;

    modifier isOwner {
        require(msg.sender == owner, "Caller must be contract owner");
        _;
    }

    modifier isPaused {
        require(isContractPaused == false, "Contract is currently paused");
        _;
    }

    modifier isMsgValueGTZero {
        require(msg.value > 0, "Sender did not send ETH with the function call");
        _;
    }

    event ToggleContractPauseEvent(address indexed _sender, bool _isContractPaused);
    event ContributeEvent(address indexed _sender, uint256 _contribution, uint256 _totalBalance, State _currentState);
    event RedeemTokensEvent(address indexed _sender, uint256 _redeemedTokens);
    event SetNextStateEvent(address indexed _sender, State _currentState);
    event SetWhitelistEvent(address indexed _sender, address[] indexed _whitelistMembers);
    event WithdrawEvent(address indexed _sender, uint256 _amountOwed, uint256 _totalContribution);

    constructor (address _owner, address _spaceCoinAddress) {
        owner = _owner;
        state = State.SEED;
        spaceCoinToken = SpaceCoinToken(_spaceCoinAddress);
    }

    function setWhitelist(address[] calldata _whitelistMembers) external isOwner isPaused {
        require(_whitelistMembers.length <= 1000, "The maximum amount of whitelist members that can be added per call is 1000");
        
        uint256 idx;
        for (idx = 0; idx < _whitelistMembers.length;) {
            address _whitelistAddress = _whitelistMembers[idx];
            balances[_whitelistAddress].isWhitelistMember = true;
            unchecked {
                ++idx;
            }
        }
        emit SetWhitelistEvent(msg.sender, _whitelistMembers);
    }

    function setNextState() external isOwner isPaused returns (State) {
        require(state != State.CLOSED, "Contract is already in CLOSED state");      
        if (state == State.SEED) {
            state = State.GENERAL;
        } else if (state == State.GENERAL) {
            state = State.OPEN;
        } else if (state == State.OPEN) {
            state = State.CLOSED;
        }
        emit SetNextStateEvent(msg.sender, state);
        return state;
    }

    function toggleContractPause() external isOwner returns (bool){
        isContractPaused = !isContractPaused;
        emit ToggleContractPauseEvent(msg.sender, isContractPaused);
        return isContractPaused;
    }

    function redeemTokens() public isPaused returns (uint256) {
        require(state == State.OPEN || state == State.CLOSED, "Contract must be in the OPEN or CLOSED state");
        require(balances[msg.sender].totalBalance > 0, "Sender is not owed any tokens");
        uint256 _totalBalance = balances[msg.sender].totalBalance;
        uint256 _amountOwing = _totalBalance * 5;
        balances[msg.sender].totalBalance = 0;

        bool result = spaceCoinToken.transfer(msg.sender, _amountOwing);
        require(result, "SpaceCoinToken transfer failed");
        emit RedeemTokensEvent(msg.sender, _amountOwing);
        return _amountOwing;
    }

    function withdraw() external isOwner {
        require(state == State.CLOSED, "Contract must be in the CLOSED state");
        require(totalContribution > 0, "Total contribution must be larger than zero");
        uint256 amountOwed = totalContribution;
        totalContribution = 0;
        (bool sent, ) = address(owner).call{value: amountOwed}("");
        require(sent, "Failed to send Ether");
        emit WithdrawEvent(msg.sender, amountOwed, totalContribution);                
    }

    function contribute() external payable isPaused isMsgValueGTZero {
        require(state != State.CLOSED, "Contract cannot be in the CLOSED state");
        require(msg.value + totalContribution <= GOAL, "Cannot contribute more than the goal");

        if (state == State.SEED) {
            require(balances[msg.sender].isWhitelistMember, "Sender must be on the whitelist");
            require(balances[msg.sender].totalBalance + msg.value <= SEED_INDIVIDUAL_LIMIT, "Sender seed round limit of 1500 ETH reached");
            totalContribution += msg.value;
            balances[msg.sender].totalBalance += msg.value;                            
            if (totalContribution >= SEED_GOAL) {
                state = State.GENERAL;
            }
        } 
        else if (state == State.GENERAL) {
            require(balances[msg.sender].generalBalance + msg.value <= GENERAL_INDIVIDUAL_LIMIT, "Sender general round limit of 1000 ETH reached"); 
            totalContribution += msg.value;
            balances[msg.sender].totalBalance += msg.value;                   
            balances[msg.sender].generalBalance += msg.value;
            if (totalContribution >= GOAL) {             
                state = State.OPEN;
            }
        } else if (state == State.OPEN) {
            totalContribution += msg.value;
            balances[msg.sender].totalBalance += msg.value;
            if (totalContribution >= GOAL) {
                state = State.CLOSED;            
            }
            redeemTokens();            
        }
        emit ContributeEvent(msg.sender, msg.value, totalContribution, state);
    }

    function getState() external view returns (uint256) {
        return uint256(state);
    }
}