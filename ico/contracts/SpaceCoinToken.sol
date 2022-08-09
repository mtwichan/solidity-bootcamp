pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./ICO.sol";

contract SpaceCoinToken is ERC20 {
    uint256 public constant CONTRACT_MINT_AMOUNT = 350000;
    uint256 public constant ICO_CONTRACT_MINT_AMOUNT = 150000;
    uint256 public constant MULTIPLIER = 10 ** 18;
    uint256 public constant TAX_RATE = 2;
    uint256 public treasuryOwing;
    address public contractOwner;
    address public treasuryAddress;
    ICO public ICOContract;
    bool public taxFlag;

    event TransferEvent(address indexed _to, address indexed _from, uint256 _amount, uint256 _treasuryAmount);
    event TransferFromEvent(address indexed _to, address indexed _from, address indexed _spender, uint256 _amount, uint256 _treasuryAmount);
    event TransferTreasuryEvent(address indexed _to, address indexed _from, uint256 _amount);
    event SetTaxFlagEvent(address indexed _sender, bool _currentTaxFlag);

    constructor(address _treasuryAddress) ERC20("SpaceCoin", "SPACE") {        
        contractOwner = msg.sender;
        treasuryAddress = _treasuryAddress;
        ICOContract = new ICO(msg.sender, address(this));
        _mint(contractOwner, CONTRACT_MINT_AMOUNT * (MULTIPLIER));
        _mint(address(ICOContract), ICO_CONTRACT_MINT_AMOUNT * (MULTIPLIER));
    }

    function transfer(address to, uint256 amount) public override returns(bool) {
        address owner = _msgSender();
        if (taxFlag) {
            treasuryOwing += (amount * TAX_RATE) / 100;
            amount = (amount * 98) / 100;
        }
        _transfer(owner, to, amount);
        emit TransferEvent(owner, to, amount, treasuryOwing);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {        
        address spender = _msgSender();       
        if (taxFlag) {
            treasuryOwing += (amount * TAX_RATE) / 100;
            amount = (amount * 98) / 100;
        }
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        emit TransferFromEvent(from, to, spender, amount, treasuryOwing);
        return true;
    }

    function transferTreasury() external returns (bool) {
        require(_msgSender() == contractOwner || _msgSender() == treasuryAddress, "Must be contract owner or treasury owner");
        require(treasuryOwing > 0, "Owed treasury amount must be greater than zero");       
        uint256 amount = treasuryOwing;
        treasuryOwing = 0;
        _transfer(contractOwner, treasuryAddress, amount);
        emit TransferTreasuryEvent(contractOwner, treasuryAddress, amount);
        return true;
    }

    function setTaxFlag(bool flagState) external returns (bool) {
        require(msg.sender == contractOwner, "Caller must be contract owner to run this function");
        taxFlag = flagState;
        emit SetTaxFlagEvent(msg.sender, taxFlag);
        return taxFlag;
    }
}