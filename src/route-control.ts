export type Vector = { x: number; y: number }

export type TurnChoice<T> = {
  value: T
  tangent: Vector
  projectionDistance: number
}

const dot = (a: Vector, b: Vector): number => a.x * b.x + a.y * b.y

export function chooseClearTurn<T>(aim: Vector, motion: Vector, choices: TurnChoice<T>[], margin = 0.1): T | undefined {
  const ranked = choices.flatMap((choice) => {
    const directionScore = dot(aim, choice.tangent)
    const motionScore = dot(motion, choice.tangent)
    const approachBonus = Math.max(0, 1 - choice.projectionDistance / 90)
    const score = directionScore * 0.62 + motionScore * 0.23 + approachBonus * 0.38
    return directionScore < -0.05 || score < 0.28 ? [] : [{ value: choice.value, score }]
  }).sort((a, b) => b.score - a.score)

  if (ranked.length > 1 && ranked[0].score - ranked[1].score < margin) return undefined
  return ranked[0]?.value
}
