import React, {useEffect, useState} from 'react';
import {
    Table,
    Card,
    Grid,
    Statistic,
    Form,
    Input,
    Label,
    Icon,
    Image,
    Segment,
    Flag,
    Progress,
    Divider,
    Button
} from 'semantic-ui-react';

import {useSubstrate} from '../substrate-lib';
import axios from "axios";
import {TxButton} from "../substrate-lib/components";

function LoanCard(props){
    const resetRandomLoan = (status) => {
        props.setStatus(status);
        props.setRandomLoan(null);
    }
    return <Card color={'green'} style={{width: '200px'}}>
        <Image src={props.loan.image.url} wrapped ui={false}/>
        <Card.Content>
            <Card.Header>{props.loan.name}</Card.Header>
            <Card.Meta>
                <Flag name={props.loan.geocode.country.isoCode.toLowerCase()}/>
                <span className='date'>{props.loan.loanAmount + ' USD'}</span>
            </Card.Meta>
            <Card.Description>
                {props.loan.description.slice(0, 200)}
            </Card.Description>
        </Card.Content>
        <Card.Content extra>
            <Progress progress='value' disabled={props.loan.isNew} value={props.loan.fundedAmount < props.loan.loanAmount ? props.loan.fundedAmount: props.loan.loanAmount}
                      total={props.loan.loanAmount}
                      size='small' color={props.loan.isNew ? '':props.loan.fundedAmount < props.loan.loanAmount ? 'yellow':'green'}/>
            { !props.loan.isNew && <TxButton
                accountPair={props.accountPair}
                label='Lend'
                type='SIGNED-TX'
                setStatus={props.setStatus}
                attrs={{
                    palletRpc: 'kidotLoan',
                    callable: 'lend',
                    inputParams: [props.loan.id, props.amountToFund],
                    paramFields: [true, true]
                }}
            /> }
            { props.loan.isNew && <TxButton
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
    const [amountToFund, setAmountToFund] = useState(100);
    const kivaApiUrl = "https://api.kivaws.org/graphql";
    const [KDValue, setKDValue] = useState(0); // KD$ value, indexed on LINK$
    const [status, setStatus] = useState('');
    const [loans, setLoans] = useState([]);
    const [randomLoan, setRandomLoan] = useState(null);

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
        const newRandomLoan = { ...response.data.data.lend.loans.values[0], isNew: true}
        setRandomLoan(newRandomLoan);
    };

    const getLoanExternalDetails = async (loansIds) => {
        const loansQuery = "{\
            lend {\
              loans(filters: {loanIds : ["+loansIds.join()+"]}) {\
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

                if (randomLoan !== null){
                    console.log(loanId + "," + randomLoan.id)
                    if (loanId === randomLoan.id){
                        console.log("Resetting randomloan")
                        resetRandomNode = true
                    }
                }
                loansDetails.forEach(loanDetails => {
                    if (loanDetails.id === raw.loanId.toNumber()){
                        loanDetails.fundedAmount = raw.fundedAmount.toNumber()
                        loanDetails.loanAmount = Number(loanDetails.loanAmount)
                        loanDetails.isNew = false
                    }
                })
            })
            console.log(loansDetails)
            setLoansDetails(loansDetails);
            if (resetRandomNode){
                setRandomLoan(null)
            }
        });






        // console.log(fullLoanDetails);
        // let loans = loansDetails;
        // loans.push(fullLoanDetails);
        // console.log(loans);
        //
        // console.log(loansDetails)
    };

    useEffect(() => {
        let unsubscribe;
        api.query.kidotLoan.loans(rawDataLoans => {
            const loansIds = rawDataLoans.map(r => r.toString());
            getLoanExternalDetails(loansIds)
        }).then(unsub => {
            unsubscribe = unsub;
        }).catch(console.error);
        api.query.pricefeed.price(newValue => {
            // The storage value is an Option<u32>
            // So we have to check whether it is None first
            // There is also unwrapOr
            console.log(newValue)
            if (newValue.isNone) {
                setKDValue('<None>');
            } else {
                try {
                    setKDValue(Math.round(newValue.toNumber() / 1000000) / 100);
                } catch (e) {
                    setKDValue('NaN');
                }

            }
        }).then(unsub => {
            unsubscribe = unsub;
        })
            .catch(console.error);


    }, []);

    return (
        <Segment>
            <h1>Loans</h1>
                <Button basic
                        onClick={getRandomLoan}
                        color='red'
                        content='Find Loan'
                />
            {false && <TxButton
                color='red'
                accountPair={props.accountPair}
                label='Reset'
                type='SUDO-TX'
                setStatus={setStatus}
                attrs={{
                    palletRpc: 'kidotLoan',
                    callable: 'resetLoan',
                    inputParams: [],
                    paramFields: []
                }}
            />
            }

            <Divider hidden/>
            <Card.Group>
                {loansDetails && loansDetails.length > 0 && loansDetails.map(loan => {
                    return <LoanCard loan={loan} accountPair={accountPair} setStatus={setStatus} setRandomLoan={setRandomLoan} amountToFund={amountToFund}/>
                })}
                {randomLoan != null &&  <LoanCard loan={randomLoan} accountPair={accountPair} setRandomLoan={setRandomLoan} setStatus={setStatus} amountToFund={amountToFund}/>}
            </Card.Group>
            <Divider hidden/>
            <div style={{ overflowWrap: 'break-word' }}>{status}</div>




            {false &&
            <Grid.Column width={8}>

                <h1>Loans List</h1>
                {loansDetails && loansDetails.length > 0 && <Table color='blue'>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>ID</Table.HeaderCell>
                            <Table.HeaderCell>Loan Amount</Table.HeaderCell>
                            <Table.HeaderCell>Funded</Table.HeaderCell>
                            <Table.HeaderCell>Estimated Funded</Table.HeaderCell>
                            <Table.HeaderCell>Still to fund</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>{loansDetails.map(loanDetails => {
                        //const id = u8aToString(loanDetails.loanId);
                        return <Table.Row key={loanDetails.loanId}>
                            <Table.Cell>{loanDetails.loanId.toString()}</Table.Cell>
                            <Table.Cell>{loanDetails.loanAmount.toString() + ' USD'}</Table.Cell>
                            <Table.Cell>{loanDetails.fundedAmount.toString() + ' KD$'}</Table.Cell>
                            <Table.Cell>{(loanDetails.fundedAmount * KDValue).toString() + ' USD'}</Table.Cell>
                            <Table.Cell>{(Math.round((loanDetails.loanAmount - loanDetails.fundedAmount * KDValue) / KDValue * 100) / 100).toString() + ' USD'}</Table.Cell>
                        </Table.Row>;
                    })}</Table.Body>
                </Table>}

                <h1>Fund Loan</h1>
                <Form>
                    <Form.Field>
                        <Label basic color='teal'>
                            <Icon name='hand point right'/>
                            1 KD$ = 1000000000000
                        </Label>
                    </Form.Field>
                    <Form.Field>
                        <Input
                            label='Loan ID'
                            state='loanToFund'
                            type='number'
                            onChange={(_, {value}) => setLoanToFund(value)}
                        />
                    </Form.Field>
                    <Form.Field>
                        <Input
                            label='Loan Amount (KD$)'
                            state='amountToFund'
                            type='number'
                            onChange={(_, {value}) => setAmountToFund(value)}
                        />
                    </Form.Field>
                    <Form.Field style={{textAlign: 'center'}}>
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
                    <div style={{overflowWrap: 'break-word'}}>{status}</div>
                </Form>


            </Grid.Column>}
        </Segment>
    );
}


export default function Loans(props) {
    const {api} = useSubstrate();
    return <Main {...props} />;
}
