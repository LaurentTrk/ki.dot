#![cfg_attr(not(feature = "std"), no_std)]

use codec::{Decode, Encode};
use frame_support::{decl_error, decl_event, decl_module, decl_storage, dispatch, ensure,
                    traits::{Currency}};
use frame_support::traits::{BalanceStatus, ReservableCurrency, ExistenceRequirement};
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
		pub StakedAmount get(fn get_staked_amount): Amount = 0;
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
		#[weight = 0]
		pub fn reset_loans(origin) -> dispatch::DispatchResult {
			// Checks
			ensure_root(origin)?;
			// FIX : how to get who's root ?
            // let who = ensure_signed(origin)?;

            Self::reset_funds();
            Self::reset_loans_storage();
            <ReservedLoansAmount>::put(0);
            <FundedLoansAmount>::put(0);
            <StakedAmount>::put(0);
            <PayedBackLoansAmount>::put(0);

			Ok(())
		}

		/// Add a new loan
		#[weight = 0]
		pub fn add_loan(origin, loan_id: LoanId, loan_amount: Amount) -> dispatch::DispatchResult {
			// Checks
			ensure_root(origin)?;
			ensure!(!Self::get_loans().contains(&loan_id), Error::<T>::LoanAlreadyExists);

			Self::create_loan(loan_id, loan_amount);

			// Self::deposit_event(RawEvent::LoanAdded(loan_id, who));
			Ok(())
		}

		/// Lend some bucks to a loan
		#[weight = 0]
		pub fn lend(origin, loan: LoanId, amount: Amount) -> dispatch::DispatchResult {
			// Checks
			let who = ensure_signed(origin)?;
			ensure!(T::Currency::can_reserve(&who, amount.into()), Error::<T>::InsufficientBalance);
			ensure!(!Self::loan_is_completed(loan), Error::<T>::LoanAlreadyCompleted);
			let loans = Self::get_loans();
			ensure!(loans.contains(&loan), Error::<T>::LoanAlreadyExists);

			T::Currency::reserve(&who, Self::amount_to_reserve(amount).into())?;
			Self::add_lender(loan, who.clone(), amount);

			info!("Loan {} has now {} lenders", loan, Self::get_loan_lenders(loan).len());
			info!("There's now {} loans", Self::get_loans().len());

			Self::deposit_event(RawEvent::LoanFunded(loan, who, amount));
			Self::fund_loan_if_enough_amount(loan);
			Ok(())
		}

		/// Simulate a one month payback for all completed loans
		#[weight = 0]
		pub fn payback(origin) -> dispatch::DispatchResult {
			// Checks
			let _who = ensure_signed(origin)?;
			Self::payback_completed_loans();
			Ok(())
		}
	}
}

impl<T: Trait> Module<T> {

    fn reset_funds(){
        let _ = T::Currency::make_free_balance_be(
            &<Module<T>>::account_id(),
            T::Currency::minimum_balance(),
        );
    }

    fn reset_loans_storage(){
        let loans:Vec<LoanId> = Vec::new();
        <Loans>::put(loans);
        for (_loan, _details) in LoansDetails::iter() {
            LoansDetails::remove(_loan);
        }
        for (_loan, _lenders) in LoansLenders::<T>::iter() {
            LoansLenders::<T>::remove(_loan);
        }
    }

    fn amount_to_reserve(amount: Amount) -> Amount{
        // We need to reserve twice the amount, 1 for funding laon + 1 for staking
        let to_reserve: Amount = amount * 2;
        return to_reserve;
    }

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

        Self::update_reserved_amount(Self::amount_to_reserve(lend_amount));

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
            for i in 0..lenders.len() {
                let _ = T::Currency::repatriate_reserved(&lenders[i].lender_account, &Self::account_id(),
                                                         Self::amount_to_reserve(lenders[i].lend_amount).into(), BalanceStatus::Free);
            }
            info!("Reserve of pot is {:?}", Self::funds());

