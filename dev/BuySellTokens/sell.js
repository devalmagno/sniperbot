const ethers = require("ethers");

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
    slippage,
} = require("./config");
const abi = require("./abi.json");
const abiTestnet = require("./testnetAbi.json");
const contractAbi = require("./contractAbi.json");
const contractAbiTn = require("./contractAbiTn.json");

const checkIfTestnet = () => {
    return process.env.NODE_ENV.trim() === "test";
};

const isTestnet = checkIfTestnet();

const wbnb = isTestnet ? wbnbTestNet : wbnbToken;
const purchaseToken = isTestnet ? targetTokenTestnet : targetToken;
const pcs = isTestnet ? pcsTestnet : pcsRouter;

const provider = new ethers.getDefaultProvider(
    isTestnet ? bscTestNetProvider : bscProvider
);

const account = new ethers.Wallet(
    isTestnet ? privateKeyTestnet : privateKey,
    provider
);

const router = new ethers.Contract(pcs, isTestnet ? abiTestnet : abi, account);

const erc = new ethers.Contract(
    purchaseToken,
    isTestnet ? contractAbiTn : contractAbi,
    account
);

async function sell() {
    const balance = await erc.balanceOf(account.address);

    const nonce = await account.getTransactionCount();

    const aprovedTx = await erc.approve(pcs, balance, {
        gasLimit: 345684,
        gasPrice: ethers.utils.parseUnits("10", "gwei"),
        nonce,
    });

    const aprovedReceipt = await aprovedTx.wait();

    console.log(`Approved: ${isTestnet ? 'https://testnet.bscscan.com/tx/' : 'https://bscscan.com/tx/'}${aprovedReceipt.transactionHash}`);  

    const tx = await router.swapExactTokensForETH(
        balance,
        0,
        [purchaseToken, wbnb],
        isTestnet ? addressTestnet : address,
        Date.now() + 1000 * 60 * 5,
        {
            gasLimit: 345684,
            gasPrice: ethers.utils.parseUnits("10", "gwei"),
            nonce: nonce + 1,
        }
    );

    const receipt = await tx.wait();

    console.log(`View on bscscan: ${isTestnet ? 'https://testnet.bscscan.com/tx/' : 'https://bscscan.com/tx/'}${receipt.transactionHash}`);  

    process.exit();
}

sell();
