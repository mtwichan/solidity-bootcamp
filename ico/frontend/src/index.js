import { ethers} from "ethers";
import ICOJSON from '../../artifacts/contracts/ICO.sol/ICO.json';
import SpaceCoinTokenJSON from '../../artifacts/contracts/SpaceCoinToken.sol/SpaceCoinToken.json';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const ICOContractAddress = '0xa16E02E87b7454126E5E10d957A927A7F5B5d2be';
const SpaceCoinTokenAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const ICOContract = new ethers.Contract(ICOContractAddress, ICOJSON.abi, provider);
const spaceCoinContract = new ethers.Contract(SpaceCoinTokenAddress, SpaceCoinTokenJSON.abi, provider);

const stateMap = {
  0: "SEEDED",
  1: "GENERAL",
  2: "OPEN",
  3: "CLOSED",
}

// For playing around with in the browser
window.ethers = ethers;
window.provider = provider;
window.signer = signer;
window.ico = ICOContract;
window.space = spaceCoinContract;
window.buttonDepositETHICO = buttonDepositETHICO;
window.buttonNextState = buttonNextState;
window.buttonUpdateMetadata = buttonUpdateMetadata;

window.ethereum.on('accountsChanged', async function (accounts) {
  await connectToMetamask();
  await fetchMetadata();
})

window.ethereum.on('networkChanged', async function (networkId) {
  await connectToMetamask();
  await fetchMetadata();
})

async function go() {
  await connectToMetamask();
}

async function fetchTokenAmount() {
  try {
    const signerAddress = await signer.getAddress();  
    const balance = await spaceCoinContract.balanceOf(signerAddress);
    document.getElementById("ico-token-amount").innerHTML = balance;
    console.log("Get token amount for user");
  } catch (err) {
    console.log(err)
    document.getElementById("status-message").innerHTML = "FETCH TOKEN AMOUNT: " + err;
  }
}

async function fetchAccountBalance() {
  try {
    const balance = await signer.getBalance();
    document.getElementById("ico-account-balance").innerHTML = balance;
  } catch (err) {
    console.log(err)
    document.getElementById("status-message").innerHTML = "FETCH ACCOUNT BALANCE ERROR: " + err;
  }
}

async function fetchState() {
  try {
    const state = await ICOContract.getState();
    document.getElementById("ico-state").innerHTML = stateMap[state];
  } catch (err) {
    console.log(err)
    document.getElementById("status-message").innerHTML = "FETCH STATE ERROR: " + err;
  }
}

async function fetchTotalContribution() {
  try {
    const totalContribution = await ICOContract.totalContribution();
    document.getElementById("ico-total-contribution").innerHTML = totalContribution;
  } catch (err) {
    console.log(err)
    document.getElementById("status-message").innerHTML = "FETCH TOTAL CONTRIBUTION: " + err;
  }
}

async function buttonDepositETHICO() {
  try {
    const deposit = document.getElementById("eth-ico-amount").value;
    const tx = await ICOContract.connect(signer).contribute({value: ethers.utils.parseEther(deposit)});
    await tx.wait();
    document.location.reload(true);
  } catch (err) {
    console.log(err)
    document.getElementById("status-message").innerHTML = "DEPOSIT ETH ICO ERROR: " + err;
  }
} 

async function buttonNextState() {
  try {
    const tx = await ICOContract.connect(signer).setNextState();
    await tx.wait();
    document.location.reload(true);
  } catch (err) {
    console.log(err)
    document.getElementById("status-message").innerHTML = "BUTTON NEXT STATE ERROR: " + err;
  }
}

async function buttonUpdateMetadata() {
  try{
    fetchMetadata();
    document.location.reload(true);
  } catch (err) {
    console.log(err);
    document.getElementById("status-message").innerHTML = "BUTTON METADATA: " + err;
  }
}

async function fetchMetadata() {
  fetchTokenAmount();
  fetchAccountBalance();
  fetchTotalContribution();
  fetchState();
}

async function connectToMetamask() {
  try {
    const address = await signer.getAddress();
    console.log("Signed in", address);
    document.getElementById("user-address").innerHTML = address;
  }
  catch (err) {
    console.log("Not signed in");
    console.log(err)
    document.getElementById("status-message").innerHTML = err;
    await provider.send("eth_requestAccounts", []);
  }
}

// Initialization
go();
fetchMetadata();