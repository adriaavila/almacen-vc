# System Update

## POS Sales Fix Applied

**Issue:** POS sales were still not appearing in reports because the frontend was failing to send the connection to the patient.

**Fix:** Updated `src/app/requester/pos/page.tsx` to include `patientId` in the order creation request.

**Action Required:** Please refresh the POS page and try making a sale again. It should now appear in the reports.
