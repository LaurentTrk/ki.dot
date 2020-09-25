import React from 'react';
import ReactDOM from 'react-dom';
import App from '../Technical';

describe('App Test Suite', () => {
  it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(<Technical />, div);
  });
});
