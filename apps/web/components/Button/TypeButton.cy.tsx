import React from 'react'
import { TypeButton } from './TypeButton'

describe('<TypeButton />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<TypeButton />)
  })
})