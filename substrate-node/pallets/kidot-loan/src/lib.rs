#![cfg_attr(not(feature = "std"), no_std)]

use codec::{Decode, Encode, Compact};
use frame_support::{decl_error, decl_event, decl_module, decl_storage, dispatch, ensure,
                    traits::{Currency}};
use frame_support::traits::{BalanceStatus, ReservableCurrency};
use frame_system::{self as system, ensure_root, ensure_signed};
use log::info;
use sp_runtime::{ModuleId, traits::AccountIdConversion};
use sp_std::prelude::*;
use pricefeed::PriceFeeds;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub type LoanId = u32;
pub type Amount = u32;

#[derive(Encode, Decode)]
pub struct Lender<T: Trait> {
    pub lender_account: T::AccountId,
    pub lend_amount: Amount
}

#[derive(Encode, Decode, Default)]
pub struct LoanDetails {
    pub loan_id: LoanId,
    pub loan_amount: Amount,
    pub funded_amount: Amount,
    pub payed_back_amount: Amount,
}

type BalanceOf<T> = <<T as Trait>::Currency as Currency<<T as system::Trait>::AccountId>>::Balance;

/// Hardcoded Kidot Account to hold funds to loan; used to create the special Pot Account
/// Must be exactly 8 characters long
const KIDOT_ACCOUNT_ID: ModuleId = ModuleId(*b".Ki.Dot.");

pub trait Trait: frame_system::Trait {
    type Event: From<Event<Self>> + Into<<Self as frame_system::Trait>::Event>;
    type Currency: ReservableCurrency<Self::AccountId>;
    type PriceFeed: PriceFeeds;
}

decl_storage! {
	trait Store for Module<T: Trait> as KidotLoanModule {
		pub Loans get(fn get_loans): Vec<LoanId>;
		pub LoansDetails get(fn get_loan_details): map hasher(blake2_128_concat) LoanId => LoanDetails;
		pub LoansLenders get(fn get_loan_lenders): map hasher(blake2_128_concat) LoanId => Vec<Lender<T>>;
		pub ReservedLoansAmount get(fn get_reserved_loans_amount): Amount = 0;
		pub FundedLoansAmount get(fn get_funded_loans_amount): Amount = 0;
		pub PayedBackLoansAmount get(fn get_payed_back_loans_amount): Amount = 0;
	}
	add_extra_genesis {
		build(|_config| {
			let _ = T::Currency::make_free_balance_be(
				&<Module<T>>::account_id(),
				T::Currency::minimum_balance(),
			);
		});
	}
}

decl_event!(
	pub enum Event<T> where AccountId = <T as frame_system::Trait>::AccountId {
		/// Loans have been reset
		LoansReset(AccountId),
		/// A loan has been added
		LoanAdded(LoanId, AccountId),
		/// A loan has been funded
		LoanFunded(LoanId, AccountId, Amount),
		/// A loan has been fully funded
		LoanFullyFunded(LoanId, Amount),
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
		#[weight = 10_000]
		pub fn reset_loans(origin) -> dispatch::DispatchResult {
			// Checks
			ensure_root(origin)?;
			// FIX : how to get who's root ?
            // let who = ensure_signed(origin)?;

			let loans:Vec<LoanId> = Vec::new();
			<Loans>::put(loans);
			for (_loan, _details) in LoansDetails::iter() {
                LoansDetails::remove(_loan);
            }
			for (_loan, _lenders) in LoansLenders::<T>::iter() {
                LoansLenders::<T>::remove(_loan);
            }
            <ReservedLoansAmount>::put(0);
            <FundedLoansAmount>::put(0);
            <PayedBackLoansAmount>::put(0);

			Ok(())
		}

		/// Add a new loan
		#[weight = 10_000]
		pub fn add_loan(origin, loan_id: LoanId, loan_amount: Amount) -> dispatch::DispatchResult {
			// Checks
			ensure_root(origin)?;
			let loans = Self::get_loans();
			ensure!(!loans.contains(&loan_id), Error::<T>::LoanAlreadyExists);

info!("Current Price =  {:?}", T::PriceFeed::latest_price());

			Self::create_loan(loan_id, loan_amount);

			// Self::deposit_event(RawEvent::LoanAdded(loan_id, who));
			Ok(())
		}

		/// Lend some bucks to a loan
		#[weight = 10_000]
		pub fn lend(origin, loan: LoanId, amount: Amount) -> dispatch::DispatchResult {
			// Checks
			let who = ensure_signed(origin)?;
			ensure!(T::Currency::can_reserve(&who, amount.into()), Error::<T>::InsufficientBalance);
			ensure!(!Self::loan_is_completed(loan), Error::<T>::LoanAlreadyCompleted);
			let loans = Self::get_loans();
			ensure!(loans.contains(&loan), Error::<T>::LoanAlreadyExists);

			T::Currency::reserve(&who, amount.into())?;
			Self::add_lender(loan, who.clone(), amount);

			info!("Loan {} has now {} lenders", loan, Self::get_loan_lenders(loan).len());
			info!("There's now {} loans", Self::get_loans().len());

			Self::deposit_event(RawEvent::LoanFunded(loan, who, amount));
			Self::fund_loan_if_enough_amount(loan);
			Ok(())
		}
	}
}

