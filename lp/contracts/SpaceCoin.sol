pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./ICO.sol";

contract SpaceCoinToken is ERC20 {
    uint256 public constant CONTRACT_MINT_AMOUNT = 350000;
    uint256 public constant ICO_CONTRACT_MINT_AMOUNT = 150000;
    uint256 public constant MULTIPLIER = 10 ** 18;
    uint256 public constant TAX_RATE = 2;
    address public contractOwner;
    address public treasuryAddress;
    ICO public ICOContract;
    bool public taxFlag;

    event TransferTreasuryEvent(address indexed _to, address indexed _from, uint256 _amount);
    event SetTaxFlagEvent(address indexed _sender, bool _currentTaxFlag);
    event TransferLPEvent(address indexed _sender, address indexed _lpPairAddress, uint256 _amount);
    
    constructor(address _treasuryAddress) ERC20("SpaceCoin", "SPACE") {        
        contractOwner = msg.sender;
        treasuryAddress = _treasuryAddress;
        ICOContract = new ICO(msg.sender, address(this));
        _mint(treasuryAddress, CONTRACT_MINT_AMOUNT * (MULTIPLIER));
        _mint(address(ICOContract), ICO_CONTRACT_MINT_AMOUNT * (MULTIPLIER));
    }

    function _transfer(address _sender, address _recipient, uint256 _amount) internal virtual override {
        if (taxFlag) {
            uint256 treasuryOwing = (_amount * TAX_RATE) / 100;
            _amount = (_amount * 98) / 100;
            super._transfer(_sender, treasuryAddress, treasuryOwing);
        }
        super._transfer(_sender, _recipient, _amount);
    }

    function transferLP(address _lpPairAddress, uint256 _amount) external returns (bool) {
        require(_msgSender() == address(ICOContract) , "Must be contract owner");
        require(_amount <= 150000 * 10 ** 18, "Amount must be less than 150K Space Tokens");
        
        super._transfer(treasuryAddress, _lpPairAddress, _amount);
        emit TransferLPEvent(msg.sender, _lpPairAddress, _amount);
        return true;
    }

    function setTaxFlag(bool _flagState) external returns (bool) {
        require(msg.sender == contractOwner, "Caller must be contract owner to run this function");
        taxFlag = _flagState;
        emit SetTaxFlagEvent(msg.sender, taxFlag);
        return taxFlag;
    }
}