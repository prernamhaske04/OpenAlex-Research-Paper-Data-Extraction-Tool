import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api/search";

/* =========================================================
   HELPERS
========================================================= */

function getPaperUrl(work) {
  const locations = [
    work?.best_oa_location,
    work?.primary_location,
    ...(work?.locations || []),
  ].filter(Boolean);

  for (const location of locations) {
    if (location?.landing_page_url?.startsWith("http")) {
      return location.landing_page_url;
    }

    if (location?.pdf_url?.startsWith("http")) {
      return location.pdf_url;
    }
  }

  if (work?.doi) {
    return work.doi.startsWith("http")
      ? work.doi
      : `https://doi.org/${work.doi}`;
  }

  if (work?.id) {
    return work.id;
  }

  return null;
}

function getPdfUrl(work) {
  const locations = [
    work?.best_oa_location,
    work?.primary_location,
    ...(work?.locations || []),
  ].filter(Boolean);

  for (const location of locations) {
    if (location?.pdf_url?.startsWith("http")) {
      return location.pdf_url;
    }
  }

  return null;
}

function getLandingPageUrl(work) {
  const locations = [
    work?.best_oa_location,
    work?.primary_location,
    ...(work?.locations || []),
  ].filter(Boolean);

  for (const location of locations) {
    if (location?.landing_page_url?.startsWith("http")) {
      return location.landing_page_url;
    }
  }

  return null;
}

function getDoiUrl(doi) {
  if (!doi) return null;

  return doi.startsWith("http")
    ? doi
    : `https://doi.org/${doi}`;
}

function getAuthors(work) {
  const authors = work?.authorships
    ?.map((author) => author?.author?.display_name)
    .filter(Boolean);

  if (!authors || authors.length === 0) {
    return "Unknown authors";
  }

  return authors.join(", ");
}

function getAuthorIds(work) {
  const ids = work?.authorships
    ?.map((authorship) => authorship?.author?.id)
    .filter(Boolean);

  return ids || [];
}

function getInstitutions(work) {
  const institutions = [];

  for (const authorship of work?.authorships || []) {
    for (const institution of authorship?.institutions || []) {
      if (institution?.display_name) {
        institutions.push(institution.display_name);
      }
    }
  }

  return [...new Set(institutions)];
}

function getCountries(work) {
  const countries = [];

  for (const authorship of work?.authorships || []) {
    for (const institution of authorship?.institutions || []) {
      if (institution?.country_code) {
        countries.push(
          institution.country_code.toUpperCase()
        );
      }
    }
  }

  return [...new Set(countries)];
}

function getSource(work) {
  return (
    work?.primary_location?.source?.display_name ||
    work?.best_oa_location?.source?.display_name ||
    work?.locations?.find((location) => location?.source)?.source
      ?.display_name ||
    "Unknown source"
  );
}

function getJournal(work) {
  return (
    work?.primary_location?.source?.display_name ||
    work?.best_oa_location?.source?.display_name ||
    "Unknown journal/source"
  );
}

function getIssn(work) {
  const issn =
    work?.primary_location?.source?.issn_l ||
    work?.primary_location?.source?.issn?.[0] ||
    work?.best_oa_location?.source?.issn_l ||
    work?.best_oa_location?.source?.issn?.[0] ||
    null;

  return issn || null;
}

function getTopics(work) {
  const topics = [];

  for (const topic of work?.topics || []) {
    if (topic?.display_name) {
      topics.push(topic.display_name);
    }
  }

  for (const concept of work?.concepts || []) {
    if (concept?.display_name) {
      topics.push(concept.display_name);
    }
  }

  return [...new Set(topics)];
}

function getAbstract(work) {
  if (!work?.abstract_inverted_index) {
    return "No abstract is available for this paper.";
  }

  const words = [];

  Object.entries(work.abstract_inverted_index).forEach(
    ([word, positions]) => {
      positions.forEach((position) => {
        words[position] = word;
      });
    }
  );

  return (
    words.filter(Boolean).join(" ") ||
    "No abstract is available for this paper."
  );
}

function formatDate(date) {
  if (!date) return "Unknown date";

  try {
    return new Date(date).toLocaleDateString("en-US");
  } catch {
    return date;
  }
}

