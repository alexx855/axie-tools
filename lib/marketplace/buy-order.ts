import { BigNumber, Signer, ethers } from "ethers"
import { DEFAULT_GAS_LIMIT, GRAPHQL_URL } from "../constants"
import { apiRequest } from "../utils"
import { APP_AXIE_ORDER_EXCHANGE, MARKETPLACE_GATEWAY_V2, MARKET_GATEWAY, WRAPPED_ETHER } from "@roninbuilders/contracts"

interface Axie {
  id: string
  order: Order
}

interface Order {
  id: number
  maker: string
  kind: string
  assets: Asset[]
  expiredAt: number
  paymentToken: string
  startedAt: number
  basePrice: string
  endedAt: number
  endedPrice: string
  expectedState: string
  nonce: number
  marketFeePercentage: number
  signature: string
  hash: string
  duration: number
  timeLeft: number
  currentPrice: string
  suggestedPrice: string
  currentPriceUsd: string
}

interface Asset {
  erc: string
  address: string
  id: string
  quantity: string
  orderId: number
}

interface IGetAxieDetail {
  data?: {
    axie: Axie
  }
  errors?: {
    message: string
  }
}

// check and approve the axie contract to transfer axies from address to the marketplace contract
export default async function buyMarketplaceOrder(
  axieId: number,
  signer: Signer,
  accessToken: string,
  skymavisApiKey: string
): Promise<ethers.providers.TransactionReceipt | false> {
  const query = `query GetAxieDetail($axieId: ID!) {
        axie(axieId: $axieId) {
          ...AxieDetail
          __typename
        }
      }
      fragment AxieDetail on Axie {
        id
        order {
          ...OrderInfo
          __typename
        }
      }

      fragment OrderInfo on Order {
        id
        maker
        kind
        assets {
          ...AssetInfo
          __typename
        }
        expiredAt
        paymentToken
        startedAt
        basePrice
        endedAt
        endedPrice
        expectedState
        nonce
        marketFeePercentage
        signature
        hash
        duration
        timeLeft
        currentPrice
        suggestedPrice
        currentPriceUsd
        __typename
      }
      fragment AssetInfo on Asset {
        erc
        address
        id
        quantity
        orderId
        __typename
      }`

  const variables = {
    axieId
  }

  const headers = {
    'x-api-key': skymavisApiKey,
    'authorization': `Bearer ${accessToken}`,
  }

  try {
    const results = await apiRequest<IGetAxieDetail>(GRAPHQL_URL, JSON.stringify({ query, variables }), headers)
    const order = results.data?.axie.order
    if (!order) {
      console.log('No order found')
      return false
    }

    console.log(`Buying axie ${axieId} for ${ethers.utils.formatEther(order.currentPrice)} WETH`)

    const address = await signer.getAddress()

    // marketplace order exchange contract
    const marketAbi = new ethers.utils.Interface(MARKET_GATEWAY.abi);
    const contract = new ethers.Contract(
      MARKETPLACE_GATEWAY_V2.address,
      marketAbi,
      signer
    )

    // Check if the marketplace contract has enough WETH allowance
    const wethContract = new ethers.Contract(
      WRAPPED_ETHER.address,
      new ethers.utils.Interface(WRAPPED_ETHER.abi),
      signer
    )

    const allowance = await wethContract.allowance(address, contract.address)
    if (ethers.BigNumber.isBigNumber(allowance) && allowance.eq(0)) {
      console.log('Need approve the marketplace contract to transfer WETH, no allowance')
      // Same amount as the ronin wallet uses, i got it from there
      const amountToapproved = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
      const txApproveWETH = await wethContract.approve(contract.address, amountToapproved)
      const txArppoveReceipt = await txApproveWETH.wait()
      console.log('Approved WETH', txArppoveReceipt.transactionHash)
    }

    // Assuming orderTypes and orderData are defined and orderData is an array
    const orderTypes = [
      '(address maker, uint8 kind, (uint8 erc,address addr,uint256 id,uint256 quantity)[] assets, uint256 expiredAt, address paymentToken, uint256 startedAt, uint256 basePrice, uint256 endedAt, uint256 endedPrice, uint256 expectedState, uint256 nonce, uint256 marketFeePercentage)',
    ];

    const orderData = [
      order.maker,
      1, // market order kind
      [[ // MarketAsset.Asset[]
        1, // MarketAsset.TokenStandard
        order.assets[0].address, // tokenAddress
        order.assets[0].id, // axieId
        +order.assets[0].quantity // quantity
      ]],
      order.expiredAt,
      WRAPPED_ETHER.address, // paymentToken WETH
      order.startedAt,
      order.basePrice,
      order.endedAt,
      order.endedPrice,
      0, // expectedState
      order.nonce,
      425, // Market fee percentage, 4.25%
    ]

    // Encode the order values
    const encodedOrderData = await ethers.utils.defaultAbiCoder.encode(orderTypes, [orderData]);

    const settleInfo = {
      orderData: encodedOrderData,
      signature: order.signature,
      referralAddr: '0xa7d8ca624656922c633732fa2f327f504678d132', // referralAddr
      expectedState: BigNumber.from(0),
      recipient: address,
      refunder: address,
    };

    const axieOrderExchangeInterface = new ethers.utils.Interface(APP_AXIE_ORDER_EXCHANGE.abi);
    // Encode the values again
    const orderExchangeData = axieOrderExchangeInterface.encodeFunctionData('settleOrder', [
      settleInfo, BigNumber.from(order.currentPrice)
    ])

    // Call the contract
    const txBuyAxie = await contract.interactWith('ORDER_EXCHANGE', orderExchangeData, { gasPrice: 20000000000 })

    // Wait for the transaction to be mined
    const receipt = await txBuyAxie.wait()
    return receipt
  } catch (error) {
    console.log('Error buying axie', error)
  }
  return false
}