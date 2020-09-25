import React, { useState, createRef } from 'react';
import {Container, Dimmer, Loader, Grid, Sticky, Message, Segment, Menu, Dropdown} from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';

import { SubstrateContextProvider, useSubstrate } from './substrate-lib';
import { DeveloperConsole } from './substrate-lib/components';

import AccountSelector from './AccountSelector';
import Balances from './Balances';
import BlockNumber from './BlockNumber';
import Events from './Events';
import Interactor from './Interactor';
import Metadata from './Metadata';
import NodeInfo from './NodeInfo';
import TemplateModule from './TemplateModule';
import Transfer from './Transfer';
import Upgrade from './Upgrade';
import PriceFeed from './Components/PriceFeed';
import Loans from './Components/Loans';
import {Link} from "react-router-dom";

function Main () {
  const [accountAddress, setAccountAddress] = useState(null);
  const { apiState, keyring, keyringState, apiError } = useSubstrate();
  const accountPair =
    accountAddress &&
    keyringState === 'READY' &&
    keyring.getPair(accountAddress);

  const loader = text =>
    <Dimmer active>
      <Loader size='small'>{text}</Loader>
    </Dimmer>;

  const message = err =>
    <Grid centered columns={2} padded>
      <Grid.Column>
        <Message negative compact floating
          header='Error Connecting to Substrate'
          content={`${err}`}
        />
      </Grid.Column>
    </Grid>;

  if (apiState === 'ERROR') return message(apiError);
  else if (apiState !== 'READY') return loader('Connecting to Substrate');

  if (keyringState !== 'READY') {
    return loader('Loading accounts (please review any extension\'s authorization)');
  }

  const contextRef = createRef();

  return (
    <div ref={contextRef}>
      <Segment inverted={true} textAlign='center' style={{minHeight: 50, padding: '1em 0em'}} vertical>
        <Menu  fixed={'top'} inverted={true}  pointing={false} secondary={true} size='large'  >
          <Container>
            <Menu.Item as={Link} to='/'>Home</Menu.Item>
            <Menu.Item as='a' active>Loans</Menu.Item>
            <Menu.Item as={Link} to='/prices'>Price Feeds</Menu.Item>
            <Menu.Item as={Link} to='/dashboard'>Dashboard</Menu.Item>
            <Dropdown item text='External'>
              <Dropdown.Menu>
                <Dropdown.Item href="https://hack.chain.link/" target="_blank">Chainlink Hackathon
                </Dropdown.Item>
                <Dropdown.Item href="https://feeds.chain.link/" target="_blank">Chainlink Price Feeds
                </Dropdown.Item>
                <Dropdown.Item href="https://substrate.dev" target="_blank">Substrate</Dropdown.Item>
                <Dropdown.Item href="https://parity.io" target="_blank">Parity</Dropdown.Item>
                <Dropdown.Item href="https://chain.link/" target="_blank">Chainlink</Dropdown.Item>
                <Dropdown.Item href="https://www.linkedin.com/in/laurenttrk" target="_blank">About Me
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Container>
        </Menu>
      </Segment>
      <Sticky context={contextRef}>
        <AccountSelector setAccountAddress={setAccountAddress} />
      </Sticky>
      <Container>
        <Grid stackable columns='equal'>
          <Grid.Row>
            <Loans accountPair={accountPair} />
          </Grid.Row>
          <Grid.Row>
            <Transfer accountPair={accountPair} />
          </Grid.Row>
          <Grid.Row>
            <Interactor accountPair={accountPair} />
            <Events />
          </Grid.Row>
        </Grid>
      </Container>
    </div>
  );
}

export default function LoansPage () {
  return (
    <SubstrateContextProvider>
      <Main />
    </SubstrateContextProvider>
  );
}
