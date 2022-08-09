import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Airdrop, ERC20, MacroToken } from "../typechain"
import {MerkleTree} from "merkletreejs";
import { AbiCoder, keccak256 } from "ethers/lib/utils";

const provider = ethers.provider
let account1: SignerWithAddress
let account2: SignerWithAddress
let account3: SignerWithAddress
let account4: SignerWithAddress
let rest: SignerWithAddress[]

let macroToken: MacroToken
let airdrop: Airdrop
let merkleTreeLeaves: string[]
let merkleTree: MerkleTree
let merkleRoot: string
let abiCoder: AbiCoder
let leafAccountOne: string
let leafAccountTwo: string

describe("Airdrop", function () {
  before(async () => {
    [account1, account2, account3, account4, ...rest] = await ethers.getSigners();

    macroToken = (await (await ethers.getContractFactory("MacroToken")).deploy("Macro Token", "MACRO")) as MacroToken;
    await macroToken.deployed();
    // TODO: The bytes32 value below is just a random hash in order to get the tests to pass.
    // You must create a merkle tree for testing, computes it root, then set it here
    abiCoder = new ethers.utils.AbiCoder();
    leafAccountOne = abiCoder.encode(["address", "uint256"], [account2.address, ethers.utils.parseEther("19029")]);
    leafAccountTwo = abiCoder.encode(["address", "uint256"], [account3.address, ethers.utils.parseEther("5124")]);
    merkleTreeLeaves = [leafAccountOne, leafAccountTwo].map(leaf => keccak256(leaf));
    merkleTree = new MerkleTree(merkleTreeLeaves, keccak256, {sort: true});
    merkleRoot = merkleTree.getHexRoot();
  })

  beforeEach(async () => {
    airdrop = await (await ethers.getContractFactory("Airdrop")).deploy(merkleRoot, account1.address, macroToken.address);
    await airdrop.deployed();

    // Mint 500K Macro token to airdrop contract for Airdrop distribution
    await macroToken.mint(airdrop.address, ethers.utils.parseEther("500000"));
  })

  describe("setup and disabling ECDSA", () => {

    it("should deploy correctly", async () => {
      // if the beforeEach succeeded, then this succeeds
    })

    it("should disable ECDSA verification", async () => {
      // first try with non-owner user
      await expect(airdrop.connect(account2).disableECDSAVerification()).to.be.revertedWith("Ownable: caller is not the owner")
      
      // now try with owner
      await expect(airdrop.disableECDSAVerification())
        .to.emit(airdrop, "ECDSADisabled")
        .withArgs(account1.address)
    })
  })

  describe("Merkle claiming", () => {
    it("Can verify merkle tree claim and transfer tokens", async () => {
      const proofOne = merkleTree.getHexProof(merkleTreeLeaves[0]);
      const proofTwo = merkleTree.getHexProof(merkleTreeLeaves[1]);
      expect(merkleTree.verify(proofOne, merkleTreeLeaves[0], merkleRoot)).to.equal(true);
      expect(merkleTree.verify(proofTwo, merkleTreeLeaves[1], merkleRoot)).to.equal(true);
      const tx = await airdrop.merkleClaim(proofOne, account2.address, ethers.utils.parseEther("19029"));
      const txReciept = await tx.wait();
      expect(txReciept.events![1].args!._computedHash).to.equal(merkleRoot);
      expect(txReciept.events![1].args!._to).to.equal(account2.address);
      expect(txReciept.events![1].args!._amount).to.equal(ethers.utils.parseEther("19029"));
      expect(await macroToken.balanceOf(account2.address)).to.equal(ethers.utils.parseEther("19029"));
      await airdrop.merkleClaim(proofTwo, account3.address, ethers.utils.parseEther("5124"));
      expect(await macroToken.balanceOf(account3.address)).to.equal(ethers.utils.parseEther("5124"));
    });

    it("Can invalidate incorrect merkle tree claims", async () => {
      let proofOne = merkleTree.getHexProof(merkleTreeLeaves[0]);
      let proofTwo = merkleTree.getHexProof(merkleTreeLeaves[1]);      
      expect(airdrop.merkleClaim(proofOne, account3.address, ethers.utils.parseEther("19029"))).to.be.revertedWith("Airdrop: Computed hash must match merkle root");
      expect(airdrop.merkleClaim(proofTwo, account2.address, ethers.utils.parseEther("5124"))).to.be.revertedWith("Airdrop: Computed hash must match merkle root");
      expect(airdrop.merkleClaim(proofOne, account2.address, ethers.utils.parseEther("123"))).to.be.revertedWith("Airdrop: Computed hash must match merkle root");
      expect(airdrop.merkleClaim(proofTwo, account3.address, ethers.utils.parseEther("123"))).to.be.revertedWith("Airdrop: Computed hash must match merkle root");
      leafAccountOne = abiCoder.encode(["address", "uint256"], [account2.address, ethers.utils.parseEther("190")]);
      leafAccountTwo = abiCoder.encode(["address", "uint256"], [account3.address, ethers.utils.parseEther("51")]);
      proofOne = merkleTree.getHexProof(keccak256(leafAccountOne));
      proofTwo = merkleTree.getHexProof(keccak256(leafAccountTwo));
      expect(airdrop.merkleClaim(proofOne, account2.address, ethers.utils.parseEther("19029"))).to.be.revertedWith("Airdrop: Computed hash must match merkle root");
      expect(airdrop.merkleClaim(proofTwo, account3.address, ethers.utils.parseEther("5124"))).to.be.revertedWith("Airdrop: Computed hash must match merkle root");
    });

    it("Can allow a user to claim from merkle tree only once", async () => {
      const proofOne = merkleTree.getHexProof(merkleTreeLeaves[0]);
      expect(merkleTree.verify(proofOne, merkleTreeLeaves[0], merkleRoot)).to.equal(true);
      await airdrop.merkleClaim(proofOne, account2.address, ethers.utils.parseEther("19029"));
      expect(airdrop.merkleClaim(proofOne, account2.address, ethers.utils.parseEther("19029"))).to.be.revertedWith("Airdrop: provided address has already claimed");
    })

    it("Cannot allow for a requested amount greater than the total supply", async () => {
      const proofOne = merkleTree.getHexProof(merkleTreeLeaves[0]);
      expect(airdrop.merkleClaim(proofOne, account2.address, ethers.utils.parseEther("501000"))).to.be.revertedWith("Airdrop: MacroToken amount must be less than the total supply");
    })
  });

  describe("Signature claiming", () => {
    it("Can revert if the amount passed in is greater than the total supply", async () => {
      const types = {
        Claim: [
          {name: "claimer", type: "address"},
          {name: "amount", type: "uint256"}
        ]
      };

      const domainData = {
        name: "Airdrop",
        version: "v1",
        chainId: await account1.getChainId(),
        verifyingContract: airdrop.address,
      };

      const amount = ethers.utils.parseEther("12345");
      const data = {
        claimer: account4.address,
        amount: amount,
      };

      const signature = await account1._signTypedData(
        domainData,
        types,
        data
      );

      expect(airdrop.connect(account4).signatureClaim(signature, ethers.utils.parseEther("501000"), account4.address)).to.be.revertedWith("Airdrop: MacroToken amount must be less than the total supply");
    })
    it("Can revert if the signature length is not 65", async () => {
      expect(airdrop.signatureClaim(ethers.utils.formatBytes32String("1"), ethers.utils.parseEther("1"), account4.address)).to.be.revertedWith("Airdrop: Ensure signature is passed in");
    })
    it("Can verify signature claim and transfer tokens", async () => {
      const types = {
        Claim: [
          {name: "claimer", type: "address"},
          {name: "amount", type: "uint256"}
        ]
      };

      const domainData = {
        name: "Airdrop",
        version: "v1",
        chainId: await account1.getChainId(),
        verifyingContract: airdrop.address,
      };

      const amount = ethers.utils.parseEther("12345");
      const data = {
        claimer: account4.address,
        amount: amount,
      };

      const signature = await account1._signTypedData(
        domainData,
        types,
        data
      );
      
      const tx = await airdrop.connect(account4).signatureClaim(signature, amount, account4.address);
      const txReciept = await tx.wait();
      expect(txReciept.events![1].args!._publicKey).to.equal(account1.address);
      expect(txReciept.events![1].args!._amount).to.equal(amount);
      expect(txReciept.events![1].args!._to).to.equal(account4.address);
      expect(await macroToken.balanceOf(account4.address)).to.equal(amount);
    });
    it("Can allow a user to claim only once", async () => {
      const types = {
        Claim: [
          {name: "claimer", type: "address"},
          {name: "amount", type: "uint256"}
        ]
      };

      const domainData = {
        name: "Airdrop",
        version: "v1",
        chainId: await account1.getChainId(),
        verifyingContract: airdrop.address,
      };

      const amount = ethers.utils.parseEther("12345");
      const data = {
        claimer: account4.address,
        amount: amount,
      };

      const signature = await account1._signTypedData(
        domainData,
        types,
        data
      );
            
      expect(airdrop.connect(account4).signatureClaim(signature, amount, account4.address)).to.be.revertedWith("Airdrop: provided address has already claimed");
    });
    it("Can invalidate incorrect signature claim", async () => {
      const types = {
        Claim: [
          {name: "claimer", type: "address"},
          {name: "amount", type: "uint256"}
        ]
      };

      const domainData = {
        name: "Airdrop",
        version: "v1",
        chainId: await account1.getChainId(),
        verifyingContract: airdrop.address,
      };

      let data = {
        claimer: account2.address,
        amount: ethers.utils.parseEther("12345"),
      };

      let signature = await account1._signTypedData(
        domainData,
        types,
        data
      )
      
      expect(airdrop.connect(account3).signatureClaim(signature, ethers.utils.parseEther("12345"), account4.address)).to.be.revertedWith("Airdrop: invalid signer");
      expect(airdrop.connect(account3).signatureClaim(signature, ethers.utils.parseEther("1"), account3.address)).to.be.revertedWith("Airdrop: invalid signer");

      data = {
        claimer: account3.address,
        amount: ethers.utils.parseEther("2"),
      };

      signature = await account1._signTypedData(
        domainData,
        types,
        data
      )

      expect(airdrop.connect(account3).signatureClaim(signature, ethers.utils.parseEther("12345"), account3.address)).to.be.revertedWith("Airdrop: invalid signer");

      data = {
        claimer: account4.address,
        amount: ethers.utils.parseEther("12345"),
      };

      signature = await account1._signTypedData(
        domainData,
        types,
        data
      )
      expect(airdrop.connect(account3).signatureClaim(signature, ethers.utils.parseEther("12345"), account3.address)).to.be.revertedWith("Airdrop: invalid signer");
    });
  });
})
