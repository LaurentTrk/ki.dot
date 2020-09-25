import React from "react";
import {createRef, useState} from 'react';
import {Container, Dimmer, Dropdown, Grid, Loader, Menu, Message, Segment, Sticky} from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';

import {SubstrateContextProvider, useSubstrate} from './substrate-lib';
import {DeveloperConsole} from './substrate-lib/components';

import AccountSelector from './AccountSelector';
import PriceFeed from './Components/PriceFeed';
import {Link} from "react-router-dom";

function Main() {
    const [accountAddress, setAccountAddress] = useState(null);
    const {apiState, keyring, keyringState, apiError} = useSubstrate();
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
                        <Menu.Item as={Link} to='/loans'>Loans</Menu.Item>
                        <Menu.Item as='a' active>Price Feeds</Menu.Item>
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
                <AccountSelector setAccountAddress={setAccountAddress}/>
            </Sticky>
            <Container>
                <Grid stackable columns='equal'>
                    <Grid.Row>
                        <PriceFeed accountPair={accountPair}/>
                    </Grid.Row>
                </Grid>
            </Container>
            <DeveloperConsole/>
        </div>
    );
}

export default function PriceFeeds() {
    return (
        <SubstrateContextProvider>
            <Main/>
        </SubstrateContextProvider>
    );
}
