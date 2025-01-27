# Axie tools

TypeScript library and CLI tool for interacting with Axie Infinity marketplace and NFTs on Ronin network. Features marketplace operations (buy/sell/delist), batch transfers, and wallet information.

You only need Node.js. Install it from [here](https://nodejs.org/en/download/prebuilt-binaries/)

> [!TIP]
> Use the npx command to test this tool with an interactive CLI.

```shell
npx axie-tools
```

This will present an interactive menu with the following options:

- Get account info
- Refresh access token
- Approve WETH
- Approve marketplace
- Buy axie
- List axie for sale
- List all axies for sale
- Delist axie from sale
- Delist all axies from sale
- Transfer axie
- Transfer all axies

The CLI will guide you through the inputs for each action.

> [!TIP]
> You can create an .env (see .env.example) file to avoid entering values every time you use the CLI.

![CLIScreenshot](./examples/CLIScreenshot.png)

## Using axie tools library in your nodejs projects

```shell
npm install axie-tools ethers@6.13.4 dotenv
```

Create a .env file with the following values:

```shell
# Get from Ronin wallet: Manage wallet > Show private key
PRIVATE_KEY="<your private key, copy from ronin wallet: manage wallet > show private key>"
# Get from app.axie: Browser > Developer Tools > Application > Local storage > https://app.axieinfinity.com > accessToken
MARKETPLACE_ACCESS_TOKEN="<your marketplace access token, log in to the marketplace and copy from the developer console>"
# Optional, will use public rpc if not provided
SKYMAVIS_DAPP_KEY="<your skimavis dapp key, get from https://developers.skymavis.com/console/applications/"
```

- Buy axie: [complete example code](https://github.com/alexx855/axie-tools/tree/main/examples/buy.js)
- List axie for sale on the marketplace: [complete example code](https://github.com/alexx855/axie-tools/tree/main/examples/list-for-sale.js)
- Delist axie from the marketplace: [complete example code](https://github.com/alexx855/axie-tools/tree/main/examples/delist-from-sale.js)

### How to get marketplace access token

> [!NOTE]
> Get your access token by logging into <https://app.axieinfinity.com/> and accessing Developer Tools > Application > Local storage > https://app.axieinfinity.com > accessToken

![ConsoleScreenshot](./examples/accessTokenConsoleScreenshot.png)

### Considerations

- You need RON tokens to pay for the gas fees of the onchain transactions.
- All scripts use WETH for the marketplace transactions, you need to have WETH in your wallet to buy axies.
- Listing is offchain, you will need to approve the marketplace contract to use your axies first, you can do this with the `approveMarketplaceContract` function or manually in the marketplace website the first time you list an axie.
- Buying is onchain, you need to have approve WETH allowance, you can do this with the `approveWETH` function or manually in the marketplace website the first time you buy and axie.
- Cancel listing is onchain.
- If you get a "Signer is not maker" error, make sure the access token is correct.

### Contributing

Feel free to open an issue or a pull request if you have any error, questions or suggestions.
