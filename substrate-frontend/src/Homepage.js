import React from "react";
import {Container, Header, List, Segment} from 'semantic-ui-react';
import ResponsiveContainer from "./ResponsiveContainer";

const Homepage = () => (
  <ResponsiveContainer>
    <Segment id='homepage' style={{ padding: '4em 0em' }} vertical>
      <Container text>
        <p className='homepage-content'>
        </p>

        <Header as='h3' className='homepage-header'>This is the online demo of the Ki.Dot Chainlink Hackathon project.</Header>


        <List bulleted className='homepage-list'>
          <List.Item content="Hackathon Project Page" href="https://devpost.com/software/ki-dot-a-substrate-based-blockchain-to-help-micro-funding"/>
          <List.Item content="Ki.Dot Github Repository" href="https://github.com/LaurentTrk/ki.dot"/>
        </List>
      </Container>
    </Segment>
  </ResponsiveContainer>
);

export default Homepage;
