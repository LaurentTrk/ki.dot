import React from "react";
import {createRef, useState} from 'react';
import {Container, Dimmer, Dropdown, Grid, Loader, Menu, Message, Segment, Sticky} from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';

import {SubstrateContextProvider, useSubstrate} from './substrate-lib';
import {DeveloperConsole} from './substrate-lib/components';

import AccountSelector from './AccountSelector';
import PriceFeed from './Components/PriceFeed';


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
            <Sticky context={contextRef}>
                <AccountSelector setAccountAddress={setAccountAddress} currentTab={'Prices'}/>
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
