import React, { useEffect, useState } from 'react';
import {Table, Card, Grid, Statistic, Form, Input} from 'semantic-ui-react';

import {useSubstrate} from '../substrate-lib';
import axios from "axios";
import {TxButton} from "../substrate-lib/components";

function Main (props) {
  const { api } = useSubstrate();
  const { accountPair } = props;
  const [userData, setUserData] = useState({});
  const [loansDetails, setLoansDetails] = useState({});
  const [loanToFund, setLoanToFund] = useState({});
  const [amountToFund, setAmountToFund] = useState({});
  const kivaApiUrl = "https://api.kivaws.org/graphql";
  const [status, setStatus] = useState('');

  const getGiHubUserWithAxios = async () => {
    const response = await axios.post(kivaApiUrl, JSON.stringify({ query: "{lend {loan (id: 1568001){id name}}}" }),
        {headers:{ 'Content-Type': 'application/json' }});
    console.log(response.data.data);
    setUserData(response.data.data.lend.loan.name);
  };
  useEffect(() => {
    getGiHubUserWithAxios();

    let unsubscribe;
    api.query.kidotLoan.loans(rawDataLoans => {
      const loansId = rawDataLoans.map(r => r.toString());

      api.query.kidotLoan.loansDetails.multi(loansId, loansDetailsRaw => {
        const loansDetails = loansDetailsRaw.map(loanDetails => {
              return {loanId : loanDetails.loanId.toNumber(), loanAmount: loanDetails.loanAmount.toNumber(), fundedAmount: loanDetails.fundedAmount.toNumber()}
        });
        setLoansDetails(loansDetails);
        console.log(loansDetails)
      });
    }).then(unsub => {
      unsubscribe = unsub;
    })
        .catch(console.error);


  }, []);


  useEffect(() => {
    let unsubscribe;
    // api.query.templateModule.something(newValue => {
    //   // The storage value is an Option<u32>
    //   // So we have to check whether it is None first
    //   // There is also unwrapOr
    //   if (newValue.isNone) {
    //     setCurrentValue('<None>');
    //   } else {
    //     setCurrentValue(newValue.unwrap().toNumber());
    //   }
    // }).then(unsub => {
    //   unsubscribe = unsub;
    // })
    //   .catch(console.error);

    return () => unsubscribe && unsubscribe();
  }, [api.query.templateModule]);

  return (
    <Grid.Column width={8}>
      <h1>Loans List</h1>
      {loansDetails && loansDetails.length > 0 && <Table color='blue'>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>ID</Table.HeaderCell>
            <Table.HeaderCell>Loan Amount</Table.HeaderCell>
            <Table.HeaderCell>Funded Amount</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>{ loansDetails.map(loanDetails => {
          //const id = u8aToString(loanDetails.loanId);
          return <Table.Row key={loanDetails.loanId}>
            <Table.Cell>{ loanDetails.loanId.toString() }</Table.Cell>
            <Table.Cell>{ loanDetails.loanAmount.toString() }</Table.Cell>
            <Table.Cell>{ loanDetails.fundedAmount.toString() }</Table.Cell>
          </Table.Row>;
        })}</Table.Body>
      </Table>}

      <h1>Fund Loan</h1>
      <Form>
        <Form.Field>
          <Input
              label='Loan ID'
              state='loanToFund'
              type='number'
              onChange={(_, { value }) => setLoanToFund(value)}
          />
        </Form.Field>
        <Form.Field>
          <Input
              label='Loan Amount'
              state='amountToFund'
              type='number'
              onChange={(_, { value }) => setAmountToFund(value)}
          />
        </Form.Field>
        <Form.Field style={{ textAlign: 'center' }}>
          <TxButton
              accountPair={accountPair}
              label='Fund'
              type='SIGNED-TX'
              setStatus={setStatus}
              attrs={{
                palletRpc: 'kidotLoan',
                callable: 'lend',
                inputParams: [loanToFund, amountToFund],
                paramFields: [true, true]
              }}
          />
        </Form.Field>
        <div style={{ overflowWrap: 'break-word' }}>{status}</div>
      </Form>


    </Grid.Column>
  );
}

export default function Loans (props) {
  const { api } = useSubstrate();
  return <Main {...props} />;
}
