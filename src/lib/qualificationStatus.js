export function computeQualificationStatus(form, answers = {}) {
  if (!form || !['approved', 'active'].includes(form.status) || form.approvalStatus === 'pending_broker_approval' || form.scoringStatus === 'pending_broker_approval') return 'pending';
  const questions = form.questions || form.fields;
  const threshold = Number(form.qualification_threshold ?? form.qualificationThreshold);
  if (!Array.isArray(questions) || !questions.length || !Number.isFinite(threshold) || threshold <= 0) return 'pending';
  const weight = q => Number(q.score_weight ?? q.weight ?? 0);
  if (!questions.some(q => weight(q) > 0)) return 'pending';
  if (questions.some(q => q.required && !String(answers[q.id] ?? '').trim())) return 'in_progress';
  const score = questions.reduce((sum,q) => sum + (answers[q.id] === 'yes' ? weight(q) : 0), 0);
  return score >= threshold ? 'qualified' : 'unqualified';
}
