// Gamification is derived purely from data the backend already tracks,
// so it never disagrees with the real numbers.

const TITLES = ['Rookie', 'Grinder', 'Iron Apprentice', 'Rep Knight', 'Beast', 'Titan', 'Legend']

export function computeXp({ totalReps = 0, totalSessions = 0, streakDays = 0 } = {}) {
  return Math.max(0, Math.round(Number(totalReps) * 2 + Number(totalSessions) * 50 + Number(streakDays) * 25))
}

// Level N needs 250 * N XP to clear, so early levels come quickly.
export function levelFromXp(xp) {
  let level = 1
  let remaining = Math.max(0, Number(xp) || 0)
  while (remaining >= level * 250) {
    remaining -= level * 250
    level += 1
  }
  const xpForLevel = level * 250
  return {
    level,
    xpIntoLevel: remaining,
    xpForLevel,
    progressPct: Math.round((remaining / xpForLevel) * 100),
    title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))],
  }
}
