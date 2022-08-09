pragma solidity ^0.8.9;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

/// @title Airdrop
/// @author Melvillian
/// @notice A contract for airdropping MACRO token which allows claimers to claim
/// their tokens using either signatures, or a Merkle proof. Once quantum computers
/// have broken ECDSA, an owner can turn off the ability to verify using ECDSA signatures
/// leaving only Merkle proof verification (which uses cryptographic hash functions resistant
/// to quantum computers).
contract Airdrop is Ownable {

    /// @notice Address of the MACRO ERC20 token
    IERC20 public immutable macroToken;

    /// @notice A merkle proof used to prove inclusion in a set of airdrop recipient addresses.
    /// Claimers can provide a merkle proof using this merkle root and claim their airdropped
    /// tokens
    bytes32 public immutable merkleRoot;

    /// @notice The address whose private key will create all the signatures which claimers
    /// can use to claim their airdropped tokens
    address public immutable signer;

    /// @notice true if a claimer is able to call `Airdrop.signatureClaim` without reverting, false otherwise.
    /// False by default
    /// @dev We could call this `isECDSAEnabled`, but then we would waste gas first setting it to true, only
    /// later to set it to false. With the current variable name we only use a single SSTORE going from false -> true
    bool public isECDSADisabled;

    /// @notice A mapping to keep track of which addresses
    /// have already claimed their airdrop
    mapping(address => bool) public alreadyClaimed;

    /// @notice the EIP712 domain separator for claiming MACRO
    bytes32 public immutable EIP712_DOMAIN;

    /// @notice EIP-712 typehash for claiming MACRO
    bytes32 public constant SUPPORT_TYPEHASH = keccak256("Claim(address claimer,uint256 amount)");

    /// @notice Sets the necessary initial claimer verification data
    constructor(bytes32 _root, address _signer, IERC20 _macroToken) {
        merkleRoot = _root;
        signer = _signer;
        macroToken = _macroToken;

        EIP712_DOMAIN = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("Airdrop")),
            keccak256(bytes("v1")),
            block.chainid,
            address(this)
        ));
    }

    /// @notice Allows a msg.sender to claim their MACRO token by providing a
    /// signature signed by the `Airdrop.signer` address.
    /// @dev An address can only claim its MACRO once
    /// @dev See `Airdrop.toTypedDataHash` for how to format the pre-signed data
    /// @param signature An array of bytes representing a signature created by the
    /// `Airdrop.signer` address
    /// @param _to The address the claimed MACRO should be sent to
    /// @param _amount The amount of MACRO to claim
    function signatureClaim(bytes memory signature, uint256 _amount, address _to) external returns (address publicKey) {
        require(!isECDSADisabled, "SIGS_DISABLED");
        // TODO implement me!
        require(alreadyClaimed[_to] == false, "Airdrop: provided address has already claimed");
        require(_amount <= macroToken.totalSupply(), "Airdrop: MacroToken amount must be less than the total supply");
        require(signature.length == 65, "Airdrop: Ensure signature is passed in");
        bytes32 message = toTypedDataHash(_to, _amount);        
        
        uint8 v;
        bytes32 r;
        bytes32 s;
        
        assembly {
            v := byte(0, mload(add(signature, 96)))
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))            
        }

        publicKey = ecrecover(message, v, r, s);
        require(publicKey != address(0), "Airdrop: address cannot be zero");
        require(publicKey == signer, "Airdrop: invalid signer");  
        alreadyClaimed[_to] = true;
        macroToken.transfer(_to, _amount);
        
        emit SignatureClaimEvent(publicKey, _amount, _to);      
    }

    /// @notice Allows a msg.sender to claim their MACRO token by providing a
    /// merkle proof proving their address is indeed committed to by the Merkle root
    /// stored in `Airdrop.merkleRoot`
    /// @dev An address can only claim its MACRO once
    /// @dev See `Airdrop.toLeafFormat` for how to format the Merkle leaf data
    /// @param _proof An array of keccak hashes used to prove msg.sender's address
    /// is included in the Merkle tree represented by `Airdrop.merkleRoot`
    /// @param _to The address the claimed MACRO should be sent to
    /// @param _amount The amount of MACRO to claim
    function merkleClaim(bytes32[] calldata _proof, address _to, uint256 _amount) external {
        // TODO implement me!
        require(alreadyClaimed[_to] == false, "Airdrop: provided address has already claimed");
        require(_amount <= macroToken.totalSupply(), "Airdrop: MacroToken amount must be less than the total supply");
        bytes32 leafHash = toLeafFormat(_to, _amount);
        uint256 idx;
        bytes32 proof;
        for (idx = 0; idx < _proof.length; idx++) {
            proof = _proof[idx];
            leafHash = leafHash <= proof ? keccak256(abi.encode(leafHash, proof)) : keccak256(abi.encode(proof, leafHash));
        }
        require(leafHash == merkleRoot, "Airdrop: Computed hash must match merkle root");
        alreadyClaimed[_to] = true;
        macroToken.transfer(_to, _amount);
        emit MerkleClaimEvent(leafHash, _amount, _to);
    }

    /// @notice Causes `Airdrop.signatureClaim` to always revert
    /// @notice Should be called when the owner learns offchain that quantum
    /// computers have advanced to the point of breaking ECDSA, and thus the
    /// `Airdrop.signatureClaim` function is insecure
    function disableECDSAVerification() external onlyOwner {
        isECDSADisabled = true;
        emit ECDSADisabled(msg.sender);
    }

    /// @dev Helper function for formatting the claimer data in an EIP-712 compatible way
    /// @param _recipient The address which will receive MACRO from a successful claim
    /// @param _amount The amount of MACRO to be claimed
    /// @return A 32-byte hash, which will have been signed by `Airdrop.signer`
    function toTypedDataHash(address _recipient, uint256 _amount) internal view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(SUPPORT_TYPEHASH, _recipient, _amount));
        return ECDSA.toTypedDataHash(EIP712_DOMAIN, structHash);
    }

    /// @dev Helper function for formatting the claimer data stored in a Merkle tree leaf
    /// @param _recipient The address which will receive MACRO from a successful claim
    /// @param _amount The amount of MACRO to be claimed
    /// @return A 32-byte hash, which is one of the leaves of the Merkle tree represented by
    /// `Airdrop.merkleRoot`
    function toLeafFormat(address _recipient, uint256 _amount) internal pure returns (bytes32) {
        return keccak256(bytes(abi.encode(_recipient, _amount)));
    }

    event SignatureClaimEvent(address indexed _publicKey, uint256 _amount, address indexed _to);
    event MerkleClaimEvent(bytes32 _computedHash, uint256 _amount, address indexed _to);
    event ECDSADisabled(address owner);
}