impl<T: Trait> Module<T> {
    fn create_loan(loan_id: LoanId, loan_amount: Amount) {
        let lenders: Vec<Lender<T>> = Vec::new();
        let mut loans;
        let loan_details;
        info!("Creating new loan for {}", loan_id);
        if Self::get_loans().len() == 0 {
            loans = Vec::new();
        } else {
            loans = Self::get_loans();
        }

        loan_details = LoanDetails {
            loan_id: loan_id,
            loan_amount: loan_amount,
            funded_amount: 0,
            payed_back_amount: 0
        };
        loans.push(loan_id);
        <LoansDetails>::insert(loan_id, loan_details);
        <Loans>::put(loans);
        <LoansLenders<T>>::insert(loan_id, lenders);
        info!("There's now {} loans", Self::get_loans().len());
    }

    fn add_lender(loan_id: LoanId, lender_account: T::AccountId, lend_amount: Amount) {
        let mut lenders;
        let loans;
        let mut loan_details;
        let lender = Lender { lender_account, lend_amount };
        loans = Self::get_loans();
        info!("Adding new lender for {}", loan_id);
        lenders = Self::get_loan_lenders(loan_id);
        loan_details = Self::get_loan_details(loan_id);
        loan_details.funded_amount += lend_amount;
        lenders.push(lender);

        Self::update_reserved_amount(lend_amount);

        <LoansDetails>::insert(loan_id, loan_details);
        <LoansLenders<T>>::insert(loan_id, lenders);
        <Loans>::put(loans);
    }

    fn fund_loan_if_enough_amount(loan: LoanId) {
        let lenders = Self::get_loan_lenders(loan);
        let mut funded_amount: u32 = 0;
        for i in 0..lenders.len() {
            funded_amount += lenders[i].lend_amount;
        }
        info!("Amount funded for {} = {}", loan, funded_amount);

        if Self::loan_is_completed(loan) {
            Self::deposit_event(RawEvent::LoanFullyFunded(loan, funded_amount));
            // let _ = T::Currency::make_free_balance_be(
            //     &<Module<T>>::account_id(),
            //     T::Currency::minimum_balance(),
            // );
            for i in 0..lenders.len() {
                info!("Lender Balance Before= {:?}", T::Currency::free_balance(&lenders[i].lender_account));
                info!("Lender Reserved Balance Before= {:?}", T::Currency::reserved_balance(&lenders[i].lender_account));
                let _ = T::Currency::repatriate_reserved(&lenders[i].lender_account, &Self::account_id(),
                                                 lenders[i].lend_amount.into(), BalanceStatus::Free);
                info!("Reserve rapatriate for lender {:?}/{}", lenders[i].lender_account, lenders[i].lend_amount);
                info!("Lender Balance After= {:?}", T::Currency::free_balance(&lenders[i].lender_account));
                info!("Lender Reserved Balance After= {:?}", T::Currency::reserved_balance(&lenders[i].lender_account));
            }
            info!("Reserve of pot is {:?}", Self::funds());

            Self::update_funded_amount(funded_amount);
            Self::transfer_reserved_amount(funded_amount);
        }
    }

    fn loan_is_completed(loan: LoanId) -> bool {
        let loan_details = Self::get_loan_details(loan);
        // One KD = 1000 unit
        let fundedInUSD = (loan_details.funded_amount / 1000) * (T::PriceFeed::latest_price() as u32 / 100000000);
        info!("Amount funded for {} = {} mKD$ = {} USD / {}", loan, loan_details.funded_amount, fundedInUSD, loan_details.loan_amount);
        return loan_details.loan_amount > 0 && fundedInUSD >= loan_details.loan_amount;
    }


    fn update_reserved_amount(lend_amount: Amount){
        let mut amount_reserved = Self::get_reserved_loans_amount();
        amount_reserved +=  lend_amount;
        <ReservedLoansAmount>::put(amount_reserved);
    }

    fn update_funded_amount(lend_amount: Amount){
        let mut amount_funded = Self::get_funded_loans_amount();
        amount_funded +=  lend_amount;
        <FundedLoansAmount>::put(amount_funded);
    }

    fn transfer_reserved_amount(lend_amount: Amount){
        let mut amount_reserved = Self::get_reserved_loans_amount();
        amount_reserved -=  lend_amount;
        <ReservedLoansAmount>::put(amount_reserved);
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
