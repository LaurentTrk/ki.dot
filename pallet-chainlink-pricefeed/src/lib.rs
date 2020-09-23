#![cfg_attr(not(feature = "std"), no_std)]

use chainlink::{CallbackWithParameter, Event, Trait as ChainlinkTrait};
use codec::{Decode, Encode};
use frame_support::{decl_module, decl_storage, dispatch::DispatchResult};
use sp_std::prelude::*;
use frame_system::ensure_root;
use log::info;
use frame_support::traits::Get;
use sp_std::str;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub trait Trait: ChainlinkTrait {
	/// Because this pallet emits events, it depends on the runtime's definition of an event.
	type Event: From<Event<Self>> + Into<<Self as frame_system::Trait>::Event>;

	/// We need to provide our callback to Chainlink pallet
	type Callback: From<Call<Self>> + Into<<Self as ChainlinkTrait>::Callback>;

	/// The JobId on the Oracle which trigger calls to the Price Feed Adapter
	type OracleJobId: Get<Vec<u8>>;
	/// The AccountId set in the Oracle Job Initiator
	type OracleAccountId: Get<Vec<u8>>;
}

decl_storage! {
    trait Store for Module<T: Trait> as PriceFeedStorage {
    	/// Store the price value received from Chainlink
        pub Price: i128;
    }
}

decl_module! {
	pub struct Module<T: Trait> for enum Call where origin: T::Origin {
		// Events must be initialized if they are used by the pallet.
		fn deposit_event() = default;

		// Chainlink Oracle JobId and AccountId configurable constants
        const OracleJobId: Vec<u8> = T::OracleJobId::get();
        const OracleAccountId: Vec<u8> = T::OracleAccountId::get();

		#[weight = 0]
        pub fn request_price(origin, operator: T::AccountId, price_pair: Vec<u8>) -> DispatchResult {
			// TODO : Use configuration accountId and remove the need to pass it in this call
			info!("Request Price for {:?}", str::from_utf8(&price_pair));
            let parameters = ("pricePair", price_pair);
            let call: <T as Trait>::Callback = Call::callback(vec![]).into();
			info!("Calling initiate_request");
            <chainlink::Module<T>>::initiate_request(origin, operator, T::OracleJobId::get(), 0, parameters.encode(), 100, call.into())?;

            Ok(())
        }

		// The callback is called by the pallet-chainlink upon result returned by the Chainlink job
		// The result parameter hold the price value
		#[weight = 0]
        pub fn callback(origin, result: Vec<u8>) -> DispatchResult {
        	info!("Calling callback");
            ensure_root(origin)?;

            // The result is expected to be a SCALE encoded `i128`
            let r : i128 = i128::decode(&mut &result[..]).map_err(|err| err.what())?;
            <Price>::put(r);

            Ok(())
        }

	}
}

impl <T: Trait> CallbackWithParameter for Call<T> {
	fn with_result(&self, result: Vec<u8>) -> Option<Self> {
		match *self {
			Call::callback(_) => Some(Call::callback(result)),
			_ => None
		}
	}
}
