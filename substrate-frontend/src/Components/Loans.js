import React, {useEffect, useState} from 'react';
import {Button, Card, Divider, Flag, Image, Progress, Segment, Statistic} from 'semantic-ui-react';

import {useSubstrate} from '../substrate-lib';
import axios from "axios";
import {TxButton} from "../substrate-lib/components";
import Events from "../Events";

const ONE_KD_UNIT = 1000;
const NANO_DOLLAR = 100000000;
const toKDUnit = (value) => Math.round(value * 100 / ONE_KD_UNIT) / 100;

function LoanCard(props) {
    const resetRandomLoan = (status) => {
        props.setStatus(status);
        props.setRandomLoan(null);
    }
    const fundedInDollars = props.toUSD(props.loan.fundedAmount);
    const loanIsCompleted = fundedInDollars >= props.loan.loanAmount;
    const cleanedDescription = props.loan.description.slice(0, 200).replace(/<|>|br|\//g,'') + '...'
    const payingBackLoan = props.loan.paidBackAmount > 0 && props.loan.paidBackAmount < props.loan.fundedAmount;
    const paidBackLoan = loanIsCompleted && props.loan.paidBackAmount === props.loan.fundedAmount;
    const label = paidBackLoan ? "Paid Back !" : payingBackLoan ? "Paying back..." : loanIsCompleted ? "Funded !" : "";
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
            {!props.loan.isNew && <Progress progress={loanIsCompleted ? null : 'value'} disabled={props.loan.isNew}
                      value={payingBackLoan ? props.loan.paidBackAmount : !loanIsCompleted ? fundedInDollars : props.loan.loanAmount}
                      active={payingBackLoan}
                      total={payingBackLoan ? props.loan.fundedAmount : props.loan.loanAmount}
                      size='small'
                      color={props.loan.isNew ? '' : !loanIsCompleted ? 'yellow' : 'green'}>{label}</Progress>}
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
                        inputParams: [props.loan.id, 10 * ONE_KD_UNIT],
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
                        inputParams: [props.loan.id, 50 * ONE_KD_UNIT],
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
    const [loansDetails, setLoansDetails] = useState([]);
    const kivaApiUrl = "https://api.kivaws.org/graphql";
    const [KDValue, setKDValue] = useState(0); // KD$ value, indexed on LINK$
    const [status, setStatus] = useState('Waiting transactions...');
    const [reservedAmount, setReservedAmount] = useState(0);
    const [fundedAmount, setFundedAmount] = useState(0);
    const [stakedAmount, setStakedAmount] = useState(0);
    const [paidBackAmount, setPaidBackAmount] = useState(0);
    const [randomLoan, setRandomLoan] = useState(null);

    const toUSD = (value) => Math.round(toKDUnit(value) * (KDValue / NANO_DOLLAR));

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
        const newRandomLoan = {...response.data.data.lend.loans.values[0], isNew: true, fundedAmount: 0}
        setRandomLoan(newRandomLoan);
    };

    const getLoanExternalDetails = async (loansIds) => {
        if (loansIds.length == 0) {
            setLoansDetails([]);
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
        let loansDetails = response.data.data.lend.loans.values;
        api.query.kidotLoan.loansDetails.multi(loansIds, loansDetailsRaw => {
            let resetRandomNode = false;
            loansDetailsRaw.forEach(raw => {
                const loanId = raw.loanId.toNumber();

                if (randomLoan !== null) {
                    if (loanId === randomLoan.id) {
                        resetRandomNode = true
                    }
                }
                loansDetails.forEach(loanDetails => {
                    if (loanDetails.id === raw.loanId.toNumber()) {
                        loanDetails.fundedAmount = raw.fundedAmount.toNumber()
                        loanDetails.paidBackAmount = raw.payedBackAmount.toNumber()
                        loanDetails.loanAmount = Number(loanDetails.loanAmount)
                        loanDetails.isNew = false
                    }
                })
            })
            setLoansDetails(loansDetails);
            if (resetRandomNode) {
                setRandomLoan(null)
            }
        });
    };

    useEffect(() => {
        let unsubscribe;
        api.query.pricefeed.price(newValue => {
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
        api.query.kidotLoan.stakedAmount(newValue => {
            setStakedAmount(newValue.toNumber());
        }).then(unsub => {
            unsubscribe = unsub;
        }).catch(console.error);
        api.query.kidotLoan.payedBackLoansAmount(newValue => {
            setPaidBackAmount(newValue.toNumber());
        }).then(unsub => {
            unsubscribe = unsub;
        }).catch(console.error);
        return () => unsubscribe && unsubscribe();

    }, []);

    const KDValueInDollars = (value) => (Math.round((KDValue / NANO_DOLLAR) * 1000) / 1000).toString() + ' USD';
    return (
        <div>
        <Segment style={{minWidth:'1086px', minHeight:'650px'}}>
            <Statistic.Group widths='four' size='small'>
                <Statistic label={'KD$ Reserved'}  value={toKDUnit(reservedAmount)}/>
                <Statistic label={'KD$ Outstanding Loans'} value={toKDUnit(fundedAmount)}/>
                <Statistic label={'KD$ Staked'} value={toKDUnit(stakedAmount)}/>
                <Statistic label={'KD$ Paid Back'} value={toKDUnit(paidBackAmount)}/>
            </Statistic.Group>

            <Divider hidden/>

            <TxButton
                accountPair={accountPair}
                label={'1 KD$ = ' + KDValueInDollars(KDValue)}
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
                accountPair={props.accountPair}
                label='Payback Day !'
                type='SIGNED-TX'
                setStatus={setStatus}
                attrs={{
                    palletRpc: 'kidotLoan',
                    callable: 'payback',
                    inputParams: [],
                    paramFields: []
                }}
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
                                     setRandomLoan={setRandomLoan}
                                     toUSD={toUSD}/>
                })}
                {randomLoan != null && <LoanCard loan={randomLoan} accountPair={accountPair}
                                                 setRandomLoan={setRandomLoan} setStatus={setStatus}
                                                 toUSD={toUSD}/>}
            </Card.Group>
        </Segment>
        <Segment>
            <div style={{overflowWrap: 'break-word'}}>{status}</div>
            <Divider hidden/>
            <Events />
        </Segment>

        </div>
    );
}


export default function Loans(props) {
    const {api} = useSubstrate();
    return <Main {...props} />;
}
