# OpenAlex Research Paper Data Extraction Tool

A web-based academic research discovery and metadata extraction application built with **React, Vite, Node.js, Express, and the OpenAlex Works API**.

The application allows users to search scholarly works, apply research filters, retrieve structured metadata, monitor extraction progress, inspect individual papers, trace records back to OpenAlex, and export results as CSV or JSON.

---

## 1. Project Overview

The **OpenAlex Research Paper Data Extraction Tool** is designed to support academic research discovery and structured metadata extraction from the OpenAlex scholarly database.

The application provides:

* Academic research search
* Publication-year filtering
* Minimum citation filtering
* Work-type filtering
* Open-access filtering
* Relevance/citation/date sorting
* Configurable result counts
* API pagination
* Duplicate detection and removal
* Data normalization
* Retry handling
* HTTP 429 rate-limit handling
* HTTP 4xx/5xx error handling
* Network and timeout handling
* Extraction progress reporting
* Extraction statistics
* OpenAlex Work ID traceability
* DOI and landing-page links
* Paper detail views
* CSV export
* JSON export
* Automated testing
* Production build verification

---

# 2. Technology Stack

## Frontend

* React
* Vite
* JavaScript
* CSS

## Backend

* Node.js
* Express
* OpenAlex Works API

## Testing

* Vitest

## Data Source

* OpenAlex Works API

---

# 3. Application Architecture

The application uses a frontend-backend architecture.

```text
+-------------------------+
|       Frontend          |
|      React + Vite       |
+------------+------------+
             |
             | HTTP Request
             v
+-------------------------+
|        Backend          |
|     Node.js + Express   |
+------------+------------+
             |
             | API Request
             v
+-------------------------+
|      OpenAlex API       |
|     Works / Metadata    |
+------------+------------+
             |
             v
+-------------------------+
| Validation &             |
| Normalization            |
+------------+-------------+
             |
             v
+-------------------------+
| Deduplication            |
| Work ID / DOI / Title    |
+------------+-------------+
             |
             v
+-------------------------+
| Filtering & Sorting      |
+------------+-------------+
             |
             v
+-------------------------+
| Results / Details        |
| CSV / JSON Export        |
+-------------------------+
```

### Data Flow

```text
User Search
    |
    v
React Frontend
    |
    v
Express Backend
    |
    v
OpenAlex Works API
    |
    v
Response Validation
    |
    v
Metadata Normalization
    |
    v
Deduplication
    |
    v
Filtering / Sorting
    |
    v
Frontend Results
    |
    +----> Paper Details
    |
    +----> Open Paper / DOI / PDF / OpenAlex
    |
    +----> CSV Export
    |
    +----> JSON Export
```

---

# 4. Project Structure

The main project structure is:

```text
openalex-research-tool/
|
+-- frontend/
    |
    +-- src/
    |   +-- App.jsx
    |   +-- App.css
    |   +-- ...
    |
    +-- server/
    |   +-- server.cjs
    |
    +-- tests/
    |   +-- basic.test.js
    |   +-- server.test.js
    |
    +-- public/
    |
    +-- package.json
    +-- vite.config.js
    +-- postcss.config.cjs
    +-- README.md
    +-- ...
```

---

# 5. Requirements

The following software is required:

* Node.js
* npm

Verify the installed versions:

```bash
node --version
npm --version
```

---

# 6. Installation

Open PowerShell or a terminal in the frontend directory:

```bash
cd C:\Users\PRANJALI\Documents\openalex-research-tool\frontend
```

Install project dependencies:

```bash
npm install
```

---

# 7. Running the Application

The application uses a separate backend and frontend development server.

## 7.1 Start the Backend

From the `frontend` directory:

```bash
node server/server.cjs
```

The backend normally runs on:

```text
http://localhost:5000
```

The search API endpoint is:

```text
http://localhost:5000/api/search
```

Keep the backend terminal running.

---

## 7.2 Start the Frontend

Open a second terminal:

```bash
cd C:\Users\PRANJALI\Documents\openalex-research-tool\frontend
```

Start Vite:

```bash
npm run dev
```

Vite normally provides:

```text
http://localhost:5173
```

Open the displayed address in a browser.

---

# 8. Search Strategy

The application searches the OpenAlex Works API using the research topic entered by the user.

Research topics may contain related terminology.

For example, Extended Reality research may involve:

```text
Extended Reality
Virtual Reality
Augmented Reality
Mixed Reality
XR
VR
AR
MR
```

