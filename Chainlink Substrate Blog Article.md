# How to get aggregated price feed from a Substrate blockchain using Chainlink Oracle

## Introduction

Getting the BTC price in dollar from an Ethereum contract was made easy by Chainlink, using their [Aggregator API](https://docs.chain.link/docs/get-the-latest-price). You can get any price feed from aggregated and validated sources, using a couple of Solidity code lines.

When it comes to get the same price feeds from another blockchain, things get a little more complicated...

In this article, we will see how we can get these price feeds from a [Substrate](https://substrate.dev/) blockchain, using the Chainlink Oracle components:

 - We will create an [external adapter](https://docs.chain.link/docs/external-adapters) to get the [aggregated Chainlink Price feeds](https://feeds.chain.link/)
 - We will see how configure a bridge between our chainlink node and our substrate blockchain, using the [Chainlink Externale Initiator](https://github.com/smartcontractkit/external-initiator) and the [Substrate Adapter](https://github.com/smartcontractkit/substrate-adapter)
 - And finally, we will declare and use the [Chainlink Pallet](https://github.com/smartcontractkit/chainlink-polkadot/tree/master/pallet-chainlink) in the substrate runtime. 
 
## Prerequisites

We suppose we are already [running a chainlink node](https://docs.chain.link/docs/running-a-chainlink-node) on the Kovan testnet and [a substrate blockchain](https://substrate.dev/docs/en/tutorials/create-your-first-substrate-chain/) locally.

We need an [Infura](https://infura.io/) Project ID, that will be used for the [chainlink node setup](https://docs.chain.link/docs/run-an-ethereum-client#a-hrefhttpsinfuraiodocsethereumwssintroductionmd-target_blankinfuraa) and our external adapter. **Be sure to use your Kovan Infura URL ;)**

Both components are running under their default values, and are accessible at these addresses:

- Chainlink Node UI : http://localhost:6688
- Substrate Front End : http://localhost:8000
- Postgres server instance : http://localhost:5432


## Building the Aggregated Price Feed External Adapter

The [nodejs external adapter template](https://github.com/thodges-gh/CL-EA-NodeJS-Template) give us a good starting point.
Let's get it :
``` shell
git clone https://github.com/thodges-gh/CL-EA-NodeJS-Template.git
```
The job is done in the `createRequest`of the _index.js_ file:
``` javascript
const  createRequest = (input, callback) => {
	// The Validator helps you validate the Chainlink request data
	const  validator = new  Validator(callback, input, customParams)
	const  jobRunID = validator.validated.id
	....
}
```
We want to get a price feed of a given price pair, so we need at least a custom parameter to hold the price pair value (this parameter will be given by the external adapter requester):
``` javascript
const  customParams = {
	pricePair: ['pricePair', 'price', 'pair'], // We can define different aliases 
											   // for our parameter
}
...
	const pricePairRequested = validator.validated.data.pricePair
...
```

Here, we need to know how to get the Chainlink Aggregated Price Feed from javascript, we can find a sample in the [Chainlink documentation](https://docs.chain.link/docs/get-the-latest-price#javascript) :
``` javascript
const  Web3 = require("web3");
...
const web3 = new Web3("https://kovan.infura.io/v3/<infura_project_id>"); 
const aggregatorV3InterfaceABI = [{"inputs":[],"name":"decimals",.......}]; 
const addr = "0x9326BFA02ADD2366b30bacB125260Af641031331"; 
const priceFeed = new web3.eth.Contract(aggregatorV3InterfaceABI,  addr); 
priceFeed.methods.latestRoundData().call() .then((roundData)  =>  { 
	// Do something with roundData  
	console.log("Latest Round Data",  roundData) 
});
```
So we need:

- Our **Infura Project ID**. Let's say we will set it in an environment value:
```javascript
const infuraProjectID =  process.env.INFURA_PROJECT_ID
const web3 = new Web3("https://kovan.infura.io/v3/" + infuraProjectID)
```
- The **contract address** of the price pair requested. We can find these adresses in the [Chainlink Contracts Reference](https://docs.chain.link/docs/reference-contracts#kovan). We put some of these values in a dictionnary for the sake of this example :
```javascript
const priceFeedContracts = {  
	  'BAT/ETH': '0e4fcEC26c9f85c3D714370c98f43C4E02Fc35Ae',  
	  'BTC/USD': '6135b13325bfC4B00278B4abC5e20bbce2D6580e',  
	  'DAI/ETH': '22B58f1EbEDfCA50feF632bD73368b2FdA96D541',  
	  'ETH/USD': '9326BFA02ADD2366b30bacB125260Af641031331',  
	  'EUR/USD': '0c15Ab9A0DB086e062194c273CC79f41597Bbf13'
}
const addr = priceFeedContracts[pricePairRequested];
```
Now, we should be able to request the correct price feed, let's [return the response as expected](https://docs.chain.link/docs/developers#returning-data) by the requester :
```javascript
priceFeed.methods.latestRoundData().call().then((roundData) => {  
	console.log("Latest Round Data", roundData)  
	const response = { 
		jobRunID: jobRunID,  
		data: roundData,  
		result: roundData.answer // The answer parameter holds the last price 
	}  
	callback(200, response)
})  
.catch(error => {  
	callback(500, Requester.errored(jobRunID, error))  
})
```

One more thing to do, add the needed dependencies in the `package.json`file:
```json
...
	"dependencies": {
		"@chainlink/external-adapter": "^0.2.3",
		"web3": "^1.3.0"
	},
...
```
We are ready to build the Docker image :
```shell
docker build . -t pricefeed-external-adapter
```
And deploy it locally :
```shell
docker run -d --name pricefeed-ea -p 8080:8080 -e INFURA_PROJECT_ID=#YOUR_INFURA_PROJECT_ID# pricefeed-external-adapter
```

Before going further, let's check everything is fine by posting a request to our adapter :
```shell
curl -X POST -H "Content-Type: application/json" --data '{"id":"7093", "data": { "pricePair": "ETH/USD"}}' http://localhost:8080
```
That should returns the latest price data about the ETH/USD pair, something like :
```json
{"jobRunID":"7093",
 "data":"0":"18446744073709563812","1":"39217000000","2":"1602649544","3":"1602649544","4":"18446744073709563812","roundId":"18446744073709563812","answer":"39217000000","startedAt":"1602649544","updatedAt":"1602649544","answeredInRound":"18446744073709563812"},
 "result":"39217000000"}
 ```
 In any case, you can check the external adapter logs with :
 ```shell
docker logs pricefeed-ea
```

The final step is to [declare our external adapter](https://docs.chain.link/docs/node-operators) in the chainlink node :

- Login to the Chainlink Node UI : http://localhost:6688
- Go to the **Bridges** tab
- Click on the **New Bridge** button
- Set bridge values as follow:
	**Bridge Name** : pricefeed-ea
	**Bridge URL** : http://172.17.0.1:8080

> As the node and the external adapter are running into separate containers, we cannot use the _localhost_ address (which is resolved to the container itself).
> We need to use an address that is resolved to the host (our machine) from the container perspective. On Mac, we can use the `host.docker.internal` alias, on linux the `172.17.0.1` IP address.
> This issue can be resolved easily using docker-compose or Kubernetes, both outside of this scope :) 

**Great !** We have a running external adapter, ready to handle price feed requests !

## Bridging our substrate blockchain with our chainlink node

Now we have our external adapter, we need a way to call it from our susbtrate chain.

This is done by setting up 2 components:  
- A **Chainlink External Initiator**, a generic component that will trigger chainlink jobs when specific blockchain events occurs
- A **Substrate Adapter**, a custom Chainlink External Adapter that will be use in a chainlink job to call back the substrate blockchain.

Ok, that sounds complicated, let's go step by step...

### Setup the external initiator 

The external initiator will listen to susbstrate events, and trigger chainlink jobs if it finds relevant events.

This component can be run using [Docker](https://hub.docker.com/r/smartcontract/external-initiator), and we can find how to configure it on its [github repository](https://github.com/smartcontractkit/external-initiator).

To get the things work, we need some environment configuration variables :
-  **EI_DATABASEURL** : Ok, so we need a database, and by chance, our Chainlink Node is already using a database server. Let's create a new database `eidb`using the running database server :
```shell
DB_CONTAINER=___YOUR_POSTGRESS_CONTAINER_ID___
docker exec -it $DB_CONTAINER psql -U postgres -c "CREATE DATABASE eidb;"
docker exec -it $DB_CONTAINER psql -U postgres -c "CREATE USER eidb SUPERUSER PASSWORD 'apassword'"
docker exec -it $DB_CONTAINER psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE eidb TO eidb;"
```
- **EI_CHAINLINKURL** : This one is easy to guess, that's our (local) Chainlink node URL: [http://172.17.0.1:6688](http://172.17.0.1:6688/)
- **EI_IC_ACCESSKEY**, **EI_IC_SECRET**, **EI_CI_ACCESSKEY**, **EI_CI_SECRET** : these values are used to maintain a secure connection between the external initiator and the chainlink node.
They are retrieved by issuing commands on the chainlink node:
```shell
CL_USERNAME=___YOUR_CHAINLINK_USERNAME_TO_LOG_ON_THE_NODE___
CL_PASSWORD=___YOUR_CHAINLINK_PASSWORD___
CL_URL=http://localhost:6688
EI_NAME=substrate-external-initiator
EI_URL=http://172.17.0.1:8082/jobs

curl -s -c ./chainlinkCookieFile -d "{\"email\":\"${CL_USERNAME}\", \"password\":\"${CL_PASSWORD}\"}" -X POST -H 'Content-Type: application/json' "${CL_URL}/sessions"

ei_secrets=$(curl -s -b ./chainlinkCookieFile -d "{\"name\":\"${EI_NAME}\",\"url\":\"${EI_URL}\"}" -X POST -H 'Content-Type: application/json' "$CL_URL/v2/external_initiators")

EI_IC_ACCESSKEY=$(jq -r '.data.attributes.incomingAccessKey' <<<"$ei_secrets")  
EI_IC_SECRET=$(jq -r '.data.attributes.incomingSecret' <<<"$ei_secrets")  
EI_CI_ACCESSKEY=$(jq -r '.data.attributes.outgoingToken' <<<"$ei_secrets")  
EI_CI_SECRET=$(jq -r '.data.attributes.outgoingSecret' <<<"$ei_secrets")

```

Now we have all the needed values, let's put them in a single file:
```shell
echo "EI_CI_ACCESSKEY=$EI_CI_ACCESSKEY" > substrate_external_initiator.env
echo "EI_CI_SECRET=$EI_CI_SECRET" >> substrate_external_initiator.env
echo "EI_IC_ACCESSKEY=$EI_IC_ACCESSKEY" >> substrate_external_initiator.env
echo "EI_IC_SECRET=$EI_IC_SECRET" >> substrate_external_initiator.env
echo "EI_DATABASEURL=postgresql://eidb:apassword@172.17.0.1:5432/eidb?sslmode=disable" >> substrate_external_initiator.env
echo "EI_CHAINLINKURL=http://172.17.0.1:6688/" >> substrate_external_initiator.env
```

And we can run the external initiator container:
```shell
docker run -d -p 8082:8080 --name substrate-external-initiator --env-file substrate_external_initiator.env smartcontract/external-initiator "{\"name\":\"substrate-node\",\"type\":\"substrate\",\"url\":\"ws://172.17.0.1:9944\"}"
```

### Setup the substrate adapter

The Substrate Adapter is used to send the Oracle answer back to the substrate blockchain.

Again, we will use [Docker](https://hub.docker.com/r/smartcontract/substrate-adapter) to run this component, and find the necessary documentation on its [github repository](https://github.com/smartcontractkit/substrate-adapter).

We need to configure the connection settings between the adapter and the substrate chain:
- **SA_ENDPOINT** : easy one, that's our substrate chain web socket endpoint, _ws://172.17.0.1:9944_
- **SA_PRIVATE_KEY** : this one is much more obscure...
We need a substrate account to secure the calls from the adapter to the blockchain.
Let's create a new one, using the `subkey` tool provided by Parity:
```shell
> docker run --rm -it parity/subkey generate
Secret phrase `exhibit increase speed enrich tobacco shove want insane couple mistake industry asthma` is account:
  Secret seed:      0xba1f6e114f986e26a182fc5ad98462acd46dedaed5e9e390587372600dd5acf0
  Public key (hex): 0x5802187dc2e2ecdd17988adf48b348816defc2aa37ba41b62a5cdf604507633e
  Account ID:       0x5802187dc2e2ecdd17988adf48b348816defc2aa37ba41b62a5cdf604507633e
  SS58 Address:     5E46hBPAcWq9BWdLtMwGjY3GZWrHUcE1dpmAsBFqg5PJgkme
```
The **SA_PRIVATE_KEY** we are looking for is the **Secret seed** returned by the `subkey` tool.

> **Please save the Secret Phrase, Account ID and SS58 Address as well**. You will need them further in this tutorial.

Let's put all this stuff together in an environment file :
 ```shell
echo "SA_ENDPOINT=ws://172.17.0.1:9944" > substrate_adapter.env
echo "SA_PRIVATE_KEY=0xba1f6e114f986e26a182fc5ad98462acd46dedaed5e9e390587372600dd5acf0" >> substrate_adapter.env
echo "SA_TX_TYPE=immortal" >> substrate_adapter.env
```

And finally run our substrate adapter:
 ```shell
docker run -d -p 8081:8080 --name substrate-adapter --env-file substrate_adapter.env smartcontract/substrate-adapter
```

### Declare the chainlink bridge

The Susbtrate Adapter is actually an external adapter, so we need to [declare it](https://docs.chain.link/docs/node-operators) in the chainlink node as a bridge :

- Create a [new bridge](http://localhost:6688/bridges/new) from the Chainlink Node UI
- Set bridge values as follow:
	**Bridge Name** : substrate-adapter
	**Bridge URL** : http://172.17.0.1:8081


### Create the chainlink job

The final step to finish our work in the chainlink side is to create a new job that will :
- Be triggered by the **Substrate External Initiator**
- Call the **Price Feed External Adapter**
- Give the result to the **Substrate Adapter**

In chainlink, jobs are defined using [json](https://docs.chain.link/docs/job-specifications).
Here is the one we need to define :
```json
{
	"initiators": [
		{
			"type": "external",
			"params": {
				"name": "substrate-external-initiator",
		        "body": {
		          "endpoint": "substrate-node",
		          "accountIds": ["0x5802187dc2e2ecdd17988adf48b348816defc2aa37ba41b62a5cdf604507633e"]
		        }
			}
		}
	],
	"tasks": [
		{
			"type": "pricefeed-ea",
			"confirmations": null,
			"params": {}
		},
		{
			"type": "substrate-adapter",
			"confirmations": null,
			"params": {
				"type": "int128"
			}
		}
	]
}
```
Where:
- `initiators`: here we set that the job will be triggered by an external initiator, which name is **substrate-external-initiator** (the name we use when setting the Substrate External Initiator). The accountId value is the public key of the account we've create when setting up the External Adapter. 
- First  `task` : call the external adapter called **pricefeed-ea**, the name of the bridge we defined previously
- Second `task`: call the **substrate-adapter**, the bridge we defined when setting up the Substrate Adapter

Create a new job from the [Chainlink Node UI](http://localhost:6691/jobs/new) with the previous job specification.

You will get a jobId. **Take care of it, you will need it in the last part !**


## Getting price feed from our substrate blockchain

Now, we have finished with the Chainlink world setup, let's go to configure our substrate blockchain.

### Add the Chainlink Pallet

To interact with Chainlink from your substrate chain, we need to [add](https://substrate.dev/docs/en/tutorials/add-a-pallet/) the **chainlink-pallet** to our substrate runtime.

This pallet will :
- Generate the proper messages that will be understood by the **Substrate External Initiator**
- Handle the callback from the **Substrate Adapter**


The Chainlink pallet has not been packaged, so we need to get it from source :
```shell
git clone https://github.com/smartcontractkit/chainlink-polkadot.git
mv chainlink-polkadot/pallet-chainlink __YOUR_SUBSTRATE_NODE_FOLDER___/pallets
``` 

### Create a new Pricefeed pallet

In this step, we will create a new pallet that will request price feed using the Chainlink Pallet.

We create a new folder in the pallets folder of our node:
```shell
git clone https://github.com/smartcontractkit/chainlink-polkadot.git
mkdir -p __YOUR_SUBSTRATE_NODE_FOLDER___/pallets/pallet-pricefeed/src
``` 

The minimum _Cargo.toml_ file should reference the **chainlink-pallet**:
```toml
[package]  
edition = '2018'  
name = 'pallet-pricefeed'  
version = "2.0.0"  
  
[package.metadata.docs.rs]  
targets = ['x86_64-unknown-linux-gnu']  
  
[dependencies.codec]  
default-features = false  
features = ['derive']  
package = 'parity-scale-codec'  
version = '1.3.4'  
  
[dependencies]  
frame-support = { default-features = false, version = '2.0.0' }  
frame-system = { default-features = false, version = '2.0.0' }  
sp-std = { default-features = false, version = '2.0.0' }  
chainlink = { path = '../pallet-chainlink', default-features = false, version = '2.0.0', package = 'pallet-chainlink'}  
  
[dev-dependencies]  
sp-core = { default-features = false, version = '2.0.0' }  
sp-io = { default-features = false, version = '2.0.0' }  
  
[features]  
default = ['std']  
std = [  
    'codec/std',  
    'frame-support/std',  
    'frame-system/std',  
    'sp-std/std',  
    'chainlink/std',  
]
```

Now, we need to write some rust code, be prepared !
...or just copy/paste the following code to the file *./pallets/pallet-pricefeed/src/lib.rs*  
```rust
#![cfg_attr(not(feature = "std"), no_std)]  
  
use chainlink::{CallbackWithParameter, Trait as ChainlinkTrait};  
use codec::{Decode, Encode};  
use frame_support::{decl_module, decl_storage, dispatch::DispatchResult};  
use sp_std::prelude::*;  
use frame_system::{ensure_root, ensure_signed};  
  
pub trait Trait: ChainlinkTrait {  
   /// We need to provide our callback to Chainlink pallet  
  type Callback: From<Call<Self>> + Into<<Self as ChainlinkTrait>::Callback>;  
}  
  
decl_storage! {  
    trait Store for Module<T: Trait> as PriceFeedStorage {  
       /// Store the price value received from Chainlink  
  pub Price get(fn get_price): i128;  
  }  
}  
  
decl_module! {  
   pub struct Module<T: Trait> for enum Call where origin: T::Origin {  
      /// Request the price feed of a given pair  
  #[weight = 0]  
        pub fn request_price(origin, account_id: T::AccountId, job_id: Vec<u8>) -> DispatchResult {  
         // This request should be signed  
  ensure_signed(origin.clone())?;  
  // We give the pricePair parameter that will be used by the Price Feed External adapter  
  let parameters = ("pricePair", "LINK/USD");  
  // And the callback as well  
  let call: <T as Trait>::Callback = Call::callback(vec![]).into();  
  // Then we submit the request to the chainlink pallet  
  <chainlink::Module<T>>::initiate_request(origin, account_id, job_id, 0, parameters.encode(), 100, call.into())?;  
  // Assume that everything runs fine  
  Ok(())  
        }  
  
      // The callback is called by the pallet-chainlink upon result returned by the Chainlink job  
 // The result parameter hold the price value  #[weight = 0]  
        pub fn callback(origin, result: Vec<u8>) -> DispatchResult {  
            ensure_root(origin)?;  
  // We decode the result as an integer 128  
  let r : i128 = i128::decode(&mut &result[..]).map_err(|err| err.what())?;  
  // And store it into the Price attribute  
  <Price>::put(r);  
  // Great job ;)  
  Ok(())  
        }  
   }  
}  
  
// We implement the CallbackWithParameter for the pallet-chainlink  
impl <T: Trait> CallbackWithParameter for Call<T> {  
   fn with_result(&self, result: Vec<u8>) -> Option<Self> {  
      match *self {  
         Call::callback(_) => Some(Call::callback(result)),  
  _ => None  
      }  
   }  
}
```

### Configure the substrate runtime

It's time to configure our runtime to use the Chainlink and Pricefeed pallets.

First add them to our runtime *Cargo.tml* file :
```toml
...
[dependencies]
# Add these 2 lines to the dependencies
chainlink = { path = '../pallets/pallet-chainlink', default-features = false, version = '2.0.0', package = 'pallet-chainlink'}
pricefeed = { path = '../pallets/pallet-pricefeed', default-features = false, version = '2.0.0', package = 'pallet-pricefeed' }
...
[features]
...
std = [
...
	'chainlink/std', # Add this line
	'pricefeed/std', # and this one as well
...
```

These pallets needs some configuration in the *runtime/src/lib.rs* file :
```rust
// Add this block --->
pub use pricefeed::Call as PriceFeedCall;  
  
impl chainlink::Trait for Runtime {  
	type Event = Event;  
	type Currency = Balances;  
	type Callback = PriceFeedCall<Runtime>;  
	type ValidityPeriod = ValidityPeriod;  
}  
  
impl pricefeed::Trait for Runtime {  
	type Event = Event;  
	type Callback = PriceFeedCall<Runtime>;  
}  
  
parameter_types! {  
	pub const ValidityPeriod: u32 = 50;  
}
// <--- end of the added block
...
construct_runtime!(  
	pub enum Runtime where  
		Block = Block,  
		NodeBlock = opaque::Block,  
		UncheckedExtrinsic = UncheckedExtrinsic  
	{
		....
		// Add these 2 lines in the construct_runtime block
		Chainlink: chainlink::{Module, Call, Storage, Event<T>},  
		Pricefeed: pricefeed::{Module, Call, Storage},
	}
);
...
```

### Configure the substrate front-end 

For this tutorial, we will not code a custom component to interact with the pricefeed pallet.
But we need to do a little extra configuration, as the chainlink pallet use some custom types.

If you are familiar with Substrate development, you know it is done by adding things in the *src/config/common.json* file of the front-end repository.
Edit the file and add the following `SpecIndex`, `RequestIdentifier` and `DataVersion` to the `CUSTOM_TYPES` :
```json
	"CUSTOM_TYPES": {
		...
		"SpecIndex": "Vec<u8>", 
		"RequestIdentifier": "u64", 
		"DataVersion": "u64"
	}
...
``` 

### Setup the Chainlink Operator account

Do you remember the account we created during the substrate adapter setup ?

This account needs some further configuration :
- It needs to be fund, in order to callback the substrate blockchain from the substrate adapter
- It needs to be declared as a Chainlink Operator for the Chainlink Pallet

To do this, we need to add the Operator account to our Polkadot Browser extension:
- From the extension, select the **Import account from pre-existing seed** 
- Input the operator account mnemonic phrase (*exhibit increase speed enrich tobacco shove want insane couple mistake industry asthma* in our example)

From the Substrate UI, send some Units to the newly created account, and switch to this account. 
Now you can call the **registerOperator** extrinsics of the Chainlink Pallet. The operator account is now ready to do his job.


### Time to check everything works !

That was a long journey, but finally, we should see living price feed in our blockchain... well, we hope so ;)

We will use the **Pallet Interactor** UI component to request the price feed:
- Check the *Extrinsic* option of the Pallet Interactor
- Select the `pricefeed` pallet in the *Pallets/RPC list*
- Select the `requestPrice` callable
- In the `account_id` field, input the Chainlink **Operator Account address** (0x5802187dc2e2ecdd17988adf48b348816defc2aa37ba41b62a5cdf604507633e)
- In the last field, paste the chainlink **jobId** we've got previously (see *Create the Chainlink Job*) 
- Rage click the **Signed** button ! *And keep your fingers crossed...*

After a couple of seconds (let's say less than 10 seconds), you should be able to query the price received from the Oracle :
- Check the *Query* option of the Pallet Interactor
- Select the `pricefeed` pallet in the *Pallets/RPC list*
- Select the `price` callable
- Click the **Query** button

**If you see a figure below the query button, congrats !!! You've done the job and successfully connect the Price Feeds to the substrate chain !**



## Troubleshooting

Well, sometimes, things are not doing the way they should...

Here are some tips to help if you are in trouble:
- **The transaction failed** : check that you are using the correct account address in the request and that the account is registered as a chainlink operator
- **The event chainlink:OracleRequest is sent, but nothing more happens** : check the **substrate-external-initiator** container logs. You should see *job run trigger* log line. If not, check that the initiator is connected to the substrate chain and that the **jobId** used in the request match the jobId at the [chainlink node](http://localhost:6688/jobs)
- **The job fails on the chainlink node** : go to the [chainlink node runs UI](http://localhost:6688/runs) and check the **Error Log** tab. That should point you to the step that failed
- **The price-ea task failed** : check the [price-ea bridge](http://localhost:6691/bridges/pricefeed-ea) settings, the URL should match the URL of our running Price Feed external adapter. Check the log of the container as well
- **The substrate-adapter task failed** : same as the Price feed adapter, check URL and logs.

## Conclusion

**Now that you know how to get any price feed from your custom substrate blockchain, you are ready to make your own Defi dApp !**   

You can find the complete example of this tutorial in the [following repository](https://github.com/LaurentTrk/chainlink-substrate-tutorial).

The writing of this tutorial would not have been possible without :
-  The help of this [video](https://www.youtube.com/watch?v=0rZghy0TIOQ) made by the Polakadot and Chainlink teams
- This [detailed and original example](https://github.com/smartcontractkit/chainlink-polkadot)
- This [great workshop](https://www.youtube.com/watch?v=uf1-oOZZNe0) from the [2020 Chainlink Hackathon](https://hack.chain.link/)
- The support of the [Chainlink Community](https://discord.com/invite/aSK4zew) and especially @PatrickCollins !!


*Bridging Chainlink and Substrate has been part of my work for the Ki.Dot Project, my submission to the 2020 Chainlink Hackathon.
You can find all the details on this project at https://devpost.com/software/ki-dot-a-substrate-based-blockchain-to-help-micro-funding* 

