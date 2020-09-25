import React, { useEffect, useState } from 'react';
import {Form, Input, Grid, Card, Statistic, Dropdown} from 'semantic-ui-react';

import { useSubstrate } from '../substrate-lib';
import { TxButton } from '../substrate-lib/components';
import Events from "../Events";

function Main (props) {
  const { api } = useSubstrate();
  const { accountPair } = props;

  const PricePairs = [
      { key:'ETH/USD', value:'ETH/USD', text:'ETH/USD'},
      { key:'BTC/USD', value:'BTC/USD', text:'BTC/USD'},
      { key:'LINK/USD', value:'LINK/USD', text:'LINK/USD'},
      { key:'EUR/USD', value:'EUR/USD', text:'EUR/USD'},
      ];

  // The transaction submission status
  const [status, setStatus] = useState('');

  // The currently stored value
  const [currentValue, setCurrentValue] = useState(0);
  const [pricePair, setPricePair] = useState(0);

  useEffect(() => {
    let unsubscribe;
    api.query.pricefeed.price(newValue => {
      // The storage value is an Option<u32>
      // So we have to check whether it is None first
      // There is also unwrapOr
        console.log(newValue)
      if (newValue.isNone) {
        setCurrentValue('<None>');
      } else {
          try{
              setCurrentValue(Math.round(newValue.toNumber() / 1000000) / 100);
          }catch (e){
              setCurrentValue('NaN');
          }

      }
    }).then(unsub => {
      unsubscribe = unsub;
    })
        .catch(console.error);

    return () => unsubscribe && unsubscribe();
  }, [api.query.pricefeed]);

  return (
      <Grid.Column width={8}>
        <h1>Price Feeds</h1>
        <Card centered>
          <Card.Content textAlign='center'>
            <Statistic
                label={pricePair}
                value={currentValue}
            />
          </Card.Content>
        </Card>
        <Form>
                <Form.Field>
                    <Dropdown
                        placeholder='Price Pair'
                        fluid
                        label='Price Pair'
                        onChange={(_, { value }) => setPricePair(value)}
                        search
                        selection
                        state='pricePair'
                        value={pricePair}
                        options={PricePairs}
                    />
                </Form.Field>

          <Form.Field style={{ textAlign: 'center' }}>
            <TxButton
                accountPair={accountPair}
                label='Request Price'
                type='SIGNED-TX'
                setStatus={setStatus}
                attrs={{
                  palletRpc: 'pricefeed',
                  callable: 'requestPrice',
                  inputParams: [pricePair],
                  paramFields: [true]
                }}
            />
          </Form.Field>
          <div style={{ overflowWrap: 'break-word' }}>{status}</div>
        </Form>
      <Events />

      </Grid.Column>
  );
}

export default function PriceFeed (props) {
  const { api } = useSubstrate();
  return (api.query.pricefeed && api.query.pricefeed.price
      ? <Main {...props} /> : null);
}
