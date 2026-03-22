# Data Sources — Provenance Log

## Proposed Gas Pipelines

### Primary Source: EEIA Major Natural Gas Pipeline Projects List
- **Publisher:** Energy Equipment & Infrastructure Alliance (EEIA)
- **Date:** August 27, 2025
- **URL:** https://eeia.org/wp-content/uploads/2025/08/EEIA-Full-Project-List-8-27-25.pdf
- **Description:** List of 28 major (>$200M CAPEX) natural gas pipeline projects under construction, under review, or announced. Includes project name, operator, status/FERC docket, target in-service year, states, CAPEX estimate, length in miles, and capacity in Bcf/d.
- **CAPEX note:** Where not disclosed by sponsor, EEIA estimated at $6.5M/mile industry average.
- **Limitations:** Self-described as "not comprehensive." Does not include abandonments, minor projects, blanket program projects, storage, or LNG terminals without pipelines.

### Supplementary Source: FERC eLibrary
- **Publisher:** Federal Energy Regulatory Commission
- **URL:** https://www.ferc.gov/industries-data/natural-gas/major-pipeline-projects-pending
- **Accessed:** March 21, 2026
- **Description:** Used to verify docket numbers, NEPA status, and filing details for projects with active FERC proceedings.
- **Projects enriched:** Mississippi Crossing (CP25-514-000), South System Expansion 4 (CP25-517-000), Southeast Supply Enhancement (CP25-10), ANR Heartland (CP25-79-000), Sabine Crossing (CP25-505-000), MVP Southgate (CP26-60), DeLa Express (PF24-4-000), Kosciusko Junction.
- **Limitation:** FERC.gov returned 403 errors on direct fetch; data obtained via web search results and individual project pages.

### Supplementary Source: FERC Web Search Results
- **Publisher:** Various (FERC press releases, Norton Rose Fulbright, White & Case, Pipeline & Gas Journal)
- **Accessed:** March 21, 2026
- **Description:** Used to verify project details, NEPA document status, and timeline information.

---

## Proposed Transmission Lines

### Source Composition
16 major interstate electric transmission projects compiled from multiple sources. Unlike the pipeline data (single EEIA source), transmission data was assembled from a mix of government and industry sources per project.

### Primary Sources (Government — Tier 1)

**FERC eLibrary**
- **Publisher:** Federal Energy Regulatory Commission
- **URL:** https://www.ferc.gov/electric-transmission
- **Used for:** Docket numbers, negotiated rate authority orders, compliance filings
- **Projects covered:** SunZia (ER24-2117-000), Grain Belt Express (ER24-59), TransWest Express (ER21-645-000), CHPE (ER20-1214-000), NECEC (EL21-6-000), SOO Green (ER20-1665), RioSol (ER24-1726-000), B2H (EC23-111-000), Southern Spirit (137 FERC P 61206)
- **Accessed:** 2026-03-21

**DOE Grid Deployment Office / Transmission Facilitation Program**
- **Publisher:** U.S. Department of Energy
- **URL:** https://www.energy.gov/gdo/transmission-facilitation-program-selections
- **Used for:** TFP selection status, federal funding amounts
- **Projects covered:** Cross-Tie, Southline (Rounds 1 & 2), Southern Spirit ($360M), Cimarron Link ($306M), Twin States (withdrew)
- **Accessed:** 2026-03-21

**FAST-41 Permitting Dashboard**
- **Publisher:** Federal Permitting Improvement Steering Council
- **URL:** https://www.permits.performance.gov/
- **Used for:** Permitting milestones, project timelines
- **Projects covered:** SunZia, Grain Belt Express, Boardman-Hemingway
- **Accessed:** 2026-03-21

**BLM / Forest Service Records of Decision**
- **Used for:** Cross-Tie (FEIS Sept 2024, RODs 2024), TransWest Express, Gateway South
- **Accessed:** 2026-03-21

**DOE Presidential Permits**
- **Used for:** Lake Erie Connector (PP-412-1, issued Jan 2025)
- **Accessed:** 2026-03-21

### Secondary Sources (News — Tier 3)

**Utility Dive**
- **Used for:** SOO Green, RioSol, Southern Spirit, Grain Belt Express project updates
- **Flagged as:** Secondary news source; publication dates noted per article

**New Hampshire Bulletin**
- **Used for:** Twin States Clean Energy Link
- **Flagged as:** Secondary news source

### Industry Sources (Tier 4 — Flagged)

Multiple project developer websites used for construction status, capacity, and timeline details. Treated as potentially partial per Ultan standards. Projects relying primarily on industry sources:
- Gateway South (PacifiCorp press releases)
- Southline (developer website)
- Cimarron Link (developer website)
- Lake Erie Connector (NextEra project site)

