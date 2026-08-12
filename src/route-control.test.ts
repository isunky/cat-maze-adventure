import { describe, expect, it } from 'vitest'
import { chooseClearTurn } from './route-control'

const branches = [
  { value: 'left', tangent: { x: -0.8, y: -0.6 }, projectionDistance: 12 },
  { value: 'right', tangent: { x: 0.8, y: -0.6 }, projectionDistance: 12 },
]

describe('junction intent', () => {
  it('locks the branch indicated by the finger before reaching the junction', () => {
    expect(chooseClearTurn({ x: -0.75, y: -0.66 }, { x: -0.7, y: -0.7 }, branches)).toBe('left')
    expect(chooseClearTurn({ x: 0.75, y: -0.66 }, { x: 0.7, y: -0.7 }, branches)).toBe('right')
  })

  it('stops at an ambiguous junction instead of switching because of jitter', () => {
    expect(chooseClearTurn({ x: 0.01, y: -1 }, { x: -0.01, y: -1 }, branches)).toBeUndefined()
  })

  it('ignores a branch pointing opposite to the drag', () => {
    expect(chooseClearTurn({ x: 0, y: 1 }, { x: 0, y: 1 }, branches)).toBeUndefined()
  })
})
