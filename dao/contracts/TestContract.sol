pragma solidity ^0.8.4;

import "./NftMarketplace.sol";

contract TestContract is NftMarketplace{
    uint256 public testNum = 0;

    function getAndIncrementTestNum() public returns (uint256) {
        testNum++;
        return testNum;
    }

    function passInNumAndIncrement(uint256 _passNum) public returns (uint256) {
        uint256 incrementNum = _passNum += 1;
        return incrementNum;
    }

    function getPrice(address nftContract, uint nftId) external override returns (uint) {
        return 1 ether;
    }

    function buy(address nftContract, uint nftId) external payable override returns (bool success) {
        return true;
    }
}