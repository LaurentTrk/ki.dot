import React, {useEffect, useState} from 'react';
import {Button, Card, Divider, Flag, Image, Progress, Segment, Statistic} from 'semantic-ui-react';

import {useSubstrate} from '../substrate-lib';
import axios from "axios";
import {TxButton} from "../substrate-lib/components";

const ONE_KD_UNIT = 1000;
const NANO_DOLLAR = 100000000;
// One Link = One KD  = 10.33921771 USD
// KDPrice returned = 1033921771
// So USD = (KValue / ONE_KD_UNIT) * (KDPrice / 100000000)
const toKDUnit = (value) => Math.round(value * 100 / ONE_KD_UNIT) / 100;


function LoanCard(props) {
    const resetRandomLoan = (status) => {
        props.setStatus(status);
        props.setRandomLoan(null);
    }
    const fundedInDollars = props.toUSD(props.loan.fundedAmount);
    const loanIsCompleted = fundedInDollars >= props.loan.loanAmount;
    const cleanedDescription = props.loan.description.slice(0, 200).replace(/<|>|br|\//g,'') + '...'

    return <Card color={'green'} style={{width: '200px'}}>
        <Image src={props.loan.image.url} wrapped ui={false}/>
        <Card.Content>
            <Card.Header>{props.loan.name}</Card.Header>
            <Card.Meta>
                <Flag name={props.loan.geocode.country.isoCode.toLowerCase()}/>
                <span className='date'>{props.loan.loanAmount + ' USD'}</span>
            </Card.Meta>
            <Card.Description>{cleanedDescription}</Card.Description>
        </Card.Content>
        <Card.Content extra>
            <Progress progress={loanIsCompleted ? null : 'value'} disabled={props.loan.isNew}
                      value={!loanIsCompleted ? fundedInDollars : props.loan.loanAmount}
                      total={props.loan.loanAmount}
                      size='small'
                      color={props.loan.isNew ? '' : !loanIsCompleted ? 'yellow' : 'green'}>{loanIsCompleted ? "Funded !" : ""}</Progress>
            {!props.loan.isNew &&
            <Button.Group>
                <TxButton
                    accountPair={props.accountPair}
                    disabled={loanIsCompleted}
                    label='KD$ 10'
                    type='SIGNED-TX'
                    setStatus={props.setStatus}
                    attrs={{
                        palletRpc: 'kidotLoan',
                        callable: 'lend',
                        inputParams: [props.loan.id, 10000],
                        paramFields: [true, true]
                    }}
                />
                <TxButton
                    accountPair={props.accountPair}
                    disabled={loanIsCompleted}
                    label='KD$ 50'
                    type='SIGNED-TX'
                    setStatus={props.setStatus}
                    attrs={{
                        palletRpc: 'kidotLoan',
                        callable: 'lend',
                        inputParams: [props.loan.id, 50000],
                        paramFields: [true, true]
                    }}
                />
            </Button.Group>}
            {props.loan.isNew && <TxButton
                color='red'
                accountPair={props.accountPair}
                label='Add'
                type='SUDO-TX'
                setStatus={resetRandomLoan}
                attrs={{
                    palletRpc: 'kidotLoan',
                    callable: 'addLoan',
                    inputParams: [props.loan.id, Number(props.loan.loanAmount)],
                    paramFields: [true, true]
                }}
            />}

        </Card.Content>
    </Card>
}

function Main(props) {
    const {api} = useSubstrate();
    const {accountPair} = props;
    const [userData, setUserData] = useState({});
    const [loansDetails, setLoansDetails] = useState([]);
    const [loanToFund, setLoanToFund] = useState({});
    const [amountToFund, setAmountToFund] = useState(10 * ONE_KD_UNIT);
    const kivaApiUrl = "https://api.kivaws.org/graphql";
    const [KDValue, setKDValue] = useState(0); // KD$ value, indexed on LINK$
    const [status, setStatus] = useState('');
    const [reservedAmount, setReservedAmount] = useState(0);
    const [fundedAmount, setFundedAmount] = useState(0);
    const [payedBackAmount, setPayedBackAmount] = useState(0);
    const [randomLoan, setRandomLoan] = useState(null);

    const toUSD = (value) => toKDUnit(value) * (KDValue / NANO_DOLLAR);

    const getRandomLoan = async () => {
        setRandomLoan(null);
        const loansQuery = "{\
            lend {\
              loans(filters: {status: fundraising, isGroup: false}, limit: 1, sortBy: random) {\
                values {\
                  description\
                  id\
                  name\
                  loanAmount\
                  image {\
                    url(presetSize: loan_retina)\
                  }\
                  geocode {\
                    country {\
                      isoCode\
                      name\
                    }\
                  }\
                }\
              }\
            }\
          }";
        const response = await axios.post(kivaApiUrl, JSON.stringify({query: loansQuery}),
            {headers: {'Content-Type': 'application/json'}});
        console.log(response.data.data.lend.loans.values);
        const newRandomLoan = {...response.data.data.lend.loans.values[0], isNew: true}
        setRandomLoan(newRandomLoan);
    };

    const getLoanExternalDetails = async (loansIds) => {
        if (loansIds.length == 0) {
            return;
        }
        const loansQuery = "{\
            lend {\
              loans(filters: {loanIds : [" + loansIds.join() + "]}, limit: " + loansIds.length + ") {\
                values {\
                  description\
                  id\
                  name\
                  loanAmount\
                  image {\
                    url(presetSize: loan_retina)\
                  }\
                  geocode {\
                    country {\
                      isoCode\
                      name\
                    }\
                  }\
                }\
              }\
            }\
          }";
        const response = await axios.post(kivaApiUrl, JSON.stringify({query: loansQuery}),
            {headers: {'Content-Type': 'application/json'}});
        console.log(response)
        let loansDetails = response.data.data.lend.loans.values;
        api.query.kidotLoan.loansDetails.multi(loansIds, loansDetailsRaw => {
            let resetRandomNode = false;
            loansDetailsRaw.forEach(raw => {
                const loanId = raw.loanId.toNumber();

                if (randomLoan !== null) {
                    console.log(loanId + "," + randomLoan.id)
                    if (loanId === randomLoan.id) {
                        console.log("Resetting randomloan")
                        resetRandomNode = true
                    }
                }
                loansDetails.forEach(loanDetails => {
                    if (loanDetails.id === raw.loanId.toNumber()) {
                        loanDetails.fundedAmount = raw.fundedAmount.toNumber()
                        loanDetails.loanAmount = Number(loanDetails.loanAmount)
                        loanDetails.isNew = false
                    }
                })
            })
            console.log(loansDetails)
            setLoansDetails(loansDetails);
            if (resetRandomNode) {
                setRandomLoan(null)
            }
        });
    };

    useEffect(() => {
        let unsubscribe;
        api.query.pricefeed.price(newValue => {
            console.log(newValue.toNumber());
            setKDValue(newValue.toNumber());
        }).then(unsub => {
            unsubscribe = unsub;
        }).catch(console.error);
        api.query.kidotLoan.loans(rawDataLoans => {
            const loansIds = rawDataLoans.map(r => r.toString());
            getLoanExternalDetails(loansIds)
        }).then(unsub => {
            unsubscribe = unsub;
        }).catch(console.error);
        api.query.kidotLoan.reservedLoansAmount(newValue => {
            setReservedAmount(newValue.toNumber());
        }).then(unsub => {
            unsubscribe = unsub;
        }).catch(console.error);
        api.query.kidotLoan.fundedLoansAmount(newValue => {
            setFundedAmount(newValue.toNumber());
        }).then(unsub => {
            unsubscribe = unsub;
        }).catch(console.error);


    }, []);

    return (
        <Segment>
            <Statistic.Group widths='four' size='small'>
                <Statistic
                    label={'KD$ Reserved'}
                    value={toKDUnit(reservedAmount)}
                />
                <Statistic
                    label={'KD$ Funded'}
                    value={toKDUnit(fundedAmount)}
                />
                <Statistic
                    label={'KD$ Staked'}
                    value={toKDUnit(payedBackAmount)}
                />
                <Statistic
                    label={'KD$ Payed Back'}
                    value={toKDUnit(payedBackAmount)}
                />
            </Statistic.Group>

            <Divider hidden/>

            <TxButton
                accountPair={accountPair}
                label={'1 KD$ = ' + (KDValue / NANO_DOLLAR).toString() + 'USD'}
                type='SIGNED-TX'
                setStatus={setStatus}
                attrs={{
                    palletRpc: 'pricefeed',
                    callable: 'requestPrice',
                    inputParams: ['LINK/USD'],
                    paramFields: [true]
                }}
            />
            <Button basic
                    color='blue'
                    onClick={getRandomLoan}
                    content='Find Loan'
            />
            <TxButton
                color='red'
                accountPair={props.accountPair}
                label='Reset'
                type='SUDO-TX'
                setStatus={setStatus}
                attrs={{
                    palletRpc: 'kidotLoan',
                    callable: 'resetLoans',
                    inputParams: [],
                    paramFields: []
                }}
            />


            <Divider hidden/>
            <Card.Group>
                {loansDetails && loansDetails.length > 0 && loansDetails.map(loan => {
                    return <LoanCard key={loan.id} loan={loan} accountPair={accountPair} setStatus={setStatus}
                                     setRandomLoan={setRandomLoan} amountToFund={amountToFund}
                                     toUSD={toUSD}/>
                })}
                {randomLoan != null && <LoanCard loan={randomLoan} accountPair={accountPair}
                                                 setRandomLoan={setRandomLoan} setStatus={setStatus}
                                                 amountToFund={amountToFund} toUSD={toUSD}/>}
            </Card.Group>
            <Divider hidden/>
            <div style={{overflowWrap: 'break-word'}}>{status}</div>
        </Segment>
    );
}


export default function Loans(props) {
    const {api} = useSubstrate();
    return <Main {...props} />;
}
