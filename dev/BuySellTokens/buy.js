const ethers = require("ethers");
const readline = require('readline');

const {
    address,
    addressTestnet,
    amount,
    bscProvider,
    bscTestNetProvider,
    bscWebSocket,
    testnetWebsocket,
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
const { start } = require("repl");

const checkIfTestnet = () => {
    return process.env.NODE_ENV.trim() === "test";
};

const isTestnet = checkIfTestnet();

const wbnb = isTestnet ? wbnbTestNet : wbnbToken;
let purchaseToken = isTestnet ? targetTokenTestnet : targetToken;
const purchaseAmount = ethers.utils.parseUnits(amount, "ether");
const pcs = isTestnet ? pcsTestnet : pcsRouter;
const senderAddress = isTestnet ? addressTestnet : address;

const provider = new ethers.providers.WebSocketProvider(
    isTestnet ? testnetWebsocket : bscWebSocket
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

const startConnection = () => {
    provider._websocket.on("open", () => {
        buy();
    }); 
}

async function buy() {
    const amounts = await router.getAmountsOut(purchaseAmount, [
        wbnb,
        purchaseToken
    ]);
    const amountOutMin = amounts[1].sub(amounts[1].div(slippage));
    // const nonce = await account.getTransactionCount();

    const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        amountOutMin,
        [wbnb, purchaseToken],
        senderAddress,
        Date.now() + 300000,
        {
            value: purchaseAmount,
            gasLimit: 345684,
            gasPrice: ethers.utils.parseUnits("10", "gwei"),
            // nonce
        }
    );

    const receipt = await tx.wait();

    console.log(`View on bscscan: ${isTestnet ? 'https://testnet.bscscan.com/tx/' : 'https://bscscan.com/tx/'}${receipt.transactionHash}`);  

    process.exit();
}

startConnection();