const assert = require('chai').assert
const createRequest = require('../index.js').createRequest

describe('createRequest', () => {
  const jobID = '1'
  process.env.INFURA_PROJECT_KEY = 'xxxxx';

  context('successful calls', () => {
    const requests = [
      { name: 'id not supplied', testData: { data: { pricePair: 'ETH/USD' } } },
      { name: 'eth/usd', testData: { id: jobID, data: { pricePair: 'ETH/USD' } } },
      { name: 'btc/eth', testData: { id: jobID, data: { pricePair: 'BTC/ETH' } } },
      { name: 'link/eth on kovan', testData: { id: jobID, data: { pricePair: 'LINK/ETH', network: 'kovan'} } },
      { name: 'price feed contract', testData: { id: jobID, data: { pricePair: 'DAI/ETH', priceFeed: '773616E4d11A78F511299002da57A0a94577F1f4'} } },
      { name: 'network', testData: { id: jobID, data: { pricePair: 'ETH/USD', network: 'rinkeby' , priceFeed: '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e'} } }
    ]

    requests.forEach(req => {
      it(`${req.name}`, (done) => {
        createRequest(req.testData, (statusCode, data) => {
          assert.equal(statusCode, 200)
          assert.equal(data.jobRunID, jobID)
          assert.isNotEmpty(data.data)
          assert.isAbove(Number(data.result), 0)
          assert.isAbove(Number(data.data.result), 0)
          if (req.testData.data.network) {
            assert.equal(data.data.network, req.testData.data.network)
          }
          assert.equal(data.data.pricePair, req.testData.data.pricePair)
          if (req.testData.data.priceFeed){
            assert.equal(data.data.priceFeedContract, req.testData.data.priceFeed)
          }
          done()
        })
      })
    })
  })

  context('error calls', () => {
    const requests = [
      { name: 'empty body', testData: {} },
      { name: 'empty data', testData: { data: {} } },
      { name: 'price pair not supplied', testData: { id: jobID, data: { priceFeed: '0x9326BFA02ADD2366b30bacB125260Af641031331' } } },
      { name: 'unknown price pair', testData:{ id: jobID, data: { pricePair: 'ETH/UNKNOWN'} } },
      { name: 'unknown network', testData:{ id: jobID, data: { pricePair: 'ETH/USD', network: 'unknown' , priceFeed: '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e'} } },
      { name: 'unknown price feed', testData: { id: jobID, data: { pricePair: 'ETH/USD', network: 'kovan' , priceFeed: '0x0630521aC362bc7A19a4eE44b57cE72Ea34AD01c'} } }
    ]

    requests.forEach(req => {
      it(`${req.name}`, (done) => {
        createRequest(req.testData, (statusCode, data) => {
          assert.equal(statusCode, 500)
          assert.equal(data.jobRunID, jobID)
          assert.equal(data.status, 'errored')
          assert.isNotEmpty(data.error)
          done()
        })
      })
    })
  })
})
