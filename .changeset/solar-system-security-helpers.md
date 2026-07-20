---
"@jitaspace/ui": patch
---

Add reusable solar-system security-status helpers (`securityStatusColor`, `securityStatusBand`, `formatSecurityStatus`, `isLightSecurityStatus`, `roundSecurityStatus`) and refactor `SolarSystemSecurityStatusBadge` to consume them, so the CCP security colour ramp lives in one place.