Related terms can be used as separate research queries when required by the research task.

Returned OpenAlex records are combined and duplicate records are removed using the application's deduplication strategy.

---

# 9. Publication-Year Filtering

The application supports:

* From Year
* To Year

Example:

```text
From Year: 2020
To Year: 2025
```

The selected publication period is used to restrict the research results.

The backend passes applicable filtering parameters to OpenAlex where supported.

---

# 10. Pagination

The application supports retrieval of larger result sets through OpenAlex pagination.

The backend uses OpenAlex cursor-based pagination where applicable.

This allows extraction to continue across multiple API pages instead of depending only on the first API response.

The extraction interface reports:

* Requested records
* Loaded records
* Received records
* Unique records
* Duplicate records removed
* Pages processed
* Failed requests
* DOI records
* Open-access records
* Records with missing authors
* Progress
* Completion status

Frontend pagination is used to navigate through the records currently loaded for the active search.

---

# 11. Deduplication

Duplicate academic works can occur when related search terms overlap.

The application uses a layered duplicate-detection strategy.

## Primary Identifier

```text
OpenAlex Work ID
```

## Secondary Identifier

```text
DOI
```

## Fallback Identifier

```text
Normalized Title
```

The general strategy is:

```text
OpenAlex Work ID
       |
       v
If unavailable -> DOI
       |
       v
If unavailable -> Normalized Title
```

The extraction summary reports the number of duplicate records removed.

---

# 12. Data Normalization

The application converts OpenAlex metadata into a consistent structured format.

Normalized information can include:

* OpenAlex Work ID
* Title
* Authors
* Author IDs
* Institutions
* Countries
* Publication date
* Publication year
* Work type
* Language
* Journal/source
* ISSN
* Abstract
* Topics/concepts
* Citation count
* Open-access status
* DOI
* PDF URL
* Landing-page URL
* Paper URL
* Retraction status

Missing metadata is handled consistently.

For example, unavailable structured values can be represented as empty values instead of mixing different placeholder formats.

---

# 13. API Reliability

The backend contains error-handling and retry mechanisms for OpenAlex requests.

## HTTP 429 Rate Limiting

When OpenAlex returns HTTP 429, the application waits before retrying.

Example:

```text
OpenAlex returned 429
Waiting before OpenAlex request
Retry
```

## HTTP 500 Server Errors

Temporary server-side failures are retried.

## Network Failures

Network failures are caught and retried.

## Timeout Failures

Timeout and aborted-request failures are handled and retried.

## HTTP 400 and Other Non-Retryable Errors

Client-side errors that should not be retried repeatedly are handled without unnecessary retries.

---

# 14. Retry Strategy

The backend uses multiple request attempts with increasing waiting periods.

The general flow is:

```text
Request
   |
   v
Success? ---- Yes ----> Return Result
   |
   No
   |
   v
Retryable Error?
   |
   +---- No ----> Return Error
   |
   +---- Yes
            |
            v
       Wait / Backoff
            |
            v
          Retry
            |
            v
       Maximum Attempts
            |
            v
       Return Meaningful Error
```

This improves resilience against temporary OpenAlex API failures, rate limiting, network failures, and timeouts.

---

# 15. User Interface Features

## Search

Users can enter an academic research topic.

Example:

```text
machine learning
```

Search can be started by clicking the Search button or pressing Enter.

---

## Date Filters

```text
From Year
To Year
```

---

## Citation Filter

```text
Minimum Citations
```

---

## Sorting

The application supports sorting options including:

```text
Relevance
Most Citations
Newest
```

---

## Work-Type Filtering

The application supports filtering by academic work type.

Examples include:

```text
Article
Review
Book
Book Chapter
Dataset
Dissertation
Editorial
Letter
Preprint
Report
Standard
Other
```

---

## Open-Access Filtering

The application supports:

```text
All Papers
Open Access Only
```

---

## Result Count

Users can request different result sizes:

```text
5
10
20
50
```

---

# 16. Results Interface

Research results provide structured information such as:

* Title
* Authors
* Publication date
* Citation count
* Source/journal
* DOI availability
* Abstract
* Work type
* Open-access status

Users can select:

```text
View Paper
```

to inspect a detailed paper view.

---

# 17. Paper Details

The paper detail view can display:

* Title
* Authors
* Publication date
* Publication year
* Citation count
* Work type
* OpenAlex Work ID
* Source
* Language
* Open-access status
* DOI
* Retraction status
* Journal/source
* ISSN
* Abstract
* Authors and institutions
* Research concepts/topics

