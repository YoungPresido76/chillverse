// src/lib/weeklyMissions.ts
import { supabase } from '../../shared/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MissionDefinition {
  id: string
  title: string
  description: string
  icon: string
  icon_color: string
  category: string
  metric_key: string
  target_value: number
  reward_type: 'xp' | 'xp_and_booster' | 'diamonds'
  xp_reward: number
  diamond_reward: number
  reward_label: string
  is_spend: boolean
  is_active: boolean
}

export interface UserWeeklyMission {
  id: string
  user_id: string
  week_start: string
  mission_ids: string[]
  progress: Record<string, number>
  completed_ids: string[]
  total_xp_earned: number
  total_diamonds_earned: number
  boosters_earned: number
}

export interface MissionWithProgress extends MissionDefinition {
  current_progress: number
  is_completed: boolean
}

// ── Helper: Fisher-Yates shuffle ─────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Function 1: getWeekStart ─────────────────────────────────────────────────

export function getWeekStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? 6 : day - 1
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().slice(0, 10)
}

// ── Function 2: getTimeUntilReset ────────────────────────────────────────────

export function getTimeUntilReset(): { days: number; hours: number; minutes: number } {
  const now = new Date()
  // Next Monday 00:00 UTC
  const nextMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = nextMonday.getUTCDay()
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday)

  const diffMs = nextMonday.getTime() - now.getTime()
  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0 }

  const totalMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  return { days, hours, minutes }
}

// ── Function 3: getOrCreateWeeklyMissions ────────────────────────────────────

export async function getOrCreateWeeklyMissions(userId: string): Promise<MissionWithProgress[]> {
  const weekStart = getWeekStart(new Date())

  // Step 2: query existing row
  const { data: existing } = await supabase
    .from('user_weekly_missions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .limit(1)
    .maybeSingle()

  let row: UserWeeklyMission | null = existing as UserWeeklyMission | null

  if (!row) {
    // Step 4: fetch all active definitions
    const { data: allDefs, error: defsErr } = await supabase
      .from('mission_definitions')
      .select('*')
      .eq('is_active', true)

    if (defsErr || !allDefs) return []

    const definitions = allDefs as MissionDefinition[]

    // Step 5: fetch last 4 weeks of missions to build exclusion set
    const { data: recentRows } = await supabase
      .from('user_weekly_missions')
      .select('mission_ids')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(4)

    let excludedIds = new Set<string>()
    for (const r of recentRows ?? []) {
      for (const id of r.mission_ids ?? []) excludedIds.add(id)
    }

    // Step 6: generate 5 missions with constraints
    let pool = definitions.filter(d => !excludedIds.has(d.id))
    if (pool.length < 5) {
      excludedIds = new Set()
      pool = [...definitions]
    }

    const shuffled = shuffle(pool)
    let selected = shuffled.slice(0, 5)
    const remainder = shuffled.slice(5)

    // CONSTRAINT 3: max 1 spend mission
    const spendInSelected = selected.filter(d => d.is_spend)
    if (spendInSelected.length > 1) {
      const toRemove = spendInSelected.slice(1)
      selected = selected.filter(d => !toRemove.includes(d))
      const nonSpendRemainder = remainder.filter(d => !d.is_spend)
      selected.push(...nonSpendRemainder.slice(0, toRemove.length))
    }

    // CONSTRAINT 4: no duplicate metric_key
    const seenMetrics = new Set<string>()
    const dedupedSelected: MissionDefinition[] = []
    const remainderForDedup = remainder.filter(d => !selected.includes(d))
    let remIdx = 0
    for (const d of selected) {
      if (!seenMetrics.has(d.metric_key)) {
        seenMetrics.add(d.metric_key)
        dedupedSelected.push(d)
      } else {
        // find replacement with unique metric_key and not is_spend violating limit
        while (remIdx < remainderForDedup.length) {
          const rep = remainderForDedup[remIdx++]
          if (!seenMetrics.has(rep.metric_key)) {
            seenMetrics.add(rep.metric_key)
            dedupedSelected.push(rep)
            break
          }
        }
      }
    }
    selected = dedupedSelected.slice(0, 5)

    // CONSTRAINT 1: at least 1 gameplay mission
    const hasGameplay = selected.some(d => d.category === 'gameplay')
    if (!hasGameplay) {
      const gameplayReplacement = definitions.find(
        d => d.category === 'gameplay' && !selected.some(s => s.id === d.id)
      )
      if (gameplayReplacement) {
        selected[selected.length - 1] = gameplayReplacement
      }
    }

    // CONSTRAINT 2: at least 1 xp_and_booster mission
    const hasBooster = selected.some(d => d.reward_type === 'xp_and_booster')
    if (!hasBooster) {
      const boosterReplacement = definitions.find(
        d => d.reward_type === 'xp_and_booster' && !selected.some(s => s.id === d.id)
      )
      if (boosterReplacement) {
        // Replace the last non-gameplay, non-booster mission
        const replaceIdx = selected.findIndex(
          d => d.category !== 'gameplay' && d.reward_type !== 'xp_and_booster'
        )
        if (replaceIdx !== -1) selected[replaceIdx] = boosterReplacement
        else selected[selected.length - 1] = boosterReplacement
      }
    }

    const missionIds = selected.map(d => d.id)

    // Step 6e: insert row
    const { error: insertErr } = await supabase
      .from('user_weekly_missions')
      .insert({
        user_id: userId,
        week_start: weekStart,
        mission_ids: missionIds,
        progress: {},
        completed_ids: [],
      })

    if (insertErr) {
      // Row may have been created by a concurrent request — fetch it
    }

    // Step 6f: fetch the new row back
    const { data: newRow } = await supabase
      .from('user_weekly_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .limit(1)
      .maybeSingle()

    row = newRow as UserWeeklyMission | null
  }

  if (!row) return []

  // Step 7: load definitions for the 5 mission_ids
  const { data: defRows } = await supabase
    .from('mission_definitions')
    .select('*')
    .in('id', row.mission_ids)

  if (!defRows) return []

  const progress = (row.progress ?? {}) as Record<string, number>
  const completedIds = row.completed_ids ?? []

  // Step 8: map into MissionWithProgress[]
  const missions: MissionWithProgress[] = (defRows as MissionDefinition[]).map(def => ({
    ...def,
    current_progress: progress[def.metric_key] ?? 0,
    is_completed: completedIds.includes(def.id),
  }))

  // Step 9: sort — completed last
  missions.sort((a, b) => {
    if (a.is_completed === b.is_completed) return 0
    return a.is_completed ? 1 : -1
  })

  return missions
}

// ── Function 5: grantMissionReward (declared before updateMissionProgress) ───

export async function grantMissionReward(
  userId: string,
  def: MissionDefinition,
  _row: UserWeeklyMission
): Promise<void> {
  const weekStart = getWeekStart(new Date())

  // Step 1: XP reward
  if (def.xp_reward > 0) {
    await supabase.rpc('award_xp', { p_user_id: userId, p_xp: def.xp_reward })

    await supabase
      .from('user_weekly_missions')
      .update({ total_xp_earned: (_row.total_xp_earned ?? 0) + def.xp_reward })
      .eq('user_id', userId)
      .eq('week_start', weekStart)
  }

  // Step 2: Booster reward
  if (def.reward_type === 'xp_and_booster') {
    await supabase
      .from('user_weekly_missions')
      .update({ boosters_earned: (_row.boosters_earned ?? 0) + 1 })
      .eq('user_id', userId)
      .eq('week_start', weekStart)
  }

  // Step 3: Diamond reward
  if (def.diamond_reward > 0) {
    const { data: walletData } = await supabase
      .from('user_wallets')
      .select('gem_balance')
      .eq('user_id', userId)
      .maybeSingle()

    if (walletData) {
      await supabase
        .from('user_wallets')
        .update({ gem_balance: (walletData.gem_balance ?? 0) + def.diamond_reward })
        .eq('user_id', userId)
    } else {
      await supabase
        .from('user_wallets')
        .insert({ user_id: userId, gem_balance: def.diamond_reward })
    }

    await supabase
      .from('user_weekly_missions')
      .update({ total_diamonds_earned: (_row.total_diamonds_earned ?? 0) + def.diamond_reward })
      .eq('user_id', userId)
      .eq('week_start', weekStart)
  }

  // Step 5: Insert notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'mission',
    title: `Mission Complete: ${def.title}`,
    body:
      def.reward_type === 'xp_and_booster'
        ? `${def.reward_label} — your XP Booster is ready!`
        : def.reward_label,
    icon: def.icon,
    meta: {
      mission_id: def.id,
      reward_type: def.reward_type,
      xp_reward: def.xp_reward,
      diamond_reward: def.diamond_reward,
    },
  })
}

