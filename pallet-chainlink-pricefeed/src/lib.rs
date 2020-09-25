#![cfg_attr(not(feature = "std"), no_std)]

use chainlink::{CallbackWithParameter, Event, Trait as ChainlinkTrait};
use codec::{Decode, Encode};
use frame_support::{decl_module, decl_storage, dispatch::DispatchResult};
use sp_std::prelude::*;
use frame_system::{ensure_root, ensure_signed};
use log::info;
use frame_support::traits::Get;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub trait Trait: ChainlinkTrait {
	/// Because this pallet emits events, it depends on the runtime's definition of an event.
	type Event: From<Event<Self>> + Into<<Self as frame_system::Trait>::Event>;

	/// We need to provide our callback to Chainlink pallet
	type Callback: From<Call<Self>> + Into<<Self as ChainlinkTrait>::Callback>;
}

decl_storage! {
    trait Store for Module<T: Trait> as PriceFeedStorage {
    	/// Store the latest price pair requested
        pub PricePair: Vec<u8>;
    	/// Store the price value received from Chainlink
        pub Price: i128;
		/// The JobId on the Oracle which trigger calls to the Price Feed Adapter
		pub OracleJobId: Vec<u8>;
		/// The AccountId set in the Oracle Job Initiator
		pub OracleAccountId: T::AccountId;
    }
}

decl_module! {
	pub struct Module<T: Trait> for enum Call where origin: T::Origin {
		// Events must be initialized if they are used by the pallet.
		fn deposit_event() = default;

		#[weight = 0]
        pub fn set_oracle_configuration(origin, account_id: T::AccountId, job_id: Vec<u8>) -> DispatchResult {
			ensure_root(origin)?;
			<OracleJobId>::put(job_id);
			<OracleAccountId<T>>::put(account_id);
            Ok(())
        }


		#[weight = 0]
        pub fn request_price(origin, price_pair: Vec<u8>) -> DispatchResult {

			info!("Request Price for {:?} using {:?}", price_pair.clone(), <OracleJobId>::get());
			ensure_signed(origin.clone())?;
            let parameters = ("pricePair", price_pair.clone());
            let call: <T as Trait>::Callback = Call::callback(vec![]).into();

			info!("Calling initiate_request");
			<PricePair>::put(price_pair);
			<chainlink::Module<T>>::initiate_request(origin, <OracleAccountId<T>>::get(), <OracleJobId>::get(), 0, parameters.encode(), 100, call.into())?;

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
