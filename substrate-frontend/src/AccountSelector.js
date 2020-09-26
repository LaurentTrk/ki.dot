import React, { useState, useEffect } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import {
  Menu,
  Button,
  Dropdown,
  Container,
  Icon,
  Image,
  Label, Segment
} from 'semantic-ui-react';

import { useSubstrate } from './substrate-lib';
import {Link} from "react-router-dom";

function ConditionalMenuItem(props){
  return <Menu.Item as={props.currentTab !== props.tab ? Link:'a' }
                    to={props.link}
                    active={props.currentTab === props.tab}>
    {props.tab}
  </Menu.Item>
}

function Main (props) {
  const { keyring } = useSubstrate();
  const { setAccountAddress } = props;
  const [accountSelected, setAccountSelected] = useState('');

  // Get the list of accounts we possess the private key for
  const keyringOptions = keyring.getPairs().map(account => ({
    key: account.address,
    value: account.address,
    text: account.meta.name.toUpperCase(),
    icon: 'user'
  }));

  const initialAddress =
    keyringOptions.length > 0 ? keyringOptions[0].value : '';

  // Set the initial address
  useEffect(() => {
    setAccountAddress(initialAddress);
    setAccountSelected(initialAddress);
  }, [setAccountAddress, initialAddress]);

  const onChange = address => {
    // Update state with new account address
    setAccountAddress(address);
    setAccountSelected(address);
  };

  return (
    <Menu
      attached='top'
      tabular
      style={{
        backgroundColor: '#fff',
        borderColor: '#fff',
        paddingTop: '1em',
        paddingBottom: '1em'
      }}
    >
      <Container>
        <Menu  inverted={false}  pointing={false} secondary={true} size='large'  >
          <Container>
            <ConditionalMenuItem currentTab={props.currentTab} tab='Home' link='/'/>
            <ConditionalMenuItem currentTab={props.currentTab} tab='Loans' link='/loans'/>
            <ConditionalMenuItem currentTab={props.currentTab} tab='Prices' link='/prices'/>
            <ConditionalMenuItem currentTab={props.currentTab} tab='Dashboard' link='/dashboard'/>
            <Dropdown item text='External'>
              <Dropdown.Menu>
                <Dropdown.Item href="https://kiva.org/" target="_blank">Kiva</Dropdown.Item>
                <Dropdown.Item href="https://hack.chain.link/" target="_blank">Chainlink Hackathon</Dropdown.Item>
                <Dropdown.Item href="https://feeds.chain.link/" target="_blank">Chainlink Price Feeds</Dropdown.Item>
                <Dropdown.Item href="https://substrate.dev" target="_blank">Substrate</Dropdown.Item>
                <Dropdown.Item href="https://parity.io" target="_blank">Parity</Dropdown.Item>
                <Dropdown.Item href="https://chain.link/" target="_blank">Chainlink</Dropdown.Item>
                <Dropdown.Item href="https://www.linkedin.com/in/laurenttrk" target="_blank">About Me</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Container>
        </Menu>
        <Menu.Menu position='right' style={{ alignItems: 'center' }}>
          { !accountSelected
            ? <span>
              Add your account with the{' '}
              <a
                target='_blank'
                rel='noopener noreferrer'
                href='https://github.com/polkadot-js/extension'
              >
                Polkadot JS Extension
              </a>
            </span>
            : null }
          <CopyToClipboard text={accountSelected}>
            <Button
              basic
              circular
              size='large'
              icon='user'
              color={accountSelected ? 'green' : 'red'}
            />
          </CopyToClipboard>
          <Dropdown
            search
            selection
            clearable
            placeholder='Select an account'
            options={keyringOptions}
            onChange={(_, dropdown) => {
              onChange(dropdown.value);
            }}
            value={accountSelected}
          />
          <BalanceAnnotation accountSelected={accountSelected} />
        </Menu.Menu>
      </Container>
    </Menu>
  );
}

function BalanceAnnotation (props) {
  const { accountSelected } = props;
  const { api } = useSubstrate();
  const [accountBalance, setAccountBalance] = useState(0);

  const toKD = (value) => {
    // Grrr, cannot switch to number (overflow) and convert...
    return value.toHuman().replace('Unit','KD$')
        .replace('n','')
        .replace('µ','K')
        .replace('m','M');
  }

  // When account address changes, update subscriptions
  useEffect(() => {
    let unsubscribe;

    // If the user has selected an address, create a new subscription
    accountSelected &&
      api.query.system.account(accountSelected, balance => {
        setAccountBalance(toKD(balance.data.free));
      })
        .then(unsub => {
          unsubscribe = unsub;
        })
        .catch(console.error);

    return () => unsubscribe && unsubscribe();
  }, [api, accountSelected]);

  return accountSelected ? (
    <Label pointing='left' style={{minWidth:'120px'}}>
      <Icon name='money bill alternate outline' color='green' />
      {accountBalance}
    </Label>
  ) : null;
}

export default function AccountSelector (props) {
  const { api, keyring } = useSubstrate();
  return keyring.getPairs && api.query ? <Main {...props} /> : null;
}
