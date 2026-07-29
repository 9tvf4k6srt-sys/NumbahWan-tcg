# Patch 4.2 notes

- Harbor Ward rare drop rate moves from 0.4% to 0.55%. Dungeon clears fell 18%
  after the boss HP buff in 4.1, so the effective rare supply dropped with it.
  This restores the intended rate of roughly 3 rares per 1,000 clears.
- Auction house now shows the last 90 days of sale history on every card page.
  It was 30. Thin history made thinly traded cards look more stable than they are.
- Fixed: bidding at the exact close of an auction no longer charges you without
  recording the bid. Root cause was a race between the ledger write and the
  countdown timer; the ledger now wins.
