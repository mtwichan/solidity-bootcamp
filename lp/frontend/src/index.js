import { BigNumber, ethers } from "ethers"
import LPRouterJSON from '../../artifacts/contracts/LPRouter.sol/LPRouter.json';
import SpaceCoinTokenJSON from '../../artifacts/contracts/SpaceCoin.sol/SpaceCoinToken.json';
import ICOJSON from '../../artifacts/contracts/ICO.sol/ICO.json';
import LPPairJSON from '../../artifacts/contracts/LPPair.sol/LPPair.json';
import { exitCode } from "process";

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const routerAddr = '0x57FC3EdeeFb8683f73E1b97C19feBb57924906A3';
const spaceCoinTokenAddr = '0x941288560265da5F1aa3F2f72164681c28fAFa78';
const icoAddr = '0xfC4Ec9efdf1B5105cD884DEfb1499D0aE348c1Cf';
const pairAddr = '0x398fe7CEFbb437F0C32c87dC4dee2d961351F92B';
const lpRouterContract = new ethers.Contract(routerAddr, LPRouterJSON.abi, provider);
const spaceCoinContract = new ethers.Contract(spaceCoinTokenAddr, SpaceCoinTokenJSON.abi, provider);
const ICOContract = new ethers.Contract(icoAddr, ICOJSON.abi, provider);
const lpPairContract = new ethers.Contract(pairAddr, LPPairJSON.abi, provider);
async function connectToMetamask() {
  try {
    console.log("Signed in as", await signer.getAddress())
  }
  catch(err) {
    console.log("Not signed in")
    await provider.send("eth_requestAccounts", [])
  }
}



//
// ICO
//
ico_spc_buy.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const eth = ethers.utils.parseEther(form.eth.value);
  console.log("Buying", eth, "eth");

  await connectToMetamask();
  // TODO: Call ico contract contribute function
  try {
    ICOContract.connect(signer).contribute({value: eth});
  } 
  catch(error) {
    alert(error);
  }
})


//
// LP
//
let currentSpcToEthPrice = 5;

provider.on("block", async (n) => {
  console.log("New block", n);
  // TODO: Update currentSpcToEthPrice
  const reserveETH = await lpPairContract.connect(signer).reserveETH({gasLimit: 1000000});
  const reserveSpaceCoinToken = await lpPairContract.connect(signer).reserveSpaceCoinToken({gasLimit: 1000000});  
  const price = await lpRouterContract.connect(signer).getSwapAmount(reserveETH, reserveSpaceCoinToken, ethers.utils.parseEther("1"), 0, true);
  currentSpcToEthPrice = ethers.utils.formatEther(price);
  currentSpcToEthPrice = Math.round(currentSpcToEthPrice * 1e4) / 1e4;
});

lp_deposit.eth.addEventListener('input', e => {
  lp_deposit.spc.value = +e.target.value * currentSpcToEthPrice;
})

lp_deposit.spc.addEventListener('input', e => {
  lp_deposit.eth.value = +e.target.value / currentSpcToEthPrice;
})

lp_deposit.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const eth = ethers.utils.parseEther(form.eth.value);
  const spc = ethers.utils.parseEther(form.spc.value);
  console.log("Depositing", eth, "eth and", spc, "spc");

  await connectToMetamask();
  // TODO: Call router contract deposit function
  await spaceCoinContract.connect(signer).approve(lpRouterContract.address, spc);
  await lpRouterContract.connect(signer).addLiquidity(eth, spc, {value: eth});
})

lp_withdraw.addEventListener('submit', async e => {
  e.preventDefault();
  console.log("Withdrawing 100% of LP");

  await connectToMetamask();
  // TODO: Call router contract withdraw function
  const liquidity = await lpPairContract.connect(signer).balanceOf(await signer.getAddress());
  await lpPairContract.connect(signer).approve(lpRouterContract.address, liquidity);
  await lpRouterContract.connect(signer).removeLiquidity(liquidity);
})

//
// Swap
//
let swapIn = { type: 'eth', value: 0 };
let swapOut = { type: 'spc', value: 0 };
switcher.addEventListener('click', () => {
  [swapIn, swapOut] = [swapOut, swapIn];
  swap_in_label.innerText = swapIn.type.toUpperCase();
  swap.amount_in.value = swapIn.value;
  updateSwapOutLabel();
})

swap.amount_in.addEventListener('input', updateSwapOutLabel)

function updateSwapOutLabel() {
  swapOut.value = swapIn.type === 'eth'
    ? +swap.amount_in.value * currentSpcToEthPrice
    : +swap.amount_in.value / currentSpcToEthPrice

  swap_out_label.innerText = `${swapOut.value} ${swapOut.type.toUpperCase()}`
}

swap.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const amountIn = ethers.utils.parseEther(form.amount_in.value)

  console.log("Swapping", amountIn, swapIn.type, "for", swapOut.type)

  await connectToMetamask()
  // TODO: Call router contract swap function
  if (swapIn.type === "eth") {
    await lpRouterContract.connect(signer).swapTokens(amountIn, 0, 0, 0, {value: amountIn});
  } else {
    await lpRouterContract.connect(signer).swapTokens(0, amountIn, 0, 0);
  }
})