// ── Function 4: updateMissionProgress ────────────────────────────────────────

export async function updateMissionProgress(
  userId: string,
  metricKey: string,
  incrementBy: number = 1,
  /** If true, sets the metric to exactly `incrementBy` instead of adding to it */
  absolute: boolean = false
): Promise<void> {
  const weekStart = getWeekStart(new Date())

  // Step 1: fetch current row
  const { data: rowData } = await supabase
    .from('user_weekly_missions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .limit(1)
    .maybeSingle()

  if (!rowData) return

  const row = rowData as UserWeeklyMission

  // Step 2: clone + increment progress
  const newProgress = { ...(row.progress ?? {}) }
  if (absolute) {
    // Only advance if new value is higher (streak can't go backwards)
    newProgress[metricKey] = Math.max(newProgress[metricKey] ?? 0, incrementBy)
  } else {
    newProgress[metricKey] = (newProgress[metricKey] ?? 0) + incrementBy
  }

  // Step 3: update progress in DB
  await supabase
    .from('user_weekly_missions')
    .update({ progress: newProgress })
    .eq('user_id', userId)
    .eq('week_start', weekStart)

  // Step 4: fetch definitions for this week's missions
  const { data: defRows } = await supabase
    .from('mission_definitions')
    .select('*')
    .in('id', row.mission_ids)

  if (!defRows) return

  const completedIds = [...(row.completed_ids ?? [])]
  const newlyCompleted: string[] = []

  // Step 5: check for newly completed missions
  for (const def of defRows as MissionDefinition[]) {
    if (
      (newProgress[def.metric_key] ?? 0) >= def.target_value &&
      !completedIds.includes(def.id)
    ) {
      await grantMissionReward(userId, def, row)
      newlyCompleted.push(def.id)
    }
  }

  // Step 6: update completed_ids
  if (newlyCompleted.length > 0) {
    await supabase
      .from('user_weekly_missions')
      .update({ completed_ids: [...completedIds, ...newlyCompleted] })
      .eq('user_id', userId)
      .eq('week_start', weekStart)
  }
}