---

# 18. Paper Traceability

Each research record retains its OpenAlex Work ID.

Traceability follows the general relationship:

```text
OpenAlex Work ID
       |
       v
DOI
       |
       v
Landing Page / Paper URL
```

The application also provides an OpenAlex record link where available.

This makes it possible to trace an extracted record back to its OpenAlex source.

---

# 19. External Paper Links

Depending on the metadata available for a record, users may access:

* Open Paper
* DOI
* OpenAlex record
* PDF

External destinations are opened separately from the application.

Availability depends on the metadata supplied by OpenAlex.

---

# 20. Extraction Summary

After a search, the application provides an extraction summary.

The summary can include:

```text
Requested
Loaded
Received
Unique
Duplicates Removed
Pages Processed
Failed Requests
DOI Records
Open Access
Missing Authors
Progress
Complete
```

The interface also identifies:

```text
Source: OpenAlex Works API
```

and provides traceability information based on:

```text
OpenAlex Work ID -> DOI -> normalized title
```

The progress indicator provides feedback during extraction.

For example:

```text
Requested: 20
Loaded: 20
Received: 20
Unique: 20
Duplicates Removed: 0
Pages Processed: 1
Progress: Complete
```

The exact values depend on the search and the records returned by OpenAlex.

---

# 21. CSV Export

Users can export the loaded results as:

```text
openalex-research-results.csv
```

The export can contain structured fields such as:

```text
openalex_id
title
doi
publication_date
publication_year
work_type
language
authors
author_ids
institutions
countries
journal
issn
abstract
keywords_topics
citation_count
is_open_access
pdf_url
landing_page_url
paper_url
is_retracted
```

CSV values are escaped so that commas, quotation marks, and other metadata characters do not corrupt the CSV structure.

---

# 22. JSON Export

Users can also export the results as:

```text
openalex-research-results.json
```

The JSON export uses the same general structured metadata model as the CSV export.

This keeps the two export formats consistent.

---

# 23. Security

Credentials and secrets should not be placed directly inside frontend JavaScript.

If credentials are required for deployment or another service, they should be stored using environment variables or an appropriate secret-management system.

Secrets should never be committed to a public repository.

Do not expose credentials in:

* Frontend JavaScript
* Screenshots
* README files
* Public repositories
* Browser console logs

---

# 24. Automated Testing

The project uses **Vitest** for automated testing.

Run the test suite using:

```bash
npm run test:run
```

The current test suite verifies application and backend behavior including:

* Basic application functionality
* API success responses
* Empty results
* Invalid queries
* Missing fields
* Duplicate handling
* DOI/title fallback behavior
* HTTP 429 handling
* HTTP 400 handling
* HTTP 500 handling
* Repeated server failures
* Network failures
* Timeout failures
* Retry behavior
* Backend API behavior

Current verification:

```text
Test Files: 2 passed
Tests:      62 passed
```

A successful test run should end with both test files passing and all tests passing.

---

# 25. Production Build

The frontend production build can be verified using:

```bash
npm run build
```

A successful build generates the Vite `dist` directory.

Example successful output:

```text
vite build

✓ built successfully
```

The production build verifies that the frontend can be compiled successfully for deployment.

---

# 26. Development Workflow

A typical development workflow is:

```text
1. Start backend
       |
       v
2. Start Vite frontend
       |
       v
3. Enter research query
       |
       v
4. Apply filters
       |
       v
5. Search OpenAlex
       |
       v
6. Retrieve API records
       |
       v
7. Validate response
       |
       v
8. Normalize metadata
       |
       v
9. Deduplicate records
       |
       v
10. Apply filtering / sorting
       |
       v
11. Display extraction summary
       |
       v
12. Review papers
       |
       v
13. Open paper / DOI / PDF
       |
       v
14. Export CSV or JSON
```

---

# 27. UI Error Handling

The application provides feedback for common situations.

Examples include:

```text
Please enter a research topic.
```

```text
From Year cannot be greater than To Year.
```

```text
No papers found for this search.
```

```text
Unable to connect to the research server.
```

During an active search, the search control provides progress feedback such as:

```text
Searching...
```

This prevents the user from being uncertain about whether the request is still running.

---

# 28. Empty Results

When no records match the search or selected filters, the application displays an empty state instead of leaving the results area blank.

Users can try:

* Another research topic
* Removing filters
* Adjusting publication years
* Reducing the minimum citation requirement

---

# 29. Known Limitations

The following limitations should be considered:

1. Search quality depends on OpenAlex search and metadata.
2. Some papers do not contain abstracts.
3. Some records do not have a DOI.
4. Some records do not have a freely accessible PDF.
5. Institution and country information depends on OpenAlex metadata.
6. External paper and DOI links depend on valid URLs being available.
7. Frontend pagination operates over records loaded for the current search.
8. Very large-scale extraction may require background jobs and persistent storage.
9. OpenAlex API availability and rate limits are controlled by OpenAlex.
10. Persistent query/record caching is not currently implemented.

---

# 30. Assessment Criteria Coverage

The current implementation addresses the following major requirements:

| Requirement                | Status               |
| -------------------------- | -------------------- |
| Academic research search   | Implemented          |
| Publication-year filtering | Implemented          |
| Citation filtering         | Implemented          |
| Work-type filtering        | Implemented          |
| Open-access filtering      | Implemented          |
| Sorting                    | Implemented          |
| Result-count selection     | Implemented          |
| API pagination             | Implemented          |
| Cursor-based API strategy  | Implemented          |
| Deduplication              | Implemented          |
| OpenAlex Work ID           | Implemented          |
| DOI fallback               | Implemented          |
| Normalized-title fallback  | Implemented          |
| Data normalization         | Implemented          |
| HTTP 429 handling          | Implemented          |
| HTTP 4xx handling          | Implemented          |
| HTTP 5xx handling          | Implemented          |
| Network failure handling   | Implemented          |
| Timeout handling           | Implemented          |
| Retry with backoff         | Implemented          |
| Extraction progress        | Implemented          |
| Extraction statistics      | Implemented          |
| DOI traceability           | Implemented          |
| Paper details              | Implemented          |
| OpenAlex links             | Implemented          |
| DOI links                  | Implemented          |
| PDF links when available   | Implemented          |
| CSV export                 | Implemented          |
| JSON export                | Implemented          |
| Automated tests            | Implemented          |
| Production build           | Verified             |
| Persistent caching         | Future enhancement   |
| Advanced secret management | Deployment-dependent |

---

# 31. Caching

Persistent caching is not currently part of the implementation.

A future version could cache:

* Previously searched queries
* OpenAlex Work records
* API responses
* Frequently requested metadata

Caching could reduce repeated API requests and improve response times for frequently searched topics.

For the current application, OpenAlex remains the source of truth for retrieved research metadata.

---

# 32. Recommended Future Improvements

Potential future improvements include:

## Persistent Caching

Cache previously retrieved queries and OpenAlex records.

## Background Extraction Jobs

For very large datasets, extraction could run as a background job instead of keeping a browser request active.

## Database Storage

A database could support:

* Saved searches
* Research collections
* Historical extraction results
* Persistent deduplication
* Cached OpenAlex records

## Advanced Search

Future versions could support:

* Author search
* Institution search
* Journal filtering
* Topic filtering
* Country filtering
* Language filtering

## Advanced Export

Additional export formats could include:

* Excel
* BibTeX
* RIS
* EndNote

---

# 33. Final Verification

Before submitting the project, run:

```bash
npm run build
```

Then:

```bash
npm run test:run
```

The current verified result is:

```text
Test Files: 2 passed
Tests:      62 passed
```

The production build also completes successfully.

The application should additionally be manually checked for:

* Search
* Filters
* Sorting
* Pagination
* Extraction summary
* Paper details
* Open Paper
* DOI
* OpenAlex
* PDF when available
* CSV export
* JSON export
* Clear/reset behavior
* Empty search results
* Error messages

---

# 34. Conclusion

The **OpenAlex Research Paper Data Extraction Tool** provides a structured interface for academic research discovery and metadata extraction.

The application combines:

```text
React
+
Vite
+
Node.js
+
Express
+
OpenAlex Works API
+
Pagination
+
Filtering
+
Sorting
+
Deduplication
+
Normalization
+
Retry Handling
+
Extraction Statistics
+
Traceability
+
Paper Details
+
CSV/JSON Export
+
Automated Testing
```

The current implementation focuses on reliable academic metadata retrieval, transparent extraction statistics, traceability to OpenAlex records, structured exports, and resilience against common API failures.

The project is suitable for academic research discovery, metadata extraction, demonstration, and evaluation against requirements involving reliability, data quality, traceability, usability, testing, and API handling.
