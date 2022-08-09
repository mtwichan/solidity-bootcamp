//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SpaceCoin.sol";
import "./LPRouter.sol";

contract LPPair is ERC20 {
    uint256 public constant MINIMUM_LIQUIDITY = 10 ** 3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)'))); 
    address public lpRouterAddress;
    address public spaceCoinTokenAddress;
    uint256 public reserveSpaceCoinToken;
    uint256 public reserveETH;
    uint256 public totalETH;
    uint256 private lockState;
    SpaceCoinToken public spaceCoinTokenContract;
    LPRouter public lpRouterContract;

    modifier lock() {
        require(lockState != 1, "LPPair: Currently locked");
        lockState = 1;
        _;
        lockState = 2;
    }

    modifier isLPRouter() {
        require(msg.sender == address(lpRouterContract));
        _;
    }

    event MintEvent(address indexed _receiver, uint256 _amountSpaceCoinToken, uint256 _amountETH);
    event BurnEvent(address indexed _receiver, uint256 _amountSpaceCoinToken, uint256 _amountETH);
    event SwapEvent(address indexed _receiver, uint256 _amountETHFees, uint256 _amountSpaceCoinTokenFees);
    event SyncEvent(uint256 _reserveSpaceCoinToken, uint256 _reserveETH);
    
    constructor(address _spaceCoinTokenAddress) ERC20("LP Token", "LPT") {
        lpRouterContract = new LPRouter(_spaceCoinTokenAddress);
        spaceCoinTokenContract = SpaceCoinToken(_spaceCoinTokenAddress);
        spaceCoinTokenAddress = _spaceCoinTokenAddress;
        lockState = 2;
    }

    function _sync(uint256 _balanceSpaceToken, uint256 _balanceETH) private {
        reserveSpaceCoinToken = _balanceSpaceToken;
        reserveETH = _balanceETH;
        emit SyncEvent(reserveSpaceCoinToken, reserveETH);
    }

    function _safeTransfer(address _contractAddress, address _to, uint _value) private {
        // Taken from UNISWAP V2 in order to do error checking on transfer function
        (bool success, bytes memory data) = _contractAddress.call(abi.encodeWithSelector(SELECTOR, _to, _value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'LPPair: Safe transfer failed');
    }

    function _calculateAmountOut(uint256 _reserveTokenX, uint256 _reserveTokenY, uint256 _amountTokenX) private returns (uint256 _amountOutY) {
        uint256 k = _reserveTokenX * _reserveTokenY;
        uint256 fee = _amountTokenX / 100;
        uint256 denominator = _reserveTokenX + _amountTokenX - fee;
        uint256 reserveTokenFee = k / denominator;
        _amountOutY = _reserveTokenY - reserveTokenFee; 
        require(_amountOutY > 0, "LPPair: Amount out with fees must be greater than zero");
        return _amountOutY;
    }

    function getReserves() public returns (uint256 _reserveETH, uint256 _reserveSpaceCoinToken){
        return (reserveETH, reserveSpaceCoinToken);
    }

    function swap(address _receiver) external lock isLPRouter returns (uint256 amountSpaceCoinTokenOutFees, uint256 amountETHFees) {
        (uint256 _reserveETH, uint256 _reserveSpaceCoinToken) = getReserves();
        uint256 amountETHOut = totalETH - _reserveETH;
        uint256 amountSpaceCoinTokenOut = spaceCoinTokenContract.balanceOf(address(this)) - _reserveSpaceCoinToken;
        
        require(amountSpaceCoinTokenOut > 0 || amountETHOut > 0, "LPPair: One of the output amounts must be greater than zero");
        require(amountETHOut < _reserveETH && amountSpaceCoinTokenOut < _reserveSpaceCoinToken, "LPPair: Output parameters greater than reserve amount");

        if (amountSpaceCoinTokenOut > 0) {
            amountETHFees = _calculateAmountOut(_reserveSpaceCoinToken, _reserveETH, amountSpaceCoinTokenOut);
            reserveETH = _reserveETH - amountETHFees;
            totalETH -= amountETHFees;
            (bool success, ) = _receiver.call{value: amountETHFees}("");
            require(success, "LPPair: call function to reciever failed");            
        }

        if (amountETHOut > 0) {
            amountSpaceCoinTokenOutFees = _calculateAmountOut(_reserveETH, _reserveSpaceCoinToken, amountETHOut);
            reserveSpaceCoinToken = _reserveSpaceCoinToken - amountSpaceCoinTokenOutFees;
            _safeTransfer(spaceCoinTokenAddress, _receiver, amountSpaceCoinTokenOutFees);
        }

        uint256 balanceETH = totalETH;
        uint256 balanceSpaceCoinToken = spaceCoinTokenContract.balanceOf(address(this));
        _sync(balanceETH, balanceSpaceCoinToken);        
        emit SwapEvent(_receiver, amountETHFees, amountSpaceCoinTokenOutFees);
    }

    function mint(address _receiver) external lock isLPRouter returns (uint256 liquidity) {
        (uint256 _reserveETH, uint256 _reserveSpaceCoinToken) = getReserves();
        uint256 balanceETH = totalETH;
        uint256 balanceSpaceCoinToken = spaceCoinTokenContract.balanceOf(address(this));
        uint256 amountSpaceToken = balanceSpaceCoinToken - _reserveSpaceCoinToken;
        uint256 amountETH = balanceETH - _reserveETH;
        uint256 _totalLPToken = totalSupply();

        if (_totalLPToken <= 0) {
            liquidity = _sqrt(amountSpaceToken * amountETH) - MINIMUM_LIQUIDITY;
            _mint(address(1), MINIMUM_LIQUIDITY);
        } else {
            uint256 liquiditySpaceCoinToken = amountSpaceToken * _totalLPToken / _reserveSpaceCoinToken;
            uint256 liquidityETH = amountETH * _totalLPToken / _reserveETH;

            if (liquiditySpaceCoinToken < liquidityETH) {
                liquidity = liquiditySpaceCoinToken;
            } else {
                liquidity = liquidityETH;
            }
        }

        require(liquidity > 0, "LPPair: liquidity must be greater than zero");
        _mint(_receiver, liquidity);
        _sync(balanceSpaceCoinToken, balanceETH);
        emit MintEvent(_receiver, amountSpaceToken, amountETH);
    }

    function burn(address _receiver) external lock isLPRouter returns(uint256 amountSpaceToken, uint256 amountETH) {        
        uint256 liquidity = balanceOf(address(this));
        require(liquidity > 0, "LPPair: Liquidity is currently 0");        
        
        uint256 _totalLPToken = totalSupply();
        amountSpaceToken = (liquidity * reserveSpaceCoinToken) / _totalLPToken;
        amountETH = (liquidity * reserveETH) / _totalLPToken;
        require(amountSpaceToken > 0 && amountETH > 0, "LPPair: Zero or less liquidity burned");
        
        _burn(address(this), liquidity);
        totalETH -= amountETH;
        _safeTransfer(spaceCoinTokenAddress, _receiver, liquidity);
        (bool success, ) = address(_receiver).call{value: amountETH}("");
        require(success, "LPPair: Failed to send Ether");

        uint256 balanceSpaceCoinToken = spaceCoinTokenContract.balanceOf(address(this));
        _sync(balanceSpaceCoinToken, totalETH);
        emit BurnEvent(_receiver, amountSpaceToken, amountETH);
    }
    
    function _sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    receive() external payable {
        require(msg.value > 0, "LPPair: receive() msg.value is zero");
        totalETH += msg.value;
    }
 }
