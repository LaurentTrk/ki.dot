#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{decl_module, decl_storage, decl_event, ensure, decl_error, dispatch,
					traits::{Get, Currency, ExistenceRequirement::AllowDeath}};
use frame_system::{self as system, ensure_root, ensure_signed};
use codec::{Encode, Decode};
use log::info;
use sp_std::prelude::*;
use frame_support::traits::{ ReservableCurrency, BalanceStatus };
use sp_runtime::{traits::AccountIdConversion, ModuleId};


#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub type LoanId = u32;
pub type AmountLended = u32;

#[derive(Encode, Decode)]
pub struct Lender<T: Trait> {
	pub lender_account: T::AccountId,
	pub lend_amount: AmountLended,
}
#[derive(Encode, Decode, Default)]
pub struct LoanDetails {
	pub loan_id: LoanId,
	pub loan_amount: AmountLended,
	pub funded_amount: AmountLended,
}

type BalanceOf<T> = <<T as Trait>::Currency as Currency<<T as system::Trait>::AccountId>>::Balance;

/// Hardcoded Kidot Account to hold funds to loan; used to create the special Pot Account
/// Must be exactly 8 characters long
const KIDOT_ACCOUNT_ID: ModuleId = ModuleId(*b".Ki.Dot.");

pub trait Trait: frame_system::Trait {
	type Event: From<Event<Self>> + Into<<Self as frame_system::Trait>::Event>;
	type Currency: ReservableCurrency<Self::AccountId>;
}

decl_storage! {
	trait Store for Module<T: Trait> as KidotLoanModule {
		pub Loans get(fn get_loans): Vec<LoanId>;
		pub LoansDetails get(fn get_loan_details): map hasher(blake2_128_concat) LoanId => LoanDetails;
		pub LoansLenders get(fn get_loan_lenders): map hasher(blake2_128_concat) LoanId => Vec<Lender<T>>;
	}
}

decl_event!(
	pub enum Event<T> where AccountId = <T as frame_system::Trait>::AccountId {
		/// A loan has been added
		LoanAdded(LoanId, AccountId),
		/// A loan has been funded
		LoanFunded(LoanId, AccountId, AmountLended),
		/// A loan has been fully funded
		LoanFullyFunded(LoanId, AmountLended),
	}
);

// Errors inform users that something went wrong.
decl_error! {
	pub enum Error for Module<T: Trait> {
		/// The loan already exists.
		LoanAlreadyExists,
		/// The loan has been already completely funded.
		LoanAlreadyCompleted,
		/// The lender has not enough bucks to fund.
		InsufficientBalance,
	}
}

decl_module! {
	pub struct Module<T: Trait> for enum Call where origin: T::Origin {
		// Errors must be initialized if they are used by the pallet.
		type Error = Error<T>;

		// Events must be initialized if they are used by the pallet.
		fn deposit_event() = default;

		/// Reset loans
		#[weight = 10_000 + T::DbWeight::get().writes(1)]
		pub fn reset_loan(origin) -> dispatch::DispatchResult {
			// Checks
			let who = ensure_root(origin)?;

			let mut loans:Vec<LoanId> = Vec::new();
			<Loans>::put(loans);
			// TODO : reset maps

			// TODO : Self::deposit_event(RawEvent::LoanAdded(loan_id, who));
			Ok(())
		}

		/// Add a new loan
		#[weight = 10_000 + T::DbWeight::get().writes(1)]
		pub fn add_loan(origin, loan_id: LoanId, loan_amount: AmountLended) -> dispatch::DispatchResult {
			// Checks
			let who = ensure_root(origin)?;
			// TODO
			// ensure!(!<Loans>::contains(&loan_id), Error::<T>::LoanAlreadyExists);

			Self::create_loan(loan_id, loan_amount);

			// TODO : Self::deposit_event(RawEvent::LoanAdded(loan_id, who));
			Ok(())
		}

		/// Lend some bucks to a loan
		#[weight = 10_000 + T::DbWeight::get().writes(1)]
		pub fn lend(origin, loan: LoanId, amount: AmountLended) -> dispatch::DispatchResult {
			// Checks
			let who = ensure_signed(origin)?;
			ensure!(T::Currency::can_reserve(&who, amount.into()), Error::<T>::InsufficientBalance);
			ensure!(!Self::loan_is_completed(loan), Error::<T>::LoanAlreadyCompleted);
			// TODO : ensure!(<Loans>::contains(&loan), Error::<T>::LoanAlreadyExists);

			T::Currency::reserve(&who, amount.into())?;
			let lender = Lender {
				lender_account: who.clone(),
				lend_amount: amount};
			Self::add_lender(loan, lender);

			info!("Loan {} has now {} lenders", loan, Self::get_loan_lenders(loan).len());
			info!("There's now {} loans", Self::get_loans().len());

			Self::deposit_event(RawEvent::LoanFunded(loan, who, amount));
			Self::fund_loan_if_enough_amount(loan);

			Ok(())
		}
	}
}