function getType(work) {
  return work?.type
    ? work.type.replace(/-/g, " ").toUpperCase()
    : "RESEARCH WORK";
}

function getMissingValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  return value;
}

/* =========================================================
   EXPORT HELPERS
========================================================= */

function createExportRecord(paper) {
  return {
    openalex_id: getMissingValue(paper?.id),

    title: getMissingValue(
      paper?.title ||
        paper?.display_name
    ),

    doi: getMissingValue(
      paper?.doi
    ),

    publication_date:
      getMissingValue(
        paper?.publication_date
      ),

    publication_year:
      getMissingValue(
        paper?.publication_year
      ),

    work_type:
      getMissingValue(
        paper?.type
      ),

    language:
      getMissingValue(
        paper?.language
      ),

    authors:
      getAuthors(paper),

    author_ids:
      getAuthorIds(paper).join("; "),

    institutions:
      getInstitutions(paper).join("; "),

    countries:
      getCountries(paper).join("; "),

    journal:
      getJournal(paper),

    issn:
      getIssn(paper) || "",

    abstract:
      getAbstract(paper),

    keywords_topics:
      getTopics(paper).join("; "),

    citation_count:
      paper?.cited_by_count || 0,

    is_open_access:
      paper?.open_access?.is_oa
        ? "Yes"
        : "No",

    pdf_url:
      getPdfUrl(paper) || "",

    landing_page_url:
      getLandingPageUrl(paper) || "",

    paper_url:
      getPaperUrl(paper) || "",

    is_retracted:
      paper?.is_retracted
        ? "Yes"
        : "No",
  };
}

