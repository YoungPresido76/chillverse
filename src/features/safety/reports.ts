// src/features/safety/reports.ts
import { supabase } from '../../shared/lib/supabase'

export type ReportTargetType = 'user' | 'post' | 'comment' | 'message'

export type ReportReason =
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate_content'
  | 'spam'
  | 'impersonation'
  | 'cheating'
  | 'other'

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Harassment or bullying',
  hate_speech: 'Hate speech',
  inappropriate_content: 'Inappropriate content',
  spam: 'Spam',
  impersonation: 'Impersonation',
  cheating: 'Cheating',
  other: 'Something else',
}

// Not part of ReportReason / REPORT_REASON_LABELS on purpose — 'auto_flagged'
// is a system-only reason written by the word-filter trigger (see migration
// 0029) and must never appear as a selectable option in ReportModal's picker
// (which iterates Object.keys(REPORT_REASON_LABELS)). This is a display-only
// label for the moderation panel.
export const SYSTEM_REPORT_REASON_LABEL = 'Automatically flagged'

export async function submitReport(input: {
  reporterId: string
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  details?: string
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('content_reports').insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details?.trim() || null,
  })

  if (error) {
    console.error('submitReport error:', error)
    if (error.message.includes('CV_REPORT_TARGET_LIMIT')) {
      return { error: "You've already reported this today." }
    }
    if (error.message.includes('CV_REPORT_LIMIT')) {
      return { error: "You've reached today's report limit. Please try again tomorrow." }
    }
    return { error: 'Failed to submit your report. Please try again.' }
  }

  return { error: null }
}
