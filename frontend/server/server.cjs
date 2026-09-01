require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = 5000;
const OPENALEX_URL = "https://api.openalex.org/works";

/*
=========================================================
MIDDLEWARE
=========================================================
*/

app.use(cors());
app.use(express.json());

/*
=========================================================
CACHE
=========================================================
*/

const cache = new Map();
const CACHE_TIME = 10 * 60 * 1000;

/*
=========================================================
REQUEST PROTECTION
=========================================================
*/

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000;

async function waitBeforeRequest() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;

  if (elapsed < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - elapsed;

    console.log(
      `Waiting ${Math.ceil(waitTime / 1000)} seconds before OpenAlex request...`
    );

    await new Promise((resolve) => {
      setTimeout(resolve, waitTime);
    });
  }

  lastRequestTime = Date.now();
}

/*
=========================================================
NORMALIZE TITLE
=========================================================
*/

function normalizeTitle(title) {
  if (!title || typeof title !== "string") {
    return "";
  }

  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/*
=========================================================
NORMALIZE DOI
=========================================================
*/

function normalizeDoi(doi) {
  if (!doi || typeof doi !== "string") {
    return "";
  }

  return doi
    .toLowerCase()
    .trim()
    .replace(
      /^https?:\/\/(dx\.)?doi\.org\//,
      ""
    )
    .replace(/^doi:\s*/i, "")
    .replace(/\s+/g, "");
}

/*
=========================================================
DEDUPLICATION
=========================================================
*/

function getDuplicateKey(work) {
  if (!work || typeof work !== "object") {
    return null;
  }

  const workId =
    typeof work.id === "string"
      ? work.id.trim().toLowerCase()
      : "";

  if (workId) {
    return `id:${workId}`;
  }

  const doi = normalizeDoi(work.doi);

  if (doi) {
    return `doi:${doi}`;
  }

  const title = normalizeTitle(
    work.title ||
      work.display_name ||
      ""
  );

  if (title) {
    return `title:${title}`;
  }

  return null;
}

function deduplicateWorks(works) {
  if (!Array.isArray(works)) {
    return [];
  }

  const seenKeys = new Set();
  const uniqueWorks = [];

  for (const work of works) {
    const key = getDuplicateKey(work);

    if (key && seenKeys.has(key)) {
      continue;
    }

    if (key) {
      seenKeys.add(key);
    }

    uniqueWorks.push(work);
  }

  return uniqueWorks;
}

/*
=========================================================
XR SEARCH TERMS
=========================================================
*/

const XR_SEARCH_TERMS = [
  "Extended Reality",
  "Virtual Reality",
  "Augmented Reality",
  "Mixed Reality",
  "XR",
  "VR",
  "AR",
  "MR",
];

function normalizeSearchText(text) {
  return normalizeTitle(text);
}

function isXRQuery(query) {
  const normalizedQuery =
    normalizeSearchText(query);

  if (!normalizedQuery) {
    return false;
  }

  const xrTerms = XR_SEARCH_TERMS.map(
    normalizeSearchText
  );

  return xrTerms.some((term) => {
    if (!term) {
      return false;
    }

    const expression = new RegExp(
      `(^|\\s)${term.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}(\\s|$)`,
      "i"
    );

    return expression.test(normalizedQuery);
  });
}

function buildSearchTerms(query) {
  const cleanQuery =
    typeof query === "string"
      ? query.trim()
      : "";

  if (!cleanQuery) {
    return [];
  }

  if (!isXRQuery(cleanQuery)) {
    return [cleanQuery];
  }

  const terms = [
    cleanQuery,
    ...XR_SEARCH_TERMS,
  ];

  const seen = new Set();

  return terms.filter((term) => {
    const normalized =
      normalizeSearchText(term);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);

    return true;
  });
}

/*
=========================================================
OPENALEX REQUEST
=========================================================
*/

