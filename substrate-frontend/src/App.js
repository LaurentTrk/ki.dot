import React from 'react';
import {
  HashRouter as Router,
  Switch,
  Route
} from 'react-router-dom';

import LoansPage from './LoansPage';
import Dashboard from './Dashboard';
import Homepage from './Homepage';
import PriceFeeds from './PriceFeeds';
import 'semantic-ui-css/semantic.min.css';

export default function App () {
  return (
    <Router>
      <Switch>
        <Route path="/loans">
          <LoansPage />
        </Route>
        <Route path="/dashboard">
          <Dashboard />
        </Route>
        <Route path="/prices">
          <PriceFeeds />
        </Route>
        <Route path="/">
          <Homepage/>
        </Route>
      </Switch>
    </Router>
  );
}
