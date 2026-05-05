# public/data/desk/ — Taiwan AI Hardware desk ledger

One JSON file per ticker: `<ticker>.json` (e.g. `3037.json` for Unimicron).
The `/desk` page reads these files at request time. Append-only history.

## Schema

```json
{
  "ticker": "3037",
  "name_en": "Unimicron",
  "name_zh": "欣興",
  "name_ja": "ユニマイクロン",
  "exchange": "TWSE",
  "layer": "substrate",
  "currency": "TWD",
  "updated": "2026-05-04T00:00:00Z",
  "analyst": "CL",

  "price_target": {
    "value": 0,
    "as_of": "2026-05-04",
    "inputs": {
      "fy_revenue":     { "value": 0, "unit": "NT$B", "vs_street": "" },
      "operating_margin": { "value": 0, "unit": "%",  "vs_street": "" },
      "non_ai_contribution": { "value": 0, "unit": "NT$B", "note": "" },
      "multiple": { "value": 0, "unit": "x", "vs_history": "" }
    },
    "kill_condition": ""
  },

  "screen": {
    "A_ai_exposure":      { "score": null, "note": "" },
    "B_order_visibility": { "stars": null, "tier": "", "note": "" },
    "C_growth_potential": { "score": null, "note": "" },
    "D_cheap_to_fair":    { "score": null, "note": "" },
    "E_increasing_moat":  { "score": null, "note": "" },
    "F_revaluation":      { "score": null, "note": "" }
  },

  "order_visibility": {
    "tier": "",
    "tier_label_zh": "",
    "stars": 0,
    "customers_named": [],
    "capacity_locked": "",
    "as_of": "",
    "receipts": [
      {
        "tier": 1,
        "tier_label": "contractual / capacity-locked",
        "summary_en": "",
        "summary_zh": "",
        "source": "",
        "source_url": "",
        "dated": "",
        "expires": ""
      }
    ],
    "kill": ""
  },

  "rationale": {
    "version": 1,
    "signed": "",
    "dated": "",
    "mechanism": { "en": "", "zh": "", "ja": "" },
    "moat_widening": { "en": "", "zh": "", "ja": "" },
    "revaluation_thesis": { "en": "", "zh": "", "ja": "" },
    "kill_condition": { "en": "", "zh": "", "ja": "" },
    "if_kill_then": { "en": "", "zh": "", "ja": "" }
  },

  "history": []
}
```

## Tier definitions

**Order-visibility stars (Box B):**
- ★★★★★ `H1 看到底` — Q+1 fully booked + Q+2/Q+3/Q+4 scheduled
- ★★★★ `H1 + Q3` — Q+1 fully booked + Q+2 80%+ + Q+3 partial
- ★★★ `半年能見度` — Q+1 + Q+2 both scheduled
- ★★ `單季能見度` — Q+1 only
- ★ `模糊` — vague language ("動能不錯", "客戶持續詢問")
- (none) `無` / red flag

**Box B clears at ★★★★ minimum.** Below = name does not go on the desk.

**Receipt tiers (priority of evidence):**
- T1 contractual / capacity-locked — capex justifications, MOUs, named customers
- T2 management explicit guidance with numbers — specific Q+N booking %, revenue raise with named driver
- T3 supply-chain triangulation — equipment / lead-time / utilization checks
- T4 sell-side check — broker estimate raises citing same driver

**Receipt freshness windows:**
- T1: 90 days
- T2: 60 days
- T3: 30 days
- T4: 30 days

After expiry the receipt drops off the live page until re-confirmed. The
`history[]` array preserves the audit trail.

## Sources

`公開資訊觀測站` · `法說會逐字稿` · `工商時報` · `經濟日報` · `MoneyDJ` ·
`玉山證券 reports` · `工研院產業分析師` · TSMC briefings (where public).
**Never invent a receipt.** If the source can't be linked, mark
`[PENDING — source]` and leave it off the live screen.