async function requestOpenAlex(url) {
  let attempts = 0;

  while (attempts < 5) {
    attempts++;

    await waitBeforeRequest();

    console.log(
      `OpenAlex request attempt ${attempts}/5`
    );

    let response;

    try {
      response = await fetch(url, {
      headers: {
  Accept: "application/json",
  "User-Agent":
    "OpenAlex-Research-Explorer/1.0",
 
},
     signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      console.error(
        "OpenAlex network/timeout error:",
        error.message
      );

      if (attempts < 5) {
        const waitSeconds = Math.min(
          30,
          2 ** attempts
        );

        await new Promise((resolve) => {
          setTimeout(
            resolve,
            waitSeconds * 1000
          );
        });

        continue;
      }

      throw new Error(
        "OpenAlex request timed out or could not be reached."
      );
    }

    if (response.ok) {
      return await response.json();
    }

    if (response.status === 429) {
      const retryAfter =
        response.headers.get("retry-after");

      let waitSeconds = Number(retryAfter);

      if (
        !Number.isFinite(waitSeconds) ||
        waitSeconds <= 0
      ) {
        waitSeconds = Math.min(
          30,
          2 ** attempts
        );
      }

      waitSeconds = Math.min(
        waitSeconds,
        30
      );

      console.log(
        `OpenAlex returned 429. Waiting ${waitSeconds} seconds...`
      );

      await new Promise((resolve) => {
        setTimeout(
          resolve,
          waitSeconds * 1000
        );
      });

      continue;
    }

    if (
      response.status >= 500 &&
      response.status <= 599
    ) {
      const errorText =
        await response.text();

      console.error(
        `OpenAlex server error ${response.status}`
      );

      if (attempts < 5) {
        const waitSeconds = Math.min(
          30,
          2 ** attempts
        );

        await new Promise((resolve) => {
          setTimeout(
            resolve,
            waitSeconds * 1000
          );
        });

        continue;
      }

      throw new Error(
        `OpenAlex returned HTTP ${response.status}: ${errorText}`
      );
    }

    const errorText =
      await response.text();

    throw new Error(
      `OpenAlex returned HTTP ${response.status}: ${errorText}`
    );
  }

  throw new Error(
    "OpenAlex request failed after multiple attempts."
  );
}

/*
=========================================================
FILTERS
=========================================================
*/

function buildFilters({
  fromYear,
  toYear,
  minCitations,
  workType,
  openAccess,
}) {
  const filters = [];

  const currentYear =
    new Date().getFullYear();

  let validFromYear = null;
  let validToYear = null;

  if (fromYear) {
    const parsed = Number(fromYear);

    if (
      Number.isInteger(parsed) &&
      parsed >= 1800 &&
      parsed <= currentYear
    ) {
      validFromYear = parsed;
    }
  }

  if (toYear) {
    const parsed = Number(toYear);

    if (
      Number.isInteger(parsed) &&
      parsed >= 1800 &&
      parsed <= currentYear
    ) {
      validToYear = parsed;
    }
  }

  if (
    validFromYear !== null &&
    validToYear !== null
  ) {
    if (
      validFromYear >
      validToYear
    ) {
      throw new Error(
        "From Year cannot be greater than To Year."
      );
    }

    filters.push(
      `from_publication_date:${validFromYear}-01-01,to_publication_date:${validToYear}-12-31`
    );
  } else if (
    validFromYear !== null
  ) {
    filters.push(
      `from_publication_date:${validFromYear}-01-01`
    );
  } else if (
    validToYear !== null
  ) {
    filters.push(
      `to_publication_date:${validToYear}-12-31`
    );
  }

  if (minCitations) {
    const citations =
      Number(minCitations);

    if (
      Number.isFinite(citations) &&
      citations >= 0
    ) {
      const minimum =
        Math.floor(citations);

      if (minimum > 0) {
        filters.push(
          `cited_by_count:>${minimum - 1}`
        );
      }
    }
  }

  if (workType) {
    filters.push(
      `type:${workType}`
    );
  }

  if (openAccess === "true") {
    filters.push("is_oa:true");
  }

  return {
    filters,
    validFromYear,
    validToYear,
  };
}

/*
=========================================================
SORT
=========================================================
*/

function getSortValue(sortBy) {
  if (sortBy === "citations") {
    return "cited_by_count:desc";
  }

  if (sortBy === "date") {
    return "publication_date:desc";
  }

  return "relevance_score:desc";
}

/*
=========================================================
HEALTH CHECK
=========================================================
*/

app.get("/", (req, res) => {
  res.json({
    name:
      "OpenAlex Research Explorer",
    status:
      "running",
    message:
      "Backend is working.",
    searchEndpoint:
      "http://localhost:5000/api/search",
    testEndpoint:
      "http://localhost:5000/api/test",
  });
});

/*
=========================================================
TEST ENDPOINT
=========================================================
*/

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message:
      "Backend API is working correctly.",
    server:
      "OpenAlex Research Explorer",
    port:
      PORT,
  });
});

