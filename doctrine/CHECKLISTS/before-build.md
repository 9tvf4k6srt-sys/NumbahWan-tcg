# BEFORE-BUILD CHECKLIST

**AI agent: answer all 10 questions out loud (in your response to the operator) before writing code or copy. If you skip this, your output will likely be rejected and you'll waste tokens.**

This is the cheapest gate in the system. Spend 90 seconds here, save 30 minutes of rework.

---

## The 10 questions

1. **What did `/doctrine/VOICE.md` say in one paragraph?** Restate the register in your own words. If you can't, re-read it.

2. **What's banned in `/doctrine/REJECTIONS.md` for this task?** Name three banned phrases relevant to what you're about to write.

3. **Which patterns from `/doctrine/PATTERNS.md` apply?** Name them by P-### number. If none, this task may need a new pattern (note it for promotion).

4. **What do the last 5 entries in `/doctrine/LESSONS.jsonl` say?** Read them. Are any directly relevant? Don't repeat them.

5. **Is this a one-product change or multi-product?** If multi, you almost certainly need to scope it down. See A-001 (co-headline) and A-003 (posture-before-product).

6. **What is the receipt for any factual claim?** Source URL, date, signed-by initials. If you can't answer, you cannot make the claim.

7. **What's the smoke test plan?** Which routes you'll curl. Which sensors you'll run. Which payload sizes you expect.

8. **What's the live link the operator will open on iPhone?** Memory rule: every push gets a live URL.

9. **What might the operator push back on?** Name two likely failure modes before building. Pre-empt them.

10. **What's the honest limit?** Where does this build stop being defensible? List it now so it goes in the response, not in the rework.

---

## Format expected in your response

Before code, output something like:

> **Voice check:** [restate in 1 sentence]
> **Rejections relevant:** [3 banned phrases for this task]
> **Patterns to use:** [P-###, P-###]
> **Lessons relevant:** [L-### if any]
> **One product:** yes / scope-down needed
> **Receipts:** [where the proof comes from]
> **Smoke plan:** [routes + sensors]
> **Honest limit:** [what this won't do]

If the task is trivial (one-line fix, typo, sensor run), say so and skip. The checklist is for any build that produces user-facing copy or new code surface.

---

## Anti-patterns this catches before they ship

- A-001 co-headline (caught by Q5)
- A-003 posture-before-product (caught by Q5)
- A-006 newest-models drift (caught by Q6)
- Splash overlays (A-002, caught by Q3 + Q9)
- 80-word hero subs (A-004, caught by Q1 voice register)
- 3+ CTA hero (A-005, caught by Q5)
- Confidence on draft data (caught by Q6 + Q10)

---

**The cost of skipping this is rework. The operator has already paid for that lesson 11 times. Don't make it 12.**
