![](./substrate-frontend/src/Ki.dot.png)

**Ki.Dot**, a substrate based blockchain to help micro funding
How a blockchain could help people to find lenders for their projects ?

Personal [Chainlink Hackathon](https://hack.chain.link/) project.

This technical project aims to demonstrate how a substrate chain could rely on Chainlink to get Aggregated Price Feeds.

* A [Chainlink External Adapter](https://docs.chain.link/docs/external-adapters) consume [Price Feeds](https://feeds.chain.link/)
* The [Chainlink/Polkadot Bridge](https://github.com/smartcontractkit/chainlink-polkadot) call this external adapter from a substrate chain.


## Chainlink Initiator/Adapter Update

To use latest substrate version (2.0.0-rc6 at the beginning of this project), we need to update all components between Chainlink and Substrate, aka external-initiator, substrate-adapter and the Chainlink Pallet.

See the following repositories for changes :

* https://github.com/LaurentTrk/go-substrate-rpc-client/tree/substrate-2.0.0
* https://github.com/LaurentTrk/substrate-adapter/tree/substrate-2.0.0
* https://github.com/LaurentTrk/external-initiator/tree/substrate-2.0.0
* https://github.com/LaurentTrk/chainlink-polkadot/tree/substrate-2.0.0

The following built Docker images has been pushed:
* https://hub.docker.com/repository/docker/laurenttrk/substrate-adapter
* https://hub.docker.com/repository/docker/laurenttrk/external-initiator


