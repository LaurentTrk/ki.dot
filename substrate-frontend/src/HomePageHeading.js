import {Button, Container, Header, Icon, Image} from "semantic-ui-react";
import {Link} from "react-router-dom";
import PropTypes from "prop-types";
import React from "react";
import logo from './Ki.dot.png';

const HomepageHeading = ({ mobile }) => (
    <Container text>
        <img src={logo} className="App-logo" alt="logo" />
        <Header
            as='h2'
            content='Micro funding with a substrate based blockchain. '
            inverted
            style={{
                fontSize: mobile ? '1.5em' : '1.7em',
                fontWeight: 'normal',
                marginTop: mobile ? '0.5em' : '1.5em'
            }}
        />
        <Button
            as={Link} to='/loans'
            primary size='huge'
        >
            Get Started
            <Icon name='right arrow' />
        </Button>
    </Container>
);

HomepageHeading.propTypes = {
    mobile: PropTypes.bool
};

export default HomepageHeading;