### Known Gaps and Limitations

1. **MISO LRTP not included:** Tranche 1 (18 projects, $10.3B, approved July 2022) and Tranche 2.1 (24 projects, $21.8B, approved Dec 2024) are the largest transmission investment programs in the US but consist mostly of intrastate regulated utility builds, not merchant interstate projects. Should be noted as context.
2. **SPP, PJM, CAISO regional plans not individually listed:** Regional transmission expansion plans contain dozens of projects each but are mostly intrastate.
3. **Cardinal-Hickory Creek and Gateway South are operational (2024):** Included as recent reference points, not pending projects.
4. **NECEC is operational (Jan 2026):** Included as recently completed reference.
5. **MW capacity for HVAC lines:** Thermal/stability limit, not nameplate. For HVDC, MW is converter capacity. These are not directly comparable without documentation.
6. **In-service dates:** Developer targets. Large transmission projects historically experience 2-5 year delays.
7. **Twin States data confidence is low:** Withdrew from DOE TFP funding. Unclear path forward.

---

## State Permitting Data

### Source: FAI State Permitting Playbook Parts 1 & 2
- **Publisher:** Foundation for American Innovation (thefai.org)
- **Authors:** Samuel Roland
- **Dates:** Part 1: June 2024; Part 2: November 2025
- **Coverage:** 49 states (all except California)
- **Source type:** Advocacy/think tank (tier 4), but checklists reference primary government sources (state regulations, EPA SIP approvals, NPDES authorization records)
- **Description:** Structured yes/no checklists per state across five categories: State Environmental Policy Act, Clean Air Act (PALs, flexible permits), Clean Water Act (Section 404 assumption, NPDES), State Endangered Species Act, State Permitting Dashboard
- **Accessed:** 2026-03-21
- **Limitations:**
  - California not covered
  - Asterisked entries have qualifications in state-by-state analysis text — simplified to boolean in JSON with notes field
  - Dashboard checklist only available for Part 2 states (17 states)
  - Part 1 published June 2024, Part 2 November 2025 — some state laws may have changed
  - Florida Section 404 assumption was in legal dispute at time of Part 1 publication

### Key Findings for Infrastructure Permitting
- **Section 404 assumption removes NEPA trigger** (p.16, Part 2) — only MI and NJ have done this
- **47 of 50 states have NPDES authority** — MA, NH, NM do not
- **Only NJ, VT, WA have real-time permitting step tracking**
- **Most states do NOT have SEPAs** — those that do add significant process burden

---

## NEPA EIS Timeline Data

### Source: NEPA EIS Dashboard (Hochman/FAI)
- **Publisher:** Thomas Hochman, Foundation for American Innovation
- **URL:** https://tbhochman.github.io/nepa-eis-dashboard/
- **Last updated:** 2026-03-13
- **Primary data:** CEQ EIS Timeline Reports (2025) — 928 completed EISs with FEIS published 2010-2024
- **Supplementary data:** EPA EIS Database (cdxapps.epa.gov) for 2025-2026 filings
- **Fields:** Project name, lead agency, category, state, NOI date, FEIS date, ROD date, days NOI-to-ROD
- **Source type:** Tier 4 (advocacy organization) but uses tier-1 government data (CEQ, EPA)
- **Accessed:** 2026-03-21
- **Limitations:**
  - Records without ROD included in completion counts but excluded from duration calculations
  - Court challenge data (350+ lawsuits) cross-referenced via Climate Case Chart and Earthjustice — not yet integrated into our dashboard
  - FERC pipeline projects appear under agency "FERC" and category "Energy Fossil"
  - Only 2 completed FERC pipeline EISs in dataset (Ruby Pipeline, Apex Expansion) — most FERC pipeline reviews use EA, not EIS
  - 1,003 total completed EISs in dataset (updated count from data.js fetch 2026-03-21)
- **Integration:** Benchmark statistics extracted and stored in `data/nepa-eis-context.json`. Displayed in project detail panel as timeline context. Energy Fossil benchmarks used for pipeline projects (median 2.9y, n=47); Energy Renewable for transmission (median 1.5y, n=28).

---

## Permitting Events

### Source Composition
Per-project permitting event timelines compiled from multiple sources per project. Each event individually sourced and classified by tier per Ultan framework.

- **Data files:** `data/permitting-events-transmission.json`, `data/permitting-events-pipelines.json`
- **Coverage:** 17 projects with documented events (8 transmission, 9 pipelines). Remaining projects marked [GAP].
- **Accessed:** 2026-03-21
- **Event count:** 153 total events