function downloadFile(
  content,
  fileName,
  mimeType
) {
  const blob = new Blob(
    [content],
    {
      type: mimeType,
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download = fileName;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const text = String(value);

  return `"${text.replace(
    /"/g,
    '""'
  )}"`;
}

function exportCSV(papers) {
  if (
    !papers ||
    papers.length === 0
  ) {
    return;
  }

  const records =
    papers.map(
      createExportRecord
    );

  const headers =
    Object.keys(
      records[0]
    );

  const rows =
    records.map(
      (record) =>
        headers
          .map(
            (header) =>
              escapeCsvValue(
                record[header]
              )
          )
          .join(",")
    );

  const csv = [
    headers
      .map(
        escapeCsvValue
      )
      .join(","),

    ...rows,
  ].join("\n");

  downloadFile(
    csv,
    "openalex-research-results.csv",
    "text/csv;charset=utf-8;"
  );
}

function exportJSON(papers) {
  if (
    !papers ||
    papers.length === 0
  ) {
    return;
  }

  const records =
    papers.map(
      createExportRecord
    );

  const json =
    JSON.stringify(
      records,
      null,
      2
    );

  downloadFile(
    json,
    "openalex-research-results.json",
    "application/json;charset=utf-8;"
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [query, setQuery] =
    useState(
      "machine learning"
    );

  const [fromYear, setFromYear] =
    useState("");

  const [toYear, setToYear] =
    useState("");

  const [minCitations, setMinCitations] =
    useState("");

  const [sortBy, setSortBy] =
    useState("relevance");

  const [resultCount, setResultCount] =
    useState("20");

  const [workType, setWorkType] =
    useState("");

  const [openAccess, setOpenAccess] =
    useState("");

  const [papers, setPapers] =
    useState([]);

  const [searched, setSearched] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [selectedPaper, setSelectedPaper] =
    useState(null);

  const papersPerPage = 5;

  const [currentPage, setCurrentPage] =
    useState(1);

  const [extraction, setExtraction] =
    useState({
      received: 0,
      unique: 0,
      duplicatesRemoved: 0,
      pagesProcessed: 0,
      failedRequests: 0,
      requested: 0,
      completed: false,
    });

  /* =======================================================
     SEARCH
  ======================================================= */

  async function searchOpenAlex() {
    if (!query.trim()) {
      setError(
        "Please enter a research topic."
      );

      return;
    }

    if (
      fromYear &&
      toYear &&
      Number(fromYear) >
        Number(toYear)
    ) {
      setError(
        "From Year cannot be greater than To Year."
      );

      return;
    }

    setLoading(true);

    setError("");

    setSearched(true);

    setSelectedPaper(null);

    setCurrentPage(1);

    setPapers([]);

    setExtraction({
      received: 0,
      unique: 0,
      duplicatesRemoved: 0,
      pagesProcessed: 0,
      failedRequests: 0,
      requested: Number(resultCount),
      completed: false,
    });

    try {
      const params =
        new URLSearchParams();

      params.set(
        "search",
        query.trim()
      );

      params.set(
        "resultCount",
        resultCount
      );

      params.set(
        "sortBy",
        sortBy
      );

      params.set(
        "cursor",
        "*"
      );

      if (fromYear.trim()) {
        params.set(
          "fromYear",
          fromYear.trim()
        );
      }

      if (toYear.trim()) {
        params.set(
          "toYear",
          toYear.trim()
        );
      }

      if (
        minCitations.trim()
      ) {
        params.set(
          "minCitations",
          minCitations.trim()
        );
      }

      if (workType) {
        params.set(
          "workType",
          workType
        );
      }

      if (openAccess) {
        params.set(
          "openAccess",
          openAccess
        );
      }

      const response =
        await fetch(
          `${API_URL}?${params.toString()}`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Server returned HTTP ${response.status}`
        );
      }

      const results =
        Array.isArray(
          data?.results
        )
          ? data.results
          : [];

      /*
       * Frontend safety deduplication.
       * Backend is expected to perform the
       * primary OpenAlex ID → DOI → title
       * deduplication.
       */
      const seenIds =
        new Set();

      const seenDois =
        new Set();

      const seenTitles =
        new Set();

      const uniqueResults =
        results.filter(
          (paper) => {
            const openAlexId =
              paper?.id
                ?.trim()
                .toLowerCase();

            const doi =
              paper?.doi
                ?.trim()
                .toLowerCase();

            const title =
              (
                paper?.title ||
                paper?.display_name ||
                ""
              )
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");

            if (
              openAlexId &&
              seenIds.has(openAlexId)
            ) {
              return false;
            }

            if (
              doi &&
              seenDois.has(doi)
            ) {
              return false;
            }

            if (
              !openAlexId &&
              !doi &&
              title &&
              seenTitles.has(title)
            ) {
              return false;
            }

            if (openAlexId) {
              seenIds.add(openAlexId);
            }

            if (doi) {
              seenDois.add(doi);
            }

            if (title) {
              seenTitles.add(title);
            }

            return true;
          }
        );

      const limitedResults =
        uniqueResults.slice(
          0,
          Number(resultCount)
        );

      setPapers(
        limitedResults
      );

      const returnedExtraction =
        data?.extraction ||
        {};

      setExtraction({
        received:
          returnedExtraction.received ??
          results.length,

        unique:
          returnedExtraction.unique ??
          limitedResults.length,

        duplicatesRemoved:
          returnedExtraction.duplicatesRemoved ??
          Math.max(
            0,
            results.length -
              uniqueResults.length
          ),

        pagesProcessed:
          returnedExtraction.pagesProcessed ??
          0,

        failedRequests:
          returnedExtraction.failedRequests ??
          0,

        requested:
          returnedExtraction.requested ??
          Number(resultCount),

        completed:
          returnedExtraction.completed ??
          limitedResults.length >=
            Number(resultCount),
      });

      if (
        limitedResults.length ===
        0
      ) {
        setError(
          "No papers found for this search."
        );
      }
    } catch (err) {
      console.error(
        "Search error:",
        err
      );

      setPapers([]);

      setError(
        err.message ||
          "Unable to connect to the research server."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     CLEAR
  ======================================================= */

  function clearSearch() {
    setQuery(
      "machine learning"
    );

    setFromYear("");

    setToYear("");

    setMinCitations("");

    setSortBy("relevance");

    setResultCount("20");

    setWorkType("");

    setOpenAccess("");

    setPapers([]);

    setSearched(false);

    setSelectedPaper(null);

    setCurrentPage(1);

    setExtraction({
      received: 0,
      unique: 0,
      duplicatesRemoved: 0,
      pagesProcessed: 0,
      failedRequests: 0,
      requested: 0,
      completed: false,
    });

    setError("");
  }

  /* =======================================================
     KEYBOARD
  ======================================================= */

  function handleKeyDown(
    event
  ) {
    if (
      event.key ===
      "Enter"
    ) {
      searchOpenAlex();
    }
  }

  /* =======================================================
     FILTER CHANGES
  ======================================================= */

  function changeResultCount(
    value
  ) {
    setResultCount(value);

    setCurrentPage(1);
  }

  function changeSort(
    value
  ) {
    setSortBy(value);

    setCurrentPage(1);
  }

  function changeWorkType(
    value
  ) {
    setWorkType(value);

    setCurrentPage(1);
  }

  function changeOpenAccess(
    value
  ) {
    setOpenAccess(value);

    setCurrentPage(1);
  }

  /* =======================================================
     LOCAL PAGINATION
  ======================================================= */

  const totalPages =
    Math.ceil(
      papers.length /
        papersPerPage
    );

  const startIndex =
    (currentPage - 1) *
    papersPerPage;

  const endIndex =
    startIndex +
    papersPerPage;

  const visiblePapers =
    papers.slice(
      startIndex,
      endIndex
    );

  function goToNextPage() {
    if (
      loading ||
      currentPage >=
        totalPages
    ) {
      return;
    }

    setCurrentPage(
      (previousPage) =>
        previousPage + 1
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function goToPreviousPage() {
    if (
      loading ||
      currentPage <= 1
    ) {
      return;
    }

    setCurrentPage(
      (previousPage) =>
        previousPage - 1
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =======================================================
     EXTRACTION METRICS
  ======================================================= */

  const uniqueCount =
    extraction.unique ||
    papers.length;

  const doiCount =
    papers.filter(
      (paper) =>
        Boolean(
          paper?.doi
        )
    ).length;

  const openAccessCount =
    papers.filter(
      (paper) =>
        paper?.open_access
          ?.is_oa === true
    ).length;

  const missingAuthorCount =
    papers.filter(
      (paper) =>
        !paper?.authorships ||
        paper.authorships.length ===
          0
    ).length;

  const requestedCount =
    Number(
      extraction.requested ||
        resultCount
    );

  const progressPercent =
    requestedCount > 0
      ? Math.min(
          100,
          Math.round(
            (uniqueCount /
              requestedCount) *
              100
          )
        )
      : 0;

  /* =======================================================
     PAPER DETAILS
  ======================================================= */

  if (selectedPaper) {
    const paperUrl =
      getPaperUrl(
        selectedPaper
      );

    const doiUrl =
      getDoiUrl(
        selectedPaper.doi
      );

    const abstract =
      getAbstract(
        selectedPaper
      );

    const authors =
      getAuthors(
        selectedPaper
      );

    const source =
      getSource(
        selectedPaper
      );

    return (
      <div className="app">
        <header className="hero">
          <h1>
            OpenAlex Research Explorer
          </h1>

          <p>
            Discover academic papers,
            authors, journals,
            citations, and research
            sources in one place.
          </p>
        </header>

        <main className="details-page">
          <button
            className="back-button"
            onClick={() =>
              setSelectedPaper(null)
            }
          >
            ← Back to Results
          </button>

          <article className="paper-details">
            <div className="paper-badges">
              <div className="paper-type">
                {getType(
                  selectedPaper
                )}
              </div>

              {selectedPaper.open_access
                ?.is_oa && (
                <div className="oa-badge">
                  ✓ OPEN ACCESS
                </div>
              )}
            </div>

            <h1>
              {selectedPaper.title ||
                selectedPaper.display_name ||
                "Untitled paper"}
            </h1>

            <p className="authors">
              {authors}
            </p>

            <div className="meta-row">
              <span>
                📅{" "}
                {formatDate(
                  selectedPaper.publication_date
                )}
              </span>

              <span>
                📊{" "}
                {(
                  selectedPaper.cited_by_count ||
                  0
                ).toLocaleString()}{" "}
                citations
              </span>

              <span>
                📚 {source}
              </span>
            </div>

            <section>
              <h2>
                Abstract
              </h2>

              <p className="abstract">
                {abstract}
              </p>
            </section>

            <section>
              <h2>
                Paper Information
              </h2>

              <div className="info-grid">
                <div>
                  <strong>
                    Publication Date
                  </strong>

                  <span>
                    {formatDate(
                      selectedPaper.publication_date
                    )}
                  </span>
                </div>

                <div>
                  <strong>
                    Publication Year
                  </strong>

                  <span>
                    {selectedPaper.publication_year ||
                      "Unknown"}
                  </span>
                </div>

                <div>
                  <strong>
                    Citations
                  </strong>

                  <span>
                    {(
                      selectedPaper.cited_by_count ||
                      0
                    ).toLocaleString()}
                  </span>
                </div>

                <div>
                  <strong>
                    Type
                  </strong>

                  <span>
                    {selectedPaper.type ||
                      "Unknown"}
                  </span>
                </div>

                <div>
                  <strong>
                    OpenAlex ID
                  </strong>

                  <span className="break-text">
                    {selectedPaper.id ||
                      "Unavailable"}
                  </span>
                </div>

                <div>
                  <strong>
                    Source
                  </strong>

                  <span>
                    {source}
                  </span>
                </div>

                <div>
                  <strong>
                    Language
                  </strong>

                  <span>
                    {selectedPaper.language ||
                      "Unknown"}
                  </span>
                </div>

                <div>
                  <strong>
                    Open Access
                  </strong>

                  <span>
                    {selectedPaper.open_access
                      ?.is_oa
                      ? "Yes"
                      : "No"}
                  </span>
                </div>

                <div>
                  <strong>
                    DOI
                  </strong>

                  <span className="break-text">
                    {selectedPaper.doi ||
                      "Unavailable"}
                  </span>
                </div>

                <div>
                  <strong>
                    Retracted
                  </strong>

                  <span>
                    {selectedPaper.is_retracted
                      ? "Yes"
                      : "No"}
                  </span>
                </div>

                <div>
                  <strong>
                    Journal / Source
                  </strong>

                  <span>
                    {getJournal(
                      selectedPaper
                    )}
                  </span>
                </div>

                <div>
                  <strong>
                    ISSN
                  </strong>

                  <span>
                    {getIssn(
                      selectedPaper
                    ) ||
                      "Unavailable"}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h2>
                Authors
              </h2>

              <div className="authors-list">
                {selectedPaper.authorships
                  ?.length ? (
                  selectedPaper.authorships.map(
                    (
                      authorship,
                      index
                    ) => (
                      <div
                        className="author-item"
                        key={
                          authorship
                            ?.author
                            ?.id ||
                          index
                        }
                      >
                        <strong>
                          {authorship
                            ?.author
                            ?.display_name ||
                            "Unknown author"}
                        </strong>

                        {authorship
                          ?.institutions
                          ?.length >
                          0 && (
                          <span>
                            {authorship.institutions
                              .map(
                                (
                                  institution
                                ) =>
                                  institution
                                    ?.display_name
                              )
                              .filter(
                                Boolean
                              )
                              .join(
                                ", "
                              )}
                          </span>
                        )}
                      </div>
                    )
                  )
                ) : (
                  <p>
                    Unknown authors
                  </p>
                )}
              </div>
            </section>

            <section>
              <h2>
                Paper Links
              </h2>

              <div className="paper-links">
                {paperUrl && (
                  <a
                    href={
                      paperUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="paper-link"
                  >
                    🔗 Open Paper
                  </a>
                )}

                {doiUrl && (
                  <a
                    href={
                      doiUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="paper-link"
                  >
                    🔬 DOI
                  </a>
                )}

                {selectedPaper.id && (
                  <a
                    href={
                      selectedPaper.id
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="paper-link"
                  >
                    🌐 OpenAlex
                  </a>
                )}

                {getPdfUrl(
                  selectedPaper
                ) && (
                  <a
                    href={getPdfUrl(
                      selectedPaper
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="paper-link"
                  >
                    📄 PDF
                  </a>
                )}
              </div>
            </section>

            {getTopics(
              selectedPaper
            ).length >
              0 && (
              <section>
                <h2>
                  Research Concepts
                </h2>

                <div className="concepts">
                  {getTopics(
                    selectedPaper
                  )
                    .slice(
                      0,
                      10
                    )
                    .map(
                      (
                        topic,
                        index
                      ) => (
                        <span
                          className="concept"
                          key={`${topic}-${index}`}
                        >
                          {topic}
                        </span>
                      )
                    )}
                </div>
              </section>
            )}
          </article>
        </main>
      </div>
    );
  }

  /* =======================================================
     SEARCH PAGE
  ======================================================= */

  return (
    <div className="app">
      <header className="hero">
        <h1>
          OpenAlex Research Explorer
        </h1>

        <p>
          Discover academic papers,
          authors, journals, citations,
          and research sources in one
          place.
        </p>
      </header>

      <main>
        <section className="search-card">
          <div className="search-row">
            <input
              type="text"
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Search academic research..."
            />

            <button
              onClick={
                searchOpenAlex
              }
              disabled={
                loading
              }
            >
              {loading
                ? "Searching..."
                : "Search →"}
            </button>
          </div>

          <div className="filters">
            <div className="field">
              <label htmlFor="fromYear">
                From Year
              </label>

              <input
                id="fromYear"
                type="number"
                min="1800"
                max={
                  new Date().getFullYear()
                }
                value={fromYear}
                onChange={(e) =>
                  setFromYear(
                    e.target.value
                  )
                }
                placeholder="e.g. 2020"
              />
            </div>

            <div className="field">
              <label htmlFor="toYear">
                To Year
              </label>

              <input
                id="toYear"
                type="number"
                min="1800"
                max={
                  new Date().getFullYear()
                }
                value={toYear}
                onChange={(e) =>
                  setToYear(
                    e.target.value
                  )
                }
                placeholder="e.g. 2025"
              />
            </div>

            <div className="field">
              <label htmlFor="citations">
                Minimum Citations
              </label>

              <input
                id="citations"
                type="number"
                min="0"
                value={
                  minCitations
                }
                onChange={(e) =>
                  setMinCitations(
                    e.target.value
                  )
                }
                placeholder="e.g. 100"
              />
            </div>

            <div className="field">
              <label htmlFor="sort">
                Sort By
              </label>

              <select
                id="sort"
                value={sortBy}
                onChange={(e) =>
                  changeSort(
                    e.target.value
                  )
                }
              >
                <option value="relevance">
                  Relevance
                </option>

                <option value="citations">
                  Most Citations
                </option>

                <option value="date">
                  Newest
                </option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="results">
                Results Per Request
              </label>

              <select
                id="results"
                value={
                  resultCount
                }
                onChange={(e) =>
                  changeResultCount(
                    e.target.value
                  )
                }
              >
                <option value="5">
                  5
                </option>

                <option value="10">
                  10
                </option>

                <option value="20">
                  20
                </option>

                <option value="50">
                  50
                </option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="workType">
                Work Type
              </label>

              <select
                id="workType"
                value={
                  workType
                }
                onChange={(e) =>
                  changeWorkType(
                    e.target.value
                  )
                }
              >
                <option value="">
                  All Types
                </option>

                <option value="article">
                  Article
                </option>

                <option value="review">
                  Review
                </option>

                <option value="book">
                  Book
                </option>

                <option value="book-chapter">
                  Book Chapter
                </option>

                <option value="dataset">
                  Dataset
                </option>

                <option value="dissertation">
                  Dissertation
                </option>

                <option value="editorial">
                  Editorial
                </option>

                <option value="letter">
                  Letter
                </option>

                <option value="preprint">
                  Preprint
                </option>

                <option value="report">
                  Report
                </option>

                <option value="standard">
                  Standard
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="openAccess">
                Open Access
              </label>

              <select
                id="openAccess"
                value={
                  openAccess
                }
                onChange={(e) =>
                  changeOpenAccess(
                    e.target.value
                  )
                }
              >
                <option value="">
                  All Papers
                </option>

                <option value="true">
                  Open Access Only
                </option>
              </select>
            </div>
          </div>

          <div className="search-bottom">
            <p className="helper">
              Search OpenAlex for
              academic works and
              research topics.
            </p>

            <button
              className="clear-button"
              onClick={
                clearSearch
              }
            >
              Clear
            </button>
          </div>
        </section>

        {error && (
          <div className="error-message">
            <strong>
              Search failed
            </strong>

            <div>
              {error}
            </div>
          </div>
        )}

        {loading && (
          <div className="loading">
            Searching OpenAlex...
          </div>
        )}

        {!loading &&
          searched &&
          papers.length >
            0 && (
            <section className="results-section">
              <div className="results-header">
                <div>
                  <div className="results-label">
                    DISCOVERY
                  </div>

                  <h2>
                    Research Results
                  </h2>

                  <span>
                    Showing{" "}
                    {
                      visiblePapers.length
                    }{" "}
                    of{" "}
                    {
                      papers.length
                    }{" "}
                    loaded academic works
                  </span>
                </div>

                <span className="total-results">
                  Page{" "}
                  {
                    currentPage
                  }{" "}
                  of{" "}
                  {
                    totalPages
                  }
                </span>
              </div>

              {/* =================================================
                  EXTRACTION SUMMARY
              ================================================= */}

              <section className="extraction-summary">
                <div className="results-label">
                  EXTRACTION SUMMARY
                </div>

                <h3>
                  Search & Data Processing
                </h3>

                <div className="summary-grid">
                  <div className="summary-item">
                    <strong>
                      Requested
                    </strong>

                    <span>
                      {
                        requestedCount
                      }
                    </span>

                    <small>
                      maximum academic works
                    </small>
                  </div>

                  <div className="summary-item">
                    <strong>
                      Loaded
                    </strong>

                    <span>
                      {
                        papers.length
                      }
                    </span>

                    <small>
                      works available in results
                    </small>
                  </div>

                  <div className="summary-item">
                    <strong>
                      Received
                    </strong>

                    <span>
                      {
                        extraction.received
                      }
                    </span>

                    <small>
                      works from API requests
                    </small>
                  </div>

                  <div className="summary-item">
                    <strong>
                      Unique
                    </strong>

                    <span>
                      {
                        uniqueCount
                      }
                    </span>

                    <small>
                      after deduplication
                    </small>
                  </div>

                  <div className="summary-item">
                    <strong>
                      Duplicates Removed
                    </strong>

                    <span>
                      {
                        extraction.duplicatesRemoved
                      }
                    </span>

                    <small>
                      ID / DOI / normalized title
                    </small>
                  </div>

                  <div className="summary-item">
                    <strong>
                      Pages Processed
                    </strong>

                    <span>
                      {
                        extraction.pagesProcessed
                      }
                    </span>

                    <small>
                      OpenAlex API pages
                    </small>
                  </div>

                  <div className="summary-item">
                    <strong>
                      Failed Requests
                    </strong>

                    <span>
                      {
                        extraction.failedRequests
                      }
                    </span>

                    <small>
                      API requests that failed
                    </small>
                  </div>

                  <div className="summary-item">
                    <strong>
                      DOI Records
                    </strong>

                    <span>
                      {
                        doiCount
                      }
                    </span>

                    <small>
                      loaded works with DOI
                    </small>
                  </div>

                  <div className="summary-item">
                    <strong>
                      Open Access
                    </strong>

                    <span>
                      {
                        openAccessCount
                      }
                    </span>

                    <small>
                      open-access works
                    </small>
                  </div>

                  <div className="summary-item">
                    <strong>
                      Missing Authors
                    </strong>

                    <span>
                      {
                        missingAuthorCount
                      }
                    </span>

                    <small>
                      works without author data
                    </small>
                  </div>

                  <div className="summary-item">
                    <strong>
                      Progress
                    </strong>

                    <span>
                      {
                        uniqueCount
                      }{" "}
                      /{" "}
                      {
                        requestedCount
                      }
                    </span>

                    <small>
                      requested results processed
                    </small>
                  </div>

                  <div className="summary-item">
                    <strong>
                      Status
                    </strong>

                    <span>
                      {extraction.completed
                        ? "Complete"
                        : "Partial"}
                    </span>

                    <small>
                      extraction status
                    </small>
                  </div>
                </div>

                <div className="progress-container">
                  <div className="progress-label">
                    <span>
                      Extraction progress
                    </span>

                    <span>
                      {
                        progressPercent
                      }
                      %
                    </span>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progressPercent}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="traceability">
                  <span>
                    🔎 Source: OpenAlex Works API
                  </span>

                  <span>
                    🆔 Traceability: OpenAlex
                    Work ID → DOI → normalized
                    title
                  </span>

                  <span>
                    📄 Pages processed:{" "}
                    {
                      extraction.pagesProcessed
                    }
                  </span>

                  <span>
                    ⚠️ Failed requests:{" "}
                    {
                      extraction.failedRequests
                    }
                  </span>

                  <span>
                    📄 Current page:{" "}
                    {
                      currentPage
                    }{" "}
                    /{" "}
                    {
                      totalPages
                    }
                  </span>
                </div>
              </section>

              <div className="export-buttons">
                <button
                  className="export-button"
                  onClick={() =>
                    exportCSV(
                      papers
                    )
                  }
                >
                  📥 Export CSV
                </button>

                <button
                  className="export-button"
                  onClick={() =>
                    exportJSON(
                      papers
                    )
                  }
                >
                  📥 Export JSON
                </button>
              </div>

              <div className="papers">
                {visiblePapers.map(
                  (
                    paper,
                    index
                  ) => (
                    <article
                      className="paper-card"
                      key={
                        paper.id ||
                        paper.doi ||
                        paper.title ||
                        index
                      }
                    >
                      <div className="paper-number">
                        {String(
                          startIndex +
                            index +
                            1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div className="paper-content">
                        <div className="paper-badges">
                          <span className="paper-type">
                            {getType(
                              paper
                            )}
                          </span>

                          {paper.open_access
                            ?.is_oa && (
                            <span className="oa-badge">
                              ✓ OPEN ACCESS
                            </span>
                          )}
                        </div>

                        <h3>
                          {paper.title ||
                            paper.display_name ||
                            "Untitled paper"}
                        </h3>

                        <p className="paper-authors">
                          {getAuthors(
                            paper
                          )}
                        </p>

                        <div className="paper-meta">
                          <span>
                            📅{" "}
                            {formatDate(
                              paper.publication_date
                            )}
                          </span>

                          <span>
                            📊{" "}
                            {(
                              paper.cited_by_count ||
                              0
                            ).toLocaleString()}{" "}
                            citations
                          </span>

                          <span>
                            📚{" "}
                            {getSource(
                              paper
                            )}
                          </span>

                          {paper.doi && (
                            <span>
                              🔬 DOI
                            </span>
                          )}
                        </div>

                        <p className="paper-abstract">
                          {getAbstract(
                            paper
                          ).length >
                          500
                            ? `${getAbstract(
                                paper
                              ).slice(
                                0,
                                500
                              )}...`
                            : getAbstract(
                                paper
                              )}
                        </p>

                        <div className="paper-footer">
                          <span>
                            OpenAlex Research
                          </span>

                          <button
                            onClick={() =>
                              setSelectedPaper(
                                paper
                              )
                            }
                          >
                            View paper →
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>

              {totalPages >
                1 && (
                <div className="pagination">
                  <button
                    className="page-button"
                    disabled={
                      currentPage ===
                        1 ||
                      loading
                    }
                    onClick={
                      goToPreviousPage
                    }
                  >
                    ← Previous
                  </button>

                  <button
                    className="page-button active"
                    disabled
                  >
                    {
                      currentPage
                    }
                  </button>

                  <button
                    className="page-button"
                    disabled={
                      currentPage >=
                        totalPages ||
                      loading
                    }
                    onClick={
                      goToNextPage
                    }
                  >
                    Next →
                  </button>

                  <div className="page-info">
                    Page{" "}
                    {
                      currentPage
                    }{" "}
                    of{" "}
                    {
                      totalPages
                    }
                  </div>
                </div>
              )}
            </section>
          )}

        {!loading &&
          searched &&
          papers.length ===
            0 &&
          !error && (
            <section className="welcome">
              <h2>
                No papers found
              </h2>

              <p>
                Try a different
                research topic or
                remove some filters.
              </p>
            </section>
          )}

        {!searched && (
          <section className="welcome">
            <h2>
              Search academic research
            </h2>

            <p>
              Enter a topic above to
              find papers from the
              OpenAlex research
              database.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;