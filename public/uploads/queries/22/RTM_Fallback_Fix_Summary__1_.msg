Subject: RTM Fallback and Energy Balance Fix Summary

1. RTM Fallback Fix
- Earlier, when load_fulfilled=False, residue_solar and residue_wind were calculated but not allocated.
- Energy could remain stranded.
- Now, residue is routed to GDAM/RTM using existing split logic.

2. Energy Balance Validation
Formula:
Hyb_Sch =
GDAM_Solar + GDAM_Wind +
NEW_BUYER_Solar + NEW_BUYER_Wind +
All Buyer Solar/Wind +
RTM_Solar + RTM_Wind

- Mismatch > 0.1 MW generates warning and mismatch record.

Impact:
- HP allocation unchanged
- LP allocation unchanged
- Buyer allocation logic unchanged
- Success path unchanged
- RTM values may increase where energy was previously stranded
