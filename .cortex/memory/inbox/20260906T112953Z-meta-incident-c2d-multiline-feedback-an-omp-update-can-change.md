---
agent: meta-incident-c2d-multiline
ts: 2026-09-06T11:29:53.421Z
---
feedback: an omp update can change the render of a parked multi-line paste in the composer (2026-08-01: text chip [Paste #N]; 2026-09-02 omp 18.1.4: file-attachment chip 📄 #N in the editor with a preview card). c2d's omp stall recovery matches the render, so after any omp update, re-capture the parked-paste screen live and check hasOmpParkedChip still sees it; a steer that reports the honest parked failure with a 📄 #N chip on the target screen is a stale detector, not a delivery that cannot happen (incident 2026-09-06-c2d-multiline-attachment-chip).
