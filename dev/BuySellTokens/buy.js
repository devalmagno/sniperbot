const ethers = require("ethers");
const readline = require('readline');

const {
    address,
    addressTestnet,
    amount,
    bscProvider,
    bscTestNetProvider,
    pcsRouter,
    pcsTestnet,
    privateKey,
    privateKeyTestnet,
    targetToken,
    targetTokenTestnet,
    wbnbTestNet,
    wbnbToken,
    slippage
} = require("../../config");
const abi = require("../../abi.json");
const abiTestnet = require("../../testnetAbi.json");

const checkIfTestnet = () => {
    return process.env.NODE_ENV.trim() === "test";
};

const isTestnet = checkIfTestnet();

const read = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const wbnb = isTestnet ? wbnbTestNet : wbnbToken;
let purchaseToken = "";
const purchaseAmount = ethers.utils.parseUnits(amount, "ether");
const pcs = isTestnet ? pcsTestnet : pcsRouter;

const provider = new ethers.getDefaultProvider(
    isTestnet ? bscTestNetProvider : bscProvider
);

const account = new ethers.Wallet(
    isTestnet ? privateKeyTestnet : privateKey,
    provider
);

const router = new ethers.Contract(
    pcs,
    isTestnet ? abiTestnet : abi,
    account
);

read.question("Purchase token:", answer => {
    purchaseToken = answer;
    console.log("\n");
    read.close();
    buy();
});

async function buy() {
    const amounts = await router.getAmountsOut(purchaseAmount, [
        wbnb,
        purchaseToken
    ]);
    const amountOutMin = amounts[1].sub(amounts[1].div(slippage));
    const nonce = await account.getTransactionCount();

    const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        amountOutMin,
        [wbnb, purchaseToken],
        isTestnet ? addressTestnet : address,
        Date.now() + 1000 * 60 * 5,
        {
            value: purchaseAmount,
            gasLimit: 345684,
            gasPrice: ethers.utils.parseUnits("10", "gwei"),
            nonce
        }
    );

    const receipt = await tx.wait();

    console.log(`View on bscscan: ${isTestnet ? 'https://testnet.bscscan.com/tx/' : 'https://bscscan.com/tx/'}${receipt.transactionHash}`);  

    process.exit();
}