### Government Sources (Tier 1)
- **Federal Register** — NOI, DEIS, FEIS, ROD notices for NEPA reviews
- **FERC docket records** — Certificate applications, orders, schedules
- **DOE press releases** — Presidential permits, TFP selections, loan commitments/terminations
- **BLM/USFS ePlanning** — EIS documents, RODs, RMP amendments
- **DOI press releases** — Groundbreaking announcements, construction authorizations
- **State agency records** — Maine PUC/DEP/BEP orders, NC/VA DEQ Section 401 decisions, Oregon EFSC site certificates, WI/MO/KS/IL/IN PUC/PSC decisions
- **Court decisions** — DC Circuit, First Circuit, Seventh Circuit, Ninth Circuit opinions; Maine Supreme Judicial Court; Missouri Supreme Court; Illinois Supreme Court
- **FAST-41 Permitting Dashboard** (permits.performance.gov)

### News Sources (Tier 3 — flagged)
- Utility Dive, E&E News, Appalachian Voices, SELC press releases, Capitol News Illinois, NC Newsline, Portland Press Herald, WPR, WVTF, Maine Public, Tucson.com
- All news-sourced events tagged `[news]` in the data

### Industry Sources (Tier 4 — flagged)
- Developer press releases (Pattern Energy, Venture Global, Grain Belt Express, TransWest Express)
- Trade publications (PGJ Online, Natural Gas Intelligence, Oil & Gas Journal)
- All industry-sourced events tagged `[industry]` in the data

### Known Gaps
- ESA Section 7 biological opinions rarely publicly indexed; flagged as [GAP] per project
- NHPA Section 106 consultation details in FEIS appendices, not separately indexed
- State permitting filings per-project not yet available (show [GAP])
- 28 projects have no documented permitting events (early-stage or intrastate)
- Events with estimated dates marked `[ESTIMATE]`

---

## Existing Gas Pipelines

### Source: HIFLD Natural Gas Interstate and Intrastate Pipelines
- **Publisher:** Homeland Infrastructure Foundation-Level Data (HIFLD), U.S. Department of Homeland Security
- **URL:** https://hifld-geoplatform.opendata.arcgis.com/datasets/natural-gas-interstate-and-intrastate-pipelines
- **Source type:** Government (tier 1)
- **Accessed:** 2026-03-21
- **Description:** GeoJSON of natural gas pipeline segments. Original file contains 32,961 features (14,896 intrastate, 17,996 interstate, 69 gathering). All features have Status=Operating.
- **Processing:** Filtered to interstate pipelines only (17,958 features after removing 38 null geometries). Reprojected from EPSG:3857 (Web Mercator) to EPSG:4326 (WGS84). Properties stripped to operator name only. Coordinates rounded to 4 decimal places (~11m precision). Canvas renderer used for performance.
- **Fields retained:** operator, type (interstate)
- **Limitations:**
  - No diameter, capacity, pressure, or construction date fields
  - Pipeline segments, not named routes — no 1:1 mapping to named pipeline systems
  - HIFLD last-updated date not specified in source file
  - Intrastate and gathering pipelines excluded from dashboard

---

## Existing Transmission Lines

*(Pending — federal source TBD, likely EIA or HIFLD)*

---

## Geocoding Notes

**All coordinates are approximate.** For projects without published KML/GIS files from FERC eLibrary, origin and destination coordinates were estimated from:
1. Named city/town locations (highest confidence)
2. County centroids (medium confidence)
3. Basin or regional centroids (lowest confidence)

Each project has a `data_confidence` field and `confidence_note` explaining the basis for its geographic placement.

**Route geometries are straight lines between endpoints** until KML files from FERC filings are provided. These will be upgraded to `route_geometry` GeoJSON LineStrings when available.

---

## Data Freshness

| Dataset | Last Updated | Next Review |
|---------|-------------|-------------|
| Proposed Gas Pipelines | 2025-08-27 (EEIA) | When user provides updated source |
| FERC Docket Enrichment | 2026-03-21 | Ongoing |
| Proposed Transmission | 2026-03-21 | When user provides additional sources |
| State Permitting (FAI) | 2025-11 (Part 2) / 2024-06 (Part 1) | When FAI publishes updates |
| NEPA EIS Benchmarks | 2026-03-21 (via Hochman dashboard) | When CEQ publishes new timeline data |
| Permitting Events | 2026-03-21 | As projects advance through permitting |
| Existing Gas Pipelines (HIFLD) | 2026-03-21 | When HIFLD updates dataset |
| Existing Transmission | Pending | — |
