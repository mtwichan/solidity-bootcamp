pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SpaceCoin.sol";

contract ICO is Ownable {
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
    bool public isContractPaused;
    SpaceCoinToken public spaceCoinToken;
    State public state;

    modifier isPaused {
        require(isContractPaused == false, "ICO: Contract is currently paused");
        _;
    }

    modifier isMsgValueGTZero {
        require(msg.value > 0, "ICO: Sender did not send ETH with the function call");
        _;
    }

    event ToggleContractPauseEvent(address indexed _sender, bool _isContractPaused);
    event ContributeEvent(address indexed _sender, uint256 _contribution, uint256 _totalBalance, State _currentState);
    event RedeemTokensEvent(address indexed _sender, uint256 _redeemedTokens);
    event SetNextStateEvent(address indexed _sender, State _currentState);
    event SetWhitelistEvent(address indexed _sender, address[] indexed _whitelistMembers);
    event WithdrawEvent(address indexed _sender, uint256 _amountOwed, uint256 _totalContribution);

    constructor (address _owner, address _spaceCoinAddress) {
        transferOwnership(_owner);
        state = State.SEED;
        spaceCoinToken = SpaceCoinToken(_spaceCoinAddress);
    }

    function setWhitelist(address[] calldata _whitelistMembers) external onlyOwner isPaused {
        require(_whitelistMembers.length <= 1000, "ICO: The maximum amount of whitelist members that can be added per call is 1000");
        
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

    function setNextState() external onlyOwner isPaused returns (State) {
        require(state != State.CLOSED, "ICO: Contract is already in CLOSED state");      
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

    function toggleContractPause() external onlyOwner returns (bool){
        isContractPaused = !isContractPaused;
        emit ToggleContractPauseEvent(msg.sender, isContractPaused);
        return isContractPaused;
    }

    function redeemTokens() public isPaused returns (uint256) {
        require(state == State.OPEN || state == State.CLOSED, "ICO: Contract must be in the OPEN or CLOSED state");
        require(balances[msg.sender].totalBalance > 0, "ICO: Sender is not owed any tokens");
        uint256 _totalBalance = balances[msg.sender].totalBalance;
        uint256 _amountOwing = _totalBalance * 5;
        balances[msg.sender].totalBalance = 0;

        bool result = spaceCoinToken.transfer(msg.sender, _amountOwing);
        require(result, "ICO: SpaceCoinToken transfer failed");
        emit RedeemTokensEvent(msg.sender, _amountOwing);
        return _amountOwing;
    }

    function withdraw(address lpPairAddress) external onlyOwner {
        require(state == State.CLOSED, "ICO: Contract must be in the CLOSED state");
        uint256 ethOwing = totalContribution;
        uint256 tokenOwing = ethOwing * 5;
        totalContribution = 0;
        spaceCoinToken.transferLP(lpPairAddress, tokenOwing);
        (bool sent, ) = address(lpPairAddress).call{value: ethOwing}("");
        require(sent, "ICO: Failed to send Ether");
        emit WithdrawEvent(msg.sender, ethOwing, totalContribution);                
    }

    function contribute() external payable isPaused isMsgValueGTZero {
        require(state != State.CLOSED, "ICO: Contract cannot be in the CLOSED state");
        require(msg.value + totalContribution <= GOAL, "ICO: Cannot contribute more than the goal");

        if (state == State.SEED) {
            require(balances[msg.sender].isWhitelistMember, "ICO: Sender must be on the whitelist");
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