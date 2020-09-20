const {Requester, Validator} = require('@chainlink/external-adapter')
const dotenv = require('dotenv');
const Web3 = require("web3");

dotenv.config();


const customError = (data) => {
  if (data.Response === 'Error') return true
  return false
}


const customParams = {
  pricePair: ['pair', 'price', 'pricePair'],
  network: false,
  priceFeed: false,
}

function getPriceFeedContractFromPricePair(pricePair) {
  // TODO
  return '0x9326BFA02ADD2366b30bacB125260Af641031331'; // ETH/USD on Kovan for testing purpose
}

function getDefaultNetwork() {
  return  process.env.PRICE_FEED_DEFAULT_NETWORK || 'kovan'
}


const createRequest = (input, callback) => {

  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id
  const infuraProjectKey =  process.env.INFURA_PROJECT_KEY
  const pricePair = validator.validated.data.pricePair;
  const network = validator.validated.data.network || getDefaultNetwork();
  const priceFeedContract = validator.validated.data.priceFeed || getPriceFeedContractFromPricePair(pricePair);

  const priceFeed = getPriceFeed(network, infuraProjectKey, priceFeedContract);
  priceFeed.methods.latestRoundData().call()
      .then((roundData) => {
        console.log("Latest Round Data", roundData)
        roundData.result = roundData.answer
        roundData.pricePair = pricePair
        roundData.network = network
        roundData.priceFeedContract = priceFeedContract
        const response = {
          jobRunID: jobRunID,
          data: roundData,
          result: roundData.answer,
          statusCode: 200
        }
        callback(200, response);
      })
      .catch(error => {
        callback(500, Requester.errored(jobRunID, error))
      })
  ;
}

function getPriceFeed(network, infuraProjectKey, priceFeedContract) {
  const web3 = new Web3("https://" + network + ".infura.io/v3/" + infuraProjectKey);
  const aggregatorV3InterfaceABI = [{
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }, {
    "inputs": [],
    "name": "description",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }, {
    "inputs": [{"internalType": "uint80", "name": "_roundId", "type": "uint80"}],
    "name": "getRoundData",
    "outputs": [{"internalType": "uint80", "name": "roundId", "type": "uint80"}, {
      "internalType": "int256",
      "name": "answer",
      "type": "int256"
    }, {"internalType": "uint256", "name": "startedAt", "type": "uint256"}, {
      "internalType": "uint256",
      "name": "updatedAt",
      "type": "uint256"
    }, {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"}],
    "stateMutability": "view",
    "type": "function"
  }, {
    "inputs": [],
    "name": "latestRoundData",
    "outputs": [{"internalType": "uint80", "name": "roundId", "type": "uint80"}, {
      "internalType": "int256",
      "name": "answer",
      "type": "int256"
    }, {"internalType": "uint256", "name": "startedAt", "type": "uint256"}, {
      "internalType": "uint256",
      "name": "updatedAt",
      "type": "uint256"
    }, {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"}],
    "stateMutability": "view",
    "type": "function"
  }, {
    "inputs": [],
    "name": "version",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }];
  return new web3.eth.Contract(aggregatorV3InterfaceABI, priceFeedContract);
}


// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data)
  })
}

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data)
  })
}

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
  createRequest(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false
    })
  })
}

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest
