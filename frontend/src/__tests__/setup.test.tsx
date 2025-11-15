/**
 * Example test to verify Vitest + React Testing Library setup.
 * 
 * This file demonstrates basic testing patterns and confirms
 * the test infrastructure is working correctly.
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

// Simple component to test
function WelcomeMessage({ name }: { name: string }) {
  return <h1>Welcome, {name}!</h1>
}

describe('Test Setup Verification', () => {
  it('should render a component', () => {
    render(<WelcomeMessage name="Student" />)
    expect(screen.getByText('Welcome, Student!')).toBeInTheDocument()
  })

  it('should pass basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('should support async tests', async () => {
    const promise = Promise.resolve('success')
    const result = await promise
    expect(result).toBe('success')
  })
})