impl<T: Trait> Module<T> {

	fn create_loan(loan_id: LoanId, loan_amount: AmountLended){
		let mut lenders:Vec<Lender<T>> = Vec::new();
		let mut loans;
		let mut loan_details;
		info!("Creating new loan for {}", loan_id);
		if Self::get_loans().len() == 0 {
			loans = Vec::new();
		}else{
			loans = Self::get_loans();
		}

		loan_details = LoanDetails {
			loan_id: loan_id,
			loan_amount: loan_amount,
			funded_amount: 0
		};
		loans.push(loan_id);
		<LoansDetails>::insert(loan_id, loan_details);
		<Loans>::put(loans);
		<LoansLenders<T>>::insert(loan_id, lenders);
		info!("There's now {} loans", Self::get_loans().len());
	}

	fn add_lender(loan_id: LoanId, lender: Lender<T>) {
		let mut lenders;
		let mut loans;
		let mut loan_details;
		loans = Self::get_loans();
		info!("Adding new lender for {}", loan_id);
		lenders = Self::get_loan_lenders(loan_id);
		loan_details = Self::get_loan_details(loan_id);
		loan_details.funded_amount += lender.lend_amount;
		lenders.push(lender);

		<LoansDetails>::insert(loan_id, loan_details);
		<LoansLenders<T>>::insert(loan_id, lenders);
		<Loans>::put(loans);
	}

	fn fund_loan_if_enough_amount(loan: LoanId) {

		let lenders = Self::get_loan_lenders(loan);
		let mut funded_amount : u32 = 0;
		for i in 0..lenders.len() {
			funded_amount += lenders[i].lend_amount;
		}
		info!("Amount funded for {} = {}", loan, funded_amount);
		if Self::loan_is_completed(loan) {
			Self::deposit_event(RawEvent::LoanFullyFunded(loan, funded_amount));
			let _ = T::Currency::make_free_balance_be(
				&<Module<T>>::account_id(),
				T::Currency::minimum_balance(),
			);
			for i in 0..lenders.len() {
				info!("Lender Balance Before= {:?}", T::Currency::free_balance(&lenders[i].lender_account));
				info!("Lender Reserved Balance Before= {:?}", T::Currency::reserved_balance(&lenders[i].lender_account));
				T::Currency::repatriate_reserved(&lenders[i].lender_account, &Self::account_id(),
												 lenders[i].lend_amount.into(), BalanceStatus::Free);
				info!("Reserve rapatriate for lender {:?}/{}", lenders[i].lender_account, lenders[i].lend_amount);
				info!("Lender Balance After= {:?}", T::Currency::free_balance(&lenders[i].lender_account));
				info!("Lender Reserved Balance After= {:?}", T::Currency::reserved_balance(&lenders[i].lender_account));

			}
			info!("Reserve of pot is {:?}", Self::funds());
		}
	}

	fn loan_is_completed(loan: LoanId) -> bool {

		let loan_details = Self::get_loan_details(loan);
		info!("Amount funded for {} = {} / {}", loan, loan_details.funded_amount, loan_details.loan_amount);
		return loan_details.loan_amount > 0 && loan_details.funded_amount >= loan_details.loan_amount;
	}

	/// The account ID that holds the funds allocated by lenders to loans
	pub fn account_id() -> T::AccountId {
		KIDOT_ACCOUNT_ID.into_account()
	}

	/// The total of all funds
	fn funds() -> BalanceOf<T> {
		T::Currency::free_balance(&Self::account_id())
	}
}
