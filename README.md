# Axie tools

You only need Node.js to use this tool. You can install it from [here](https://nodejs.org/en/download/prebuilt-binaries/)
> You can use the npx command to run the CLI without installation.

```shell
npx axie-tools
```

This will present an interactive menu with the following options:

- Get account info
- Refresh access token
- Approve WETH
- Approve marketplace
- Buy axie
- Delist axie from sale
- Delist all axies from sale
- List axie for sale
- List all axies for sale
- Transfer axie
- Transfer all axies

The CLI will guide you through the required inputs for each action.
> You can create an .env (see .env.example) file to avoid entering the values every time you use the CLI.

![CLIScreenshot](./examples/CLIScreenshot.png)

## Using axie tools library in your JavaScript projects

Install the dependencies:

```shell
npm install axie-tools ethers@5.7.0 dotenv
```

List axie for sale on the marketplace, full example here [examples/marketplace](https://github.com/alexx855/axie-tools/tree/main/examples/marketplace/list-for-sale.js)

Delist an axie from the marketplace, full example here [examples/marketplace](https://github.com/alexx855/axie-tools/tree/main/examples/marketplace/delist-from-sale.js)

Buy an axie, full example here [examples/buy](https://github.com/alexx855/axie-tools/tree/main/examples/marketplace/buy.js)

### How to get marketplace access token

Get it from <https://app.axieinfinity.com/> login and copy from the browser developer tools ![ConsoleScreenshot](./examples/accessTokenConsoleScreenshot.png)
> Developer Tools > Application > Local storage > <https://app.axieinfinity.com> > accessToken

### Considerations

- You need RON tokens to pay for the gas fees of the onchain transactions.
- All scripts use WETH for the marketplace transactions, you need to have WETH in your wallet to buy axies.
- Listing is offchain, but you need to approve the marketplace contract to spend your axies first, you can do this with the `approveMarketplaceContract` function or manually in the marketplace website the first time you list an axie.
- Buying is onchain, you need to have approve weth allowance, you can do this with the `approveWETH` function or manually in the marketplace website the first time you buy and axie.
- Cancel listing is onchain.
- If you get *Signer is not maker* error, make sure the access token is correct for the account you are using.

### Contributing

Feel free to open an issue or a pull request if you have any questions or suggestions.