/*
=========================================================
SEARCH ENDPOINT
=========================================================
*/

app.get(
  "/api/search",
  async (req, res) => {
    try {
      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const fromYear =
        typeof req.query.fromYear === "string"
          ? req.query.fromYear.trim()
          : "";

      const toYear =
        typeof req.query.toYear === "string"
          ? req.query.toYear.trim()
          : "";

      const minCitations =
        typeof req.query.minCitations === "string"
          ? req.query.minCitations.trim()
          : "";

      const sortBy =
        typeof req.query.sortBy === "string"
          ? req.query.sortBy.trim()
          : "relevance";

      const workType =
        typeof req.query.workType === "string"
          ? req.query.workType.trim()
          : "";

      const openAccess =
        typeof req.query.openAccess === "string"
          ? req.query.openAccess.trim()
          : "";

      let resultCount =
        parseInt(
          req.query.resultCount,
          10
        ) || 20;

      if (!search) {
        return res.status(400).json({
          error:
            "Please enter a research topic.",
        });
      }

      resultCount = Math.min(
        Math.max(resultCount, 1),
        50
      );

      const { filters } = buildFilters({
        fromYear,
        toYear,
        minCitations,
        workType,
        openAccess,
      });

      const sort =
        getSortValue(sortBy);

      const searchTerms =
        buildSearchTerms(search);

      const expandedSearch =
        searchTerms.length > 1;

      const cacheKey =
        JSON.stringify({
          searchTerms,
          fromYear,
          toYear,
          minCitations,
          sortBy,
          workType,
          openAccess,
          resultCount,
        });

      const cached =
        cache.get(cacheKey);

      if (
        cached &&
        Date.now() -
          cached.timestamp <
          CACHE_TIME
      ) {
        return res.json(
          cached.data
        );
      }

      const allResults = [];

      let pagesProcessed = 0;
      let recordsRetrieved = 0;
      let failedRequests = 0;
      let duplicatesRemoved = 0;

      const maxPagesPerTerm = 100;

      const termStatistics = [];

      for (
        const searchTerm of searchTerms
      ) {
        if (
          allResults.length >=
          resultCount
        ) {
          break;
        }

        let cursor = "*";
        let termPages = 0;
        let termRecords = 0;
        let termFailed = 0;

        while (
          allResults.length <
            resultCount &&
          cursor &&
          termPages <
            maxPagesPerTerm
        ) {
          termPages++;
          pagesProcessed++;

          const beforeUnique =
            deduplicateWorks(
              allResults
            ).length;

          const remaining =
            Math.max(
              1,
              resultCount -
                beforeUnique
            );

          const perPage =
            Math.min(
              100,
              remaining
            );

          const params =
            new URLSearchParams();

          params.set(
            "search",
            searchTerm
          );

          params.set(
            "per-page",
            String(perPage)
          );

          params.set(
            "cursor",
            cursor
          );

          params.set(
            "sort",
            sort
          );

          if (
            filters.length > 0
          ) {
            params.set(
              "filter",
              filters.join(",")
            );
          }

          if (
            process.env.OPENALEX_EMAIL
          ) {
            params.set(
              "mailto",
              process.env.OPENALEX_EMAIL
            );
          }

          params.set("api_key", process.env.OPENALEX_API_KEY);
	const url =
            `${OPENALEX_URL}?${params.toString()}`;

          try {
            const data =
              await requestOpenAlex(
                url
              );

            const pageResults =
              Array.isArray(
                data?.results
              )
                ? data.results
                : [];

            recordsRetrieved +=
              pageResults.length;

            termRecords +=
              pageResults.length;

            allResults.push(
              ...pageResults
            );

            const before =
              allResults.length;

            const uniqueResults =
              deduplicateWorks(
                allResults
              );

            duplicatesRemoved =
              before -
              uniqueResults.length;

            allResults.length = 0;

            allResults.push(
              ...uniqueResults
            );

            if (
              allResults.length >=
              resultCount
            ) {
              break;
            }

            const nextCursor =
              data?.meta?.next_cursor ||
              null;

            if (
              !nextCursor ||
              nextCursor === cursor
            ) {
              cursor = null;
              break;
            }

            cursor =
              nextCursor;
          } catch (error) {
            failedRequests++;
            termFailed++;

            console.error(
              `Search term "${searchTerm}" page ${termPages} failed:`,
              error.message
            );

            cursor = null;
            break;
          }
        }

        termStatistics.push({
          term:
            searchTerm,
          pagesProcessed:
            termPages,
          recordsRetrieved:
            termRecords,
          failedRequests:
            termFailed,
        });
      }

      const finalUniqueResults =
        deduplicateWorks(
          allResults
        );

      duplicatesRemoved =
        Math.max(
          0,
          recordsRetrieved -
            finalUniqueResults.length
        );

      const limitedResults =
        finalUniqueResults.slice(
          0,
          resultCount
        );

      const completed =
        limitedResults.length >=
        resultCount;

      const nextCursor =
        completed
          ? null
          : null;

      const responseData = {
        results:
          limitedResults,

        meta: {
          count:
            limitedResults.length,

          pages_processed:
            pagesProcessed,

          records_retrieved:
            recordsRetrieved,

          failed_requests:
            failedRequests,

          duplicates_removed:
            duplicatesRemoved,

          next_cursor:
            nextCursor,

          search_terms:
            searchTerms,

          related_term_expansion:
            expandedSearch,

          term_statistics:
            termStatistics,
        },

        nextCursor,

        totalRequested:
          resultCount,

        extraction: {
          requested:
            resultCount,

          pagesProcessed,

          recordsRetrieved,

          received:
            recordsRetrieved,

          unique:
            limitedResults.length,

          duplicatesRemoved,

          failedRequests,

          returned:
            limitedResults.length,

          completed,

          source:
            "OpenAlex Works API",

          searchStrategy:
            expandedSearch
              ? "Original query + related XR terminology"
              : "Original query",

          searchTerms,

          termStatistics,
        },
      };

      cache.set(
        cacheKey,
        {
          timestamp:
            Date.now(),
          data:
            responseData,
        }
      );

      if (
        cache.size > 100
      ) {
        const firstKey =
          cache.keys()
            .next()
            .value;

        if (firstKey) {
          cache.delete(
            firstKey
          );
        }
      }

      return res.json(
        responseData
      );
    } catch (error) {
      console.error(
        "SEARCH ERROR:",
        error.message
      );

      return res.status(500).json({
        error:
          error.message ||
          "Unable to search OpenAlex.",
      });
    }
  }
);

/*
=========================================================
EXPORT FOR TESTING
=========================================================
*/

module.exports = {
  app,
  normalizeTitle,
  normalizeDoi,
  getDuplicateKey,
  deduplicateWorks,
  buildSearchTerms,
  isXRQuery,
  buildFilters,
  getSortValue,
  requestOpenAlex,
};

/*
=========================================================
START SERVER
=========================================================
*/

if (require.main === module) {
  app.listen(
    PORT,
    () => {
      console.log("");
      console.log(
        "======================================"
      );
      console.log(
        "OpenAlex Research Explorer"
      );
      console.log(
        "======================================"
      );
      console.log(
        `Backend: http://localhost:${PORT}`
      );
      console.log(
        `Test:    http://localhost:${PORT}/api/test`
      );
      console.log(
        `Search:  http://localhost:${PORT}/api/search`
      );
      console.log(
        "======================================"
      );
      console.log("");
    }
  );
}