pragma solidity ^0.8.4;

import "./NftMarketplace.sol";

contract CollectorDAO {
    uint256 public constant MEMBERSHIP_COST = 1 ether; 
    uint256 public constant TIME_PERIOD = 5 days;
    bytes32 constant SALT = 0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a558;
    string public constant NAME = "CollectorDAO";
    bytes32 private constant EIP712_DOMAIN  = keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract,bytes32 salt)");
    bytes32 private constant VOTE_TYPE_HASH = keccak256("Vote(uint256 proposalId,uint8 support)");
    uint256 public numberOfMembers = 0;

    mapping (address => bool) public members;
    mapping (uint256 => Proposal) public proposals; 
    bool executeLock;
    enum ProposalState {
        EXECUTED,
        ACTIVE,
        DEFEATED,
        SUCCEEDED
    }
    enum Vote {
        FOR_VOTE,
        AGAINST_VOTE,
        ABSTAIN_VOTE
    }
    struct Proposal {
        uint256 id;        
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        address proposer;
        bytes32 description;
        mapping(address => bool) voters;
        ProposalState proposalState;        
    }

    event ProposeEvent(address indexed _sender, uint256 indexed _id, uint256 _startBlock, uint256 _endBlock, bytes32 indexed _description, ProposalState _proposalState);
    event BecomeMemberEvent(address indexed _sender, uint256 _amountOfMembers);
    event ExecuteEvent(address indexed _sender, uint256 _proposalId, ProposalState _proposalState);
    event CastVoteEvent(address indexed _sender, uint256 _proposalId, uint8 _support);

    function state(uint256 proposalId) public returns (ProposalState) {        
        Proposal storage p = proposals[proposalId];
        require(p.endBlock != 0 && p.startBlock != 0, "Selected proposalId has not been initialized");

        if (p.proposalState == ProposalState.EXECUTED) {
            return p.proposalState; 
        }                
        
        if (p.endBlock >= block.timestamp) {
            p.proposalState = ProposalState.ACTIVE;
            return p.proposalState;            
        } 
        else {            
            if (_quorumReached(proposalId) && _voteSucceeded(proposalId)) {
                p.proposalState = ProposalState.SUCCEEDED;
                return p.proposalState;            
            } 
            else {
                p.proposalState = ProposalState.DEFEATED;
                return p.proposalState;
            }
        }         
    }

    function _quorumReached(uint256 proposalId) internal view returns (bool) {
        Proposal storage p = proposals[proposalId];
        uint256 total = p.forVotes + p.againstVotes + p.abstainVotes;
        uint256 quorum = numberOfMembers * 25 / 100;

        if (total >= quorum && (total * 4 >= numberOfMembers)) {
            return true;
        } else {
            return false;
        }
    }

    function _voteSucceeded(uint256 proposalId) internal view returns (bool) {
        Proposal storage p = proposals[proposalId];
        if (p.forVotes >= p.againstVotes) {
            return true;
        } else {
            return false;
        }
    }
    
    function becomeMember() external payable {
        require(msg.value == 1 ether, "Sender must send exactly 1 ETH to become a member");
        require(!members[msg.sender], "Sender is already a member");
        ++numberOfMembers;
        members[msg.sender] = true;
        emit BecomeMemberEvent(msg.sender, numberOfMembers);
    }
    
    function propose(address[] memory targets, string[] memory signatures, uint[] memory values, bytes[] memory calldatas, bytes32 description) external returns (uint) {
        require(members[msg.sender], "Must be a member of the DAO to propose");
        require((targets.length == values.length) && (targets.length == calldatas.length), "Invalid proposal length");
        require(targets.length > 0, "Empty proposal");

        uint256 newProposalID = hashProposalID(targets, signatures, values, calldatas);
        Proposal storage newProposal = proposals[newProposalID];
        require(newProposal.id == 0, "Proposal already exists");

        uint256 startBlock = block.timestamp;
        uint256 endBlock = startBlock + TIME_PERIOD;

        newProposal.id = newProposalID;
        newProposal.proposer = msg.sender;
        newProposal.startBlock = startBlock;
        newProposal.endBlock = endBlock;
        newProposal.description = description;
        newProposal.proposalState = ProposalState.ACTIVE;
        emit ProposeEvent(msg.sender, newProposal.id, startBlock, endBlock, description, newProposal.proposalState);
        return newProposalID;    
    }

    
    function execute(address[] memory targets, string[] memory signatures, uint[] memory values, bytes[] memory calldatas) external payable returns (ProposalState, uint256) {
        require(members[msg.sender], "Must be a member of the DAO to execute");
        uint256 proposalId = hashProposalID(targets, signatures, values, calldatas);
        Proposal storage p = proposals[proposalId];
        executeLock = true;
        if (state(proposalId) == ProposalState.SUCCEEDED) {
            require(state(proposalId) == ProposalState.SUCCEEDED, "Proposal must be in succeeded state to execute");                        
            bytes memory callData;
            for (uint256 idx = 0; idx < targets.length; ++idx) {
                if (bytes(signatures[idx]).length == 0) {
                    callData = calldatas[idx];
                } else {
                    callData = abi.encodePacked(bytes4(keccak256(bytes(signatures[idx]))), calldatas[idx]);
                }

            (bool success, bytes memory returnData) = targets[idx].call{value: values[idx]}(callData);
            if (!success) {                
                // failed without revert message
                if (returnData.length < 68) {
                    revert('Transaction reverted silently');
                }   
                assembly {
                    returnData := add(returnData, 0x04)
                }
                revert(abi.decode(returnData, (string)));
                }
            }
            p.proposalState = ProposalState.EXECUTED;
            executeLock = false;
            emit ExecuteEvent(msg.sender, proposalId, p.proposalState);
            return (p.proposalState, proposalId);
        } else {
            executeLock = false;
            emit ExecuteEvent(msg.sender, proposalId, p.proposalState);
            return (p.proposalState, proposalId);
        }
    }


    function castVote(uint256 proposalId, Vote support) external {
        Proposal storage p = proposals[proposalId];
        require(members[msg.sender], "Must be a member of the DAO to execute");
        require(state(proposalId) == ProposalState.ACTIVE, "Proposal must be in the active state");
        require(p.id != 0, "Proposal does not exist");
        require(p.voters[msg.sender] == false, "Caller has already voted");

        if (support == Vote.FOR_VOTE) {
            p.forVotes += 1;
        } else if (support == Vote.AGAINST_VOTE) {
            p.againstVotes += 1;
        } else {
            p.abstainVotes += 1;
        }
        p.voters[msg.sender] = true;
    }

    
    function castVoteBySig(uint256 proposalId, uint8 support, uint8 v, bytes32 r, bytes32 s) external {
        bytes32 domainSeparator = keccak256(abi.encode(EIP712_DOMAIN, keccak256("CollectorDAO"), block.chainid, address(this), SALT));
        bytes32 voteHash = keccak256(abi.encode(VOTE_TYPE_HASH, proposalId, support));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, voteHash));
        address signer = ecrecover(digest, v, r, s);
        
        require(signer != address(0), "Signature is zero, thus invalid");
        Proposal storage p = proposals[proposalId];
        require(members[signer], "Must be a member of the DAO to execute");
        require(state(proposalId) == ProposalState.ACTIVE, "Proposal must be in the active state");
        require(p.id != 0, "Proposal does not exist");
        require(p.voters[signer] == false, "Caller has already voted");
        Vote userVote = Vote(support);

        if (userVote == Vote.FOR_VOTE) {
            p.forVotes += 1;
        } else if (userVote == Vote.AGAINST_VOTE) {
            p.againstVotes += 1;
        } else {
            p.abstainVotes += 1;
        }
        p.voters[signer] = true;
        emit CastVoteEvent(msg.sender, proposalId, support);
    }

    function _castVoteBySigGroup(uint256 proposalId, uint8 support, uint8 v, bytes32 r, bytes32 s) internal returns (string memory) {
        bytes32 domainSeparator = keccak256(abi.encode(EIP712_DOMAIN, keccak256("CollectorDAO"), block.chainid, address(this), SALT));
        bytes32 voteHash = keccak256(abi.encode(VOTE_TYPE_HASH, proposalId, support));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, voteHash));
        address signer = ecrecover(digest, v, r, s);
        
        if(signer == address(0)) {return "SIGNER_IS_ZERO";}
        Proposal storage p = proposals[proposalId];
        if(members[signer] == false) {return "SIGNER_IS_NOT_MEMBER";}
        if(state(proposalId) != ProposalState.ACTIVE) {return "PROPOSAL_NOT_IN_ACTIVE_STATE";}
        if(p.id == 0) {return "PROPOSAL_ID_ZERO";}
        if(p.voters[signer] == true) {return "SIGNER_ALREADY_VOTED";}
        
        Vote userVote = Vote(support);
        if (userVote == Vote.FOR_VOTE) {
            p.forVotes += 1;
        } else if (userVote == Vote.AGAINST_VOTE) {
            p.againstVotes += 1;
        } else {
            p.abstainVotes += 1;
        }
        p.voters[signer] = true;
        return "SUCCESSFUL_VOTE";
    }
    function castVoteBySigGroup(uint proposalId, uint8[] calldata support, uint8[] calldata vArray, bytes32[] calldata rArray, bytes32[] calldata sArray) external {
        require((vArray.length == rArray.length) && (rArray.length == sArray.length) && (support.length == vArray.length), "Arrays are of differing length");
        
        for (uint256 idx = 0; idx < support.length; idx++) {
            // TODO: track the statuses returned by the _castVoteBySigGroup function and return to user
            _castVoteBySigGroup(proposalId, support[idx], vArray[idx], rArray[idx], sArray[idx]);
        }
    }

    function buyNft(uint256 nftId, address nftContractAddress, address nftMarketplaceAddress) public payable {
        require(executeLock, "Function can only be called while being executed");
        NftMarketplace nftMarketplace = NftMarketplace(nftMarketplaceAddress);
        uint256 nftPrice = nftMarketplace.getPrice(nftContractAddress, nftId);
        require(msg.value >= nftPrice, "Msg.value must be greater than NFT price");
        nftMarketplace.buy{value: msg.value}(nftContractAddress, nftId);
    }
    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        Proposal storage p = proposals[proposalId];
        return p.proposalState;
    }
    function hashProposalID(address[] memory targets, string[] memory signatures, uint[] memory values, bytes[] memory calldatas) public pure virtual returns (uint256) {
        return uint256 (keccak256(abi.encode(targets, signatures, values, calldatas)));
    }

    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    } 
}