            Self::update_funded_amount(funded_amount);
            Self::update_staked_amount(funded_amount);
            Self::transfer_reserved_amount(Self::amount_to_reserve(funded_amount));
        }
    }

    fn payback_completed_loans() {
        // New reward from staking, give it to the Ki.Dot pot
        let monthly_reward_from_staking : Amount = Self::get_staked_amount() / 100;  // 1% per month
        let _ = T::Currency::deposit_into_existing(&Self::account_id(), monthly_reward_from_staking.into());
        for loan_id in &Self::get_loans() {
            if Self::loan_is_completed(loan_id.clone()){
                let mut loan_details = Self::get_loan_details(loan_id);
                if loan_details.payed_back_amount < loan_details.funded_amount{
                    let amount_paid_back: Amount = loan_details.funded_amount / 10; // Paid back in 10 months
                    info!("Paying back {} to {}, need {} to paid back", amount_paid_back, loan_id, loan_details.funded_amount - loan_details.payed_back_amount);
                    loan_details.payed_back_amount += amount_paid_back;
                    <LoansDetails>::insert(loan_id, loan_details);
                    Self::pay_back_lenders(*loan_id);

                    // Increase stake amount
                    Self::update_staked_amount(monthly_reward_from_staking);
                    Self::pay_back_staking(*loan_id, amount_paid_back);
                    Self::update_paid_back_amount(amount_paid_back);
                    Self::transfer_funded_amount(amount_paid_back);
                }
            }
        }
    }

    fn pay_back_staking(loan_id: LoanId, amount_paid_back: Amount) {
        // TODO : compute are not correct here, lenders should benefit from staking among months...
        // Then reverse the lender staked amount
        for lender in &Self::get_loan_lenders(loan_id) {
            let lender_paid_back = lender.lend_amount / 10;
            info!("Paying staked and reward {} to {:?}", lender_paid_back, lender.lender_account);
            let _ = T::Currency::transfer(&Self::account_id(), &lender.lender_account, lender_paid_back.into(), ExistenceRequirement::AllowDeath);
        }
        Self::transfer_staked_amount(amount_paid_back);
        Self::update_paid_back_amount(amount_paid_back);
    }

    fn pay_back_lenders(loan_id: LoanId) {
        for lender in &Self::get_loan_lenders(loan_id) {
            let lender_paid_back = lender.lend_amount / 10;
            info!("Paying back {} to {:?}", lender_paid_back, lender.lender_account);
            let _ = T::Currency::transfer(&Self::account_id(), &lender.lender_account, lender_paid_back.into(), ExistenceRequirement::AllowDeath);
        }
    }

    fn loan_is_completed(loan: LoanId) -> bool {
        let loan_details = Self::get_loan_details(loan);
        // One KD = 1000 unit
        let funded_in_usd = (loan_details.funded_amount / 1000) * (T::PriceFeed::latest_price() as u32 / 100000000);
        info!("Amount funded for {} = {} mKD$ = {} USD / {}", loan, loan_details.funded_amount, funded_in_usd, loan_details.loan_amount);
        return loan_details.loan_amount > 0 && funded_in_usd >= loan_details.loan_amount;
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

    fn update_staked_amount(lend_amount: Amount){
        let mut amount_staked = Self::get_staked_amount();
        amount_staked +=  lend_amount;
        <StakedAmount>::put(amount_staked);
    }

    fn update_paid_back_amount(lend_amount: Amount){
        let mut amount_paid_back = Self::get_payed_back_loans_amount();
        amount_paid_back +=  lend_amount;
        <PayedBackLoansAmount>::put(amount_paid_back);
    }
    fn transfer_reserved_amount(lend_amount: Amount){
        let mut amount_reserved = Self::get_reserved_loans_amount();
        amount_reserved -=  lend_amount;
        <ReservedLoansAmount>::put(amount_reserved);
    }

    fn transfer_funded_amount(lend_amount: Amount){
        let mut amount_funded = Self::get_funded_loans_amount();
        amount_funded -=  lend_amount;
        <FundedLoansAmount>::put(amount_funded);
    }

    fn transfer_staked_amount(lend_amount: Amount){
        let mut amount_staked = Self::get_staked_amount();
        amount_staked -=  lend_amount;
        <StakedAmount>::put(amount_staked);
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
