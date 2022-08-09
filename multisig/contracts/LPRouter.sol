//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./LPPair.sol";
import "./SpaceCoin.sol";

contract LPRouter is Ownable {
    LPPair lpPairContract;
    SpaceCoinToken spaceCoinTokenContract;
    address lpPairAddress;
    address spaceCoinTokenAddress;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transferFrom(address,address,uint256)'))); // Taken from UNISWAP V2
    
    event AddLiquidityEvent(address indexed _sender, uint256 _amountETH, uint256 _amountSpaceCoinToken);
    event RemoveLiquidityEvent(address indexed _sender, uint256 _liquidity);
    event SwapTokensEvent(address indexed _sender, uint256 _amountETHOut, uint256 _amountSpaceCoinTokenOut);

    constructor(address _owner, address _spaceCoinTokenAddress) {
        transferOwnership(_owner);
        lpPairContract = LPPair(payable(msg.sender));
        spaceCoinTokenContract = SpaceCoinToken(_spaceCoinTokenAddress);
        spaceCoinTokenAddress = _spaceCoinTokenAddress;
        lpPairAddress = msg.sender;
    }

    function _safeTransferFrom(address token, address _from, address _to, uint256 _value) private {
        // Taken from UNISWAP V2 in order to do error checking on transferFrom function
        // Hard coded SPCT address
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, _from, _to, _value));        
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'LPRouter: Safe transferFrom failed');
    }

    function addLiquidity(
        uint256 _amountETH,
        uint256 _amountSpaceCoinToken
    ) external payable returns(uint256 liquidity) {
        require(msg.value == _amountETH, "LPRouter: Amount of ETH specified must be equal to msg.value"); // Prevent mistakes sending ETH using function params too
        _safeTransferFrom(spaceCoinTokenAddress, msg.sender, lpPairAddress, _amountSpaceCoinToken);
        (bool success, ) = address(lpPairAddress).call{value: _amountETH}("");
        require(success, "LPRouter: Failed to send Ether");
        liquidity = lpPairContract.mint(msg.sender);
        require(liquidity > 0, "LPRouter: zero liquidity generated");
        emit AddLiquidityEvent(msg.sender, _amountETH, _amountSpaceCoinToken);
    }

    function removeLiquidity(uint256 _liquidity) external {
        _safeTransferFrom(lpPairAddress, msg.sender, lpPairAddress, _liquidity);
        lpPairContract.burn(msg.sender);
        emit RemoveLiquidityEvent(msg.sender, _liquidity);
    }

    function swapTokens(uint256 _amountETHOut, uint256 _amountSpaceCoinTokenOut, uint256 _amountETHOutMin, uint256 amountSpaceTokenOutMin) external payable {
        require((_amountETHOut > 0 && msg.value > 0) || _amountSpaceCoinTokenOut > 0, "LPRouter: ETH or SpaceCoinTokenOut must be greater than zero");

        if (_amountSpaceCoinTokenOut > 0) {
            _safeTransferFrom(spaceCoinTokenAddress, msg.sender, lpPairAddress, _amountSpaceCoinTokenOut);
        }

        if (_amountETHOut > 0) {
            (bool success,) = address(lpPairAddress).call{ value: msg.value }("");
            require(success, "LPRouter: sending ETH from swapTokens failed");
        }
        uint256 amountSpaceCoinTokenOutFinal;
        uint256 amountETHFinal;

        (amountSpaceCoinTokenOutFinal, amountETHFinal) = lpPairContract.swap(msg.sender);
        // Slippage -> swap must be above threshold, also taking into account fees as well
        require(amountSpaceCoinTokenOutFinal >= amountSpaceTokenOutMin && amountETHFinal >= _amountETHOutMin, "LPRouter: Slippage threshhold reached");
        emit SwapTokensEvent(msg.sender, _amountETHOut, _amountSpaceCoinTokenOut);
    }

    function getSwapAmount(uint256 amountETH, uint256 amountSpaceCoinToken, bool isFeeOn) external returns (uint256 swapOut) {
        (uint256 _reserveETH, uint256 _reserveSpaceCoinToken) = lpPairContract.getReserves();
        require(_reserveETH > 0 && _reserveSpaceCoinToken > 0, "LPRouter: Reserve is empty");
        uint256 k = _reserveETH * _reserveSpaceCoinToken;
        uint256 fee;
        if (amountETH > 0) {
            if (isFeeOn) {                
                fee = amountETH / 100; // 1% fee
            }
            swapOut = _reserveETH - (k / (_reserveSpaceCoinToken + amountETH - fee));
        } else {
            if (isFeeOn) {                
                fee = amountSpaceCoinToken / 100; // 1% fee
            }
            swapOut = _reserveSpaceCoinToken - (k / (_reserveETH + amountETH - fee));
        }
    }
}
