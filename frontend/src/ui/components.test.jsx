import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, ProgressBar, Switch } from './components'

describe('Button', () => {
  it('fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled and busy while loading', async () => {
    const onClick = vi.fn()
    render(<Button loading onClick={onClick}>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('defaults to type="button" so it never submits forms by accident', () => {
    render(<Button>Plain</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})

describe('ProgressBar', () => {
  it('clamps values to 0–100', () => {
    const { rerender } = render(<ProgressBar value={140} label="xp" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    rerender(<ProgressBar value={-5} label="xp" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
})

describe('Switch', () => {
  it('reports the new checked state', async () => {
    const onChange = vi.fn()
    render(<Switch label="Alerts" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Alerts' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
