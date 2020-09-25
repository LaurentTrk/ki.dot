import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import {
    Button,
    Container,
    Dropdown,
    Header,
    Icon,
    Menu,
    Responsive,
    Segment,
    Sidebar,
    Visibility,
    List
} from 'semantic-ui-react';
import HomepageHeading from './HomePageHeading'

const getWidth = () => {
    const isSSR = typeof window === 'undefined';

    return isSSR ? Responsive.onlyTablet.minWidth : window.innerWidth;
};

class DesktopContainer extends Component {
    state = {}

    hideFixedMenu = () => this.setState({ fixed: false })
    showFixedMenu = () => this.setState({ fixed: true })

    render () {
        const { children } = this.props;
        const { fixed } = this.state;
        return (
            <Responsive getWidth={getWidth} minWidth={Responsive.onlyTablet.minWidth}>
                <Visibility
                    once={false}
                    onBottomPassed={this.showFixedMenu}
                    onBottomPassedReverse={this.hideFixedMenu}
                >
                    <Segment
                        inverted
                        textAlign='center'
                        style={{ minHeight: 500, padding: '1em 0em' }}
                        vertical
                    >
                        <Menu
                            fixed={fixed ? 'top' : null}
                            inverted={!fixed}
                            pointing={!fixed}
                            secondary={!fixed}
                            size='large'
                        >
                            <Container>
                                <Menu.Item as='a' active>Home</Menu.Item>
                                <Menu.Item as={Link} to='/loans'>Loans</Menu.Item>
                                <Menu.Item as={Link} to='/prices'>Prices</Menu.Item>
                                <Menu.Item as={Link} to='/dashboard'>Dashboard</Menu.Item>
                                <Dropdown item text = 'External'>
                                    <Dropdown.Menu>
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
                        <HomepageHeading/>
                    </Segment>
                </Visibility>

                {children}
            </Responsive>
        );
    }
}

DesktopContainer.propTypes = {
    children: PropTypes.node
};

class MobileContainer extends Component {
    state = {}

    handleSidebarHide = () => this.setState({ sidebarOpened: false })

    handleToggle = () => this.setState({ sidebarOpened: true })

    render () {
        const { children } = this.props;
        const { sidebarOpened } = this.state;

        return (
            <Responsive
                as={Sidebar.Pushable}
                getWidth={getWidth}
                maxWidth={Responsive.onlyMobile.maxWidth}
            >
                <Sidebar
                    as={Menu}
                    animation='push'
                    inverted
                    onHide={this.handleSidebarHide}
                    vertical
                    visible={sidebarOpened}
                >
                    <Menu.Item as='a' active>Home</Menu.Item>
                    <Menu.Item as={Link} to='/demo'>Demo</Menu.Item>
                    <Menu.Item as='a' href="https://substrate.dev" target="_blank">
                        Substrate
                        <Icon name='external' />
                    </Menu.Item>
                    <Menu.Item as='a' href="https://parity.io" target="_blank">
                        Parity
                        <Icon name='external' />
                    </Menu.Item>
                </Sidebar>

                <Sidebar.Pusher dimmed={sidebarOpened}>
                    <Segment
                        inverted
                        textAlign='center'
                        style={{ minHeight: 350, padding: '1em 0em' }}
                        vertical
                    >
                        <Container>
                            <Menu inverted pointing secondary size='large'>
                                <Menu.Item onClick={this.handleToggle}>
                                    <Icon name='sidebar' />
                                </Menu.Item>
                            </Menu>
                        </Container>
                        <HomepageHeading mobile />
                    </Segment>

                    {children}
                </Sidebar.Pusher>
            </Responsive>
        );
    }
}

MobileContainer.propTypes = {
    children: PropTypes.node
};

const ResponsiveContainer = ({ children }) => (
    <div>
        <DesktopContainer>{children}</DesktopContainer>
        <MobileContainer>{children}</MobileContainer>
    </div>
);

ResponsiveContainer.propTypes = {
    children: PropTypes.node
};

export default ResponsiveContainer;
