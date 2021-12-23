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
    bscWebSocket,
    testnetWebsocket,
} = require("./config");
const abi = require("./abi.json");
const abiTestnet = require("./testnetAbi.json");

const checkIfTestnet = () => {
    return process.env.NODE_ENV.trim() === "test";
};

const isTestnet = checkIfTestnet();

const wbnb = isTestnet ? wbnbTestNet : wbnbToken;
const purchaseToken = isTestnet ? targetTokenTestnet : targetToken;
const purchaseAmount = ethers.utils.parseUnits(amount, "ether");
const pcs = isTestnet ? pcsTestnet : pcsRouter;

const pcsAbi = new ethers.utils.Interface(isTestnet ? abiTestnet : abi);

const EXPECTED_PONG_BACK = 30000;
const KEEP_ALIVE_CHECK_INTERVAL = 15000;

// const provider = new ethers.getDefaultProvider(
// isTestnet ?  : bscProvider
// );

const provider = new ethers.providers.WebSocketProvider(
    isTestnet ? testnetWebsocket : bscWebSocket
);

const account = new ethers.Wallet(
    isTestnet ? privateKeyTestnet : privateKey,
    provider
);

const router = new ethers.Contract(pcs, isTestnet ? abiTestnet : abi, account);

const startConnection = () => {
    let pingTimeout = null;
    let keepAliveInterval = null;

    provider._websocket.on("open", () => {
        console.log("It's time for sniping...\n");

        keepAliveInterval = setInterval(() => {
            provider._websocket.ping();
            pingTimeout = setTimeout(() => {
                provider._websocket.terminate();
            }, EXPECTED_PONG_BACK);
        }, KEEP_ALIVE_CHECK_INTERVAL);

        provider.on("pending", async (txHash) => {
            provider.getTransaction(txHash).then(async (tx) => {
                if (tx && tx.to) {
                    if (tx.to.toLowerCase() === pcs.toLowerCase()) {
                        let re = new RegExp("^0xf305d719");

                        if (re.test(tx.data)) {
                            const decodedInput = pcsAbi.parseTransaction({
                                data: tx.data,
                                value: tx.value,
                            });

                            console.log(
                                `Checking if ${decodedInput.args[0]} matches Token: ${purchaseToken}`
                            );

                            if (purchaseToken.toLowerCase() === decodedInput.args[0].toLowerCase()) {
                                await buyToken(txHash);
                            }
                        }
                    }
                }
            });
        });
    });

    provider._websocket.on("close", () => {
        console.log("WebScoket Close... Reconnecting...");
        clearInterval(keepAliveInterval);
        clearTimeout(pingTimeout);
        startConnection();
    });

    provider._websocket.on("error", () => {
        console.log("Error. Attemptiing to reconnect...");
        clearInterval(keepAliveInterval);
        clearTimeout(pingTimeout);
        startConnection();
    });

    provider._websocket.on("pong", () => {
        clearInterval(keepAliveInterval);
    });
};

const buyToken = async (txHash) => {
    const amounts = await router.getAmountsOut(purchaseAmount, [
        wbnb,
        purchaseToken,
    ]);
    const amountOutMin = amounts[1].sub(amounts[1].div(slippage));
    // const nonce = await account.getTransactionCount();

    const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        amountOutMin,
        [wbnb, purchaseToken],
        isTestnet ? addressTestnet : address,
        Date.now() + 1000 * 60 * 5,
        {
            value: purchaseAmount,
            gasLimit: 345684,
            gasPrice: ethers.utils.parseUnits("10", "gwei"),
            // nonce,
        }
    );

    const receipt = await tx.wait();

    console.log(
        `View on bscscan: ${
            isTestnet
                ? "https://testnet.bscscan.com/tx/"
                : "https://bscscan.com/tx/"
        }${receipt.transactionHash}`
    );

    process.exit();
};

startConnection();
