use crate::{mock::*};
use frame_support::{assert_ok};

#[test]
fn it_works_for_default_value() {
	new_test_ext().execute_with(|| {
		// Dispatch a signed extrinsic.
		assert_ok!(KidotLoanModule::lend(Origin::signed(1), 124589, 500));
		// Read pallet storage and assert an expected result.
		assert_eq!(KidotLoanModule::get_loan_lenders(124589).len(),1);
		assert_eq!(KidotLoanModule::get_loans().len(),1);
		assert_eq!(KidotLoanModule::get_loan_details(124589).funded_amount,500);
		assert_eq!(KidotLoanModule::get_loan_details(124589).loan_amount,50000);

		assert_ok!(KidotLoanModule::lend(Origin::signed(2), 124589, 500));
		assert_eq!(KidotLoanModule::get_loan_lenders(124589).len(),2);
		assert_eq!(KidotLoanModule::get_loans().len(),1);
		assert_eq!(KidotLoanModule::get_loan_details(124589).funded_amount,1000);
	});
}

// #[test]
// fn correct_error_for_none_value() {
// 	new_test_ext().execute_with(|| {
// 		// Ensure the expected error is thrown when no value is present.
// 		assert_noop!(
// 			TemplateModule::cause_error(Origin::signed(1)),
// 			Error::<Test>::NoneValue
// 		);
// 	});
// }
