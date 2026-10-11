export function financingDetails(input = {}) {
  const answer = value => ['yes', 'no'].includes(value) ? value : 'unknown';
  const loanPrequalified = answer(input.loanPrequalified);
  const workingWithLender = loanPrequalified === 'no' ? answer(input.workingWithLender) : 'not_applicable';
  const wantsLenderReferral = loanPrequalified === 'no' && workingWithLender === 'no' ? answer(input.wantsLenderReferral) : 'not_applicable';
  return { loanPrequalified, prequalifiedAmount: loanPrequalified === 'yes' && typeof input.prequalifiedAmount === 'string' ? input.prequalifiedAmount.trim().slice(0, 80) : '', workingWithLender, wantsLenderReferral, lenderReferralRequested: wantsLenderReferral === 'yes', nonDisqualifying: true };
}
