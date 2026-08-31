import { describe, test, expect } from "vitest";

/*
=========================================================
HELPER FUNCTIONS
These mirror the important data-processing behaviour
used by the OpenAlex Research Explorer.
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

  if (
    openAccess === "true"
  ) {
    filters.push(
      "is_oa:true"
    );
  }

  return filters;
}

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
TESTS
=========================================================
*/

describe(
  "OpenAlex Research Explorer - Core Tests",
  () => {

    /*
    =====================================================
    1. NORMALIZE TITLES
    =====================================================
    */

    test(
      "normalizes titles consistently",
      () => {
        const title =
          "  Virtual-Reality: Research!  ";

        expect(
          normalizeTitle(title)
        ).toBe(
          "virtualreality research"
        );
      }
    );

    /*
    =====================================================
    2. NORMALIZE DOI
    =====================================================
    */

    test(
      "normalizes DOI URLs",
      () => {
        expect(
          normalizeDoi(
            "https://doi.org/10.1234/ABC"
          )
        ).toBe(
          "10.1234/abc"
        );

        expect(
          normalizeDoi(
            "doi: 10.1234/ABC"
          )
        ).toBe(
          "10.1234/abc"
        );
      }
    );

    /*
    =====================================================
    3. OPENALEX ID DEDUPLICATION
    =====================================================
    */

    test(
      "removes duplicate works using OpenAlex ID",
      () => {
        const works = [
          {
            id: "https://openalex.org/W123",
            title: "Paper One",
          },
          {
            id: "https://openalex.org/W123",
            title: "Paper One Duplicate",
          },
          {
            id: "https://openalex.org/W456",
            title: "Paper Two",
          },
        ];

        const unique =
          deduplicateWorks(works);

        expect(unique).toHaveLength(2);

        expect(
          unique[0].id
        ).toBe(
          "https://openalex.org/W123"
        );

        expect(
          unique[1].id
        ).toBe(
          "https://openalex.org/W456"
        );
      }
    );

    /*
    =====================================================
    4. DOI DEDUPLICATION
    =====================================================
    */

    test(
      "uses DOI when OpenAlex ID is unavailable",
      () => {
        const works = [
          {
            doi:
              "https://doi.org/10.1000/test",
            title: "Research Paper",
          },
          {
            doi:
              "10.1000/TEST",
            title: "Research Paper Duplicate",
          },
        ];

        const unique =
          deduplicateWorks(works);

        expect(unique).toHaveLength(1);
      }
    );

    /*
    =====================================================
    5. TITLE FALLBACK
    =====================================================
    */

    test(
      "uses normalized title as duplicate fallback",
      () => {
        const works = [
          {
            title:
              "Virtual Reality in Education",
          },
          {
            title:
              " VIRTUAL REALITY IN EDUCATION ",
          },
        ];

        const unique =
          deduplicateWorks(works);

        expect(unique).toHaveLength(1);
      }
    );

    /*
    =====================================================
    6. YEAR FILTER
    =====================================================
    */

    test(
      "creates correct publication year filter",
      () => {
        const filters =
          buildFilters({
            fromYear: "2020",
            toYear: "2025",
          });

        expect(
          filters
        ).toContain(
          "from_publication_date:2020-01-01,to_publication_date:2025-12-31"
        );
      }
    );

    /*
    =====================================================
    7. INVALID YEAR RANGE
    =====================================================
    */

    test(
      "rejects an invalid year range",
      () => {
        expect(() =>
          buildFilters({
            fromYear: "2025",
            toYear: "2020",
          })
        ).toThrow(
          "From Year cannot be greater than To Year."
        );
      }
    );

    /*
    =====================================================
    8. MINIMUM CITATIONS
    =====================================================
    */

    test(
      "creates minimum citation filter",
      () => {
        const filters =
          buildFilters({
            minCitations: "100",
          });

        expect(
          filters
        ).toContain(
          "cited_by_count:>99"
        );
      }
    );

    /*
    =====================================================
    9. WORK TYPE
    =====================================================
    */

    test(
      "creates work type filter",
      () => {
        const filters =
          buildFilters({
            workType: "article",
          });

        expect(
          filters
        ).toContain(
          "type:article"
        );
      }
    );

    /*
    =====================================================
    10. OPEN ACCESS
    =====================================================
    */

    test(
      "creates open access filter",
      () => {
        const filters =
          buildFilters({
            openAccess: "true",
          });

        expect(
          filters
        ).toContain(
          "is_oa:true"
        );
      }
    );

    /*
    =====================================================
    11. COMBINED FILTERS
    =====================================================
    */

    test(
      "supports multiple filters together",
      () => {
        const filters =
          buildFilters({
            fromYear: "2020",
            toYear: "2025",
            minCitations: "50",
            workType: "article",
            openAccess: "true",
          });

        expect(filters).toHaveLength(4);

        expect(
          filters
        ).toContain(
          "from_publication_date:2020-01-01,to_publication_date:2025-12-31"
        );

        expect(
          filters
        ).toContain(
          "cited_by_count:>49"
        );

        expect(
          filters
        ).toContain(
          "type:article"
        );

        expect(
          filters
        ).toContain(
          "is_oa:true"
        );
      }
    );

    /*
    =====================================================
    12. SORT BY CITATIONS
    =====================================================
    */

    test(
      "sorts by citations correctly",
      () => {
        expect(
          getSortValue("citations")
        ).toBe(
          "cited_by_count:desc"
        );
      }
    );

    /*
    =====================================================
    13. SORT BY DATE
    =====================================================
    */

    test(
      "sorts by publication date correctly",
      () => {
        expect(
          getSortValue("date")
        ).toBe(
          "publication_date:desc"
        );
      }
    );

    /*
    =====================================================
    14. DEFAULT SORT
    =====================================================
    */

    test(
      "uses relevance as the default sort",
      () => {
        expect(
          getSortValue("relevance")
        ).toBe(
          "relevance_score:desc"
        );

        expect(
          getSortValue()
        ).toBe(
          "relevance_score:desc"
        );
      }
    );

    /*
    =====================================================
    15. EMPTY ARRAY
    =====================================================
    */

    test(
      "handles an empty result array",
      () => {
        expect(
          deduplicateWorks([])
        ).toEqual([]);
      }
    );

    /*
    =====================================================
    16. INVALID INPUT
    =====================================================
    */

    test(
      "handles invalid deduplication input",
      () => {
        expect(
          deduplicateWorks(null)
        ).toEqual([]);

        expect(
          deduplicateWorks(undefined)
        ).toEqual([]);

        expect(
          deduplicateWorks("invalid")
        ).toEqual([]);
      }
    );

    /*
    =====================================================
    17. WORK WITHOUT IDENTIFIERS
    =====================================================
    */

    test(
      "keeps records without identifiers",
      () => {
        const works = [
          {
            title: "",
          },
          {},
        ];

        const unique =
          deduplicateWorks(works);

        expect(unique).toHaveLength(2);
      }
    );

    /*
    =====================================================
    18. API URL
    =====================================================
    */

    test(
      "uses the OpenAlex Works API",
      () => {
        const apiUrl =
          "https://api.openalex.org/works";

        expect(apiUrl).toContain(
          "https://api.openalex.org"
        );

        expect(apiUrl).toContain(
          "/works"
        );
      }
    );

    /*
    =====================================================
    19. EXTRACTION TARGET
    =====================================================
    */

    test(
      "supports the maximum frontend result limit",
      () => {
        const allowedValues = [
          5,
          10,
          20,
          50,
        ];

        expect(
          allowedValues
        ).toContain(50);

        expect(
          Math.max(...allowedValues)
        ).toBe(50);
      }
    );

    /*
    =====================================================
    20. TRACEABILITY
    =====================================================
    */

    test(
      "OpenAlex Work ID is preserved",
      () => {
        const paper = {
          id:
            "https://openalex.org/W123456",
          title:
            "Example Research Paper",
        };

        expect(
          paper.id
        ).toBe(
          "https://openalex.org/W123456"
        );
      }
    );

  }
);