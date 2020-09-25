import React from "react";
import {Container, Header, List, Segment} from 'semantic-ui-react';
import ResponsiveContainer from "./ResponsiveContainer";

const Homepage = () => (
  <ResponsiveContainer>
    <Segment id='homepage' style={{ padding: '4em 0em' }} vertical>
      <Container text>
        <p className='homepage-content'>
        </p>

        <Header as='h3' className='homepage-header'>Learn More</Header>

        <List bulleted className='homepage-list'>
          <List.Item content="Substrate Developer Hub" href="https://substrate.dev"/>
          <List.Item
            content="Element Technical Chat"
            href="https://app.element.io/#/room/!HzySYSaIhtyWrwiwEV:matrix.org"
          />
          <List.Item content="Substrate Enterprise Sample" href="https://github.com/substrate-developer-hub/substrate-enterprise-sample"/>
          <List.Item content="Ki.Dot Github Repository" href="https://github.com/LaurentTrk/ki.dot"/>
        </List>
      </Container>
    </Segment>
  </ResponsiveContainer>
);

export default Homepage;
