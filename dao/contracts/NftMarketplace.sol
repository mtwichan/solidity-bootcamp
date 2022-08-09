pragma solidity ^0.8.4;

interface NftMarketplace {
    function getPrice(address nftContract, uint nftId) external returns (uint price);
    function buy(address nftContract, uint nftId) external payable returns (bool success);
}
