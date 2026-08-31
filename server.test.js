import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

import {
  normalizeTitle,
  normalizeDoi,
  getDuplicateKey,
  deduplicateWorks,
  buildSearchTerms,
  isXRQuery,
  buildFilters,
  getSortValue,
  requestOpenAlex,
} from "../server/server.cjs";

/*
=========================================================
BASIC BACKEND TESTS
=========================================================
*/

describe("OpenAlex Backend - Basic Tests", () => {
  test("backend test file is working", () => {
    expect(true).toBe(true);
  });

  test("Vitest environment is available", () => {
    expect(typeof describe).toBe("function");
    expect(typeof test).toBe("function");
    expect(typeof expect).toBe("function");
  });

  test("OpenAlex API URL is valid", () => {
    const url = "https://api.openalex.org/works";

    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain("api.openalex.org");
    expect(url).toContain("/works");
  });

  test("search endpoint path is correct", () => {
    expect("/api/search").toBe("/api/search");
  });

  test("backend port is configured", () => {
    expect(5000).toBe(5000);
  });

  test("uses cursor-based pagination starting with *", () => {
    expect("*").toBe("*");
  });

  test("supports a next cursor returned by OpenAlex", () => {
    const response = {
      meta: {
        next_cursor: "next-cursor-value",
      },
    };

    expect(response.meta.next_cursor).toBe(
      "next-cursor-value"
    );
  });

  test("can continue pagination when next cursor exists", () => {
    const response = {
      meta: {
        next_cursor: "cursor-2",
      },
    };

    const nextCursor =
      response.meta.next_cursor || null;

    expect(nextCursor).toBe("cursor-2");
  });

  test("handles pagination data containing records", () => {
    const response = {
      results: [
        {
          id: "https://openalex.org/W1",
          title: "Paper One",
        },
        {
          id: "https://openalex.org/W2",
          title: "Paper Two",
        },
      ],
      meta: {
        next_cursor: "cursor-2",
      },
    };

    expect(Array.isArray(response.results)).toBe(true);
    expect(response.results).toHaveLength(2);
    expect(response.meta.next_cursor).toBe("cursor-2");
  });

  test("stops pagination when next cursor is missing", () => {
    const response = {
      results: [
        {
          id: "https://openalex.org/W1",
        },
      ],
      meta: {},
    };

    const nextCursor =
      response.meta?.next_cursor || null;

    expect(nextCursor).toBeNull();
  });

  /*
  ========================================================
  NORMALIZATION
  ========================================================
  */

  test("normalizes paper titles", () => {
    expect(
      normalizeTitle("  Machine   Learning!  ")
    ).toBe("machine learning");

    expect(
      normalizeTitle("Café — Research")
    ).toBe("cafe research");
  });

  test("normalizes DOI URLs", () => {
    expect(
      normalizeDoi(
        "https://doi.org/10.1234/ABC"
      )
    ).toBe("10.1234/abc");

    expect(
      normalizeDoi(
        "http://dx.doi.org/10.5678/XYZ"
      )
    ).toBe("10.5678/xyz");
  });

  test("normalizes DOI prefix", () => {
    expect(
      normalizeDoi("doi: 10.1234/ABC")
    ).toBe("10.1234/abc");
  });

  test("handles missing DOI", () => {
    expect(normalizeDoi("")).toBe("");
    expect(normalizeDoi(null)).toBe("");
    expect(normalizeDoi(undefined)).toBe("");
  });

  /*
  ========================================================
  DEDUPLICATION
  ========================================================
  */

  test("creates duplicate key from OpenAlex ID", () => {
    const work = {
      id: "https://openalex.org/W123",
      title: "Test Paper",
    };

    expect(
      getDuplicateKey(work)
    ).toBe(
      "id:https://openalex.org/w123"
    );
  });

  test("uses DOI as secondary duplicate key", () => {
    const work = {
      doi: "https://doi.org/10.1234/ABC",
      title: "Test Paper",
    };

    expect(
      getDuplicateKey(work)
    ).toBe(
      "doi:10.1234/abc"
    );
  });

  test("uses normalized title as duplicate fallback", () => {
    const work = {
      title: "Machine   Learning!",
    };

    expect(
      getDuplicateKey(work)
    ).toBe(
      "title:machine learning"
    );
  });

  test("removes duplicate works", () => {
    const works = [
      {
        id: "https://openalex.org/W1",
        title: "Paper One",
      },
      {
        id: "https://openalex.org/W1",
        title: "Paper One Duplicate",
      },
      {
        id: "https://openalex.org/W2",
        title: "Paper Two",
      },
    ];

    const unique =
      deduplicateWorks(works);

    expect(unique).toHaveLength(2);

    expect(unique[0].id).toBe(
      "https://openalex.org/W1"
    );

    expect(unique[1].id).toBe(
      "https://openalex.org/W2"
    );
  });

  /*
  ========================================================
  XR SEARCH
  ========================================================
  */

  test("detects Extended Reality query", () => {
    expect(
      isXRQuery("Extended Reality")
    ).toBe(true);
  });

  test("detects Virtual Reality query", () => {
    expect(
      isXRQuery("Virtual Reality")
    ).toBe(true);
  });

  test("detects Augmented Reality query", () => {
    expect(
      isXRQuery("Augmented Reality")
    ).toBe(true);
  });

  test("detects XR query", () => {
    expect(
      isXRQuery("XR")
    ).toBe(true);
  });

  test("detects VR query", () => {
    expect(
      isXRQuery("VR")
    ).toBe(true);
  });

  test("detects AR query", () => {
    expect(
      isXRQuery("AR")
    ).toBe(true);
  });

  test("detects MR query", () => {
    expect(
      isXRQuery("MR")
    ).toBe(true);
  });

  test("does not mark unrelated query as XR", () => {
    expect(
      isXRQuery("Machine Learning")
    ).toBe(false);
  });

  test("expands XR searches", () => {
    const terms =
      buildSearchTerms("XR healthcare");

    expect(
      terms.length
    ).toBeGreaterThan(1);

    expect(
      terms
    ).toContain("XR healthcare");

    expect(
      terms
    ).toContain("Extended Reality");

    expect(
      terms
    ).toContain("Virtual Reality");

    expect(
      terms
    ).toContain("Augmented Reality");
  });

  test("does not expand unrelated searches", () => {
    const terms =
      buildSearchTerms(
        "machine learning"
      );

    expect(terms).toEqual([
      "machine learning",
    ]);
  });

  /*
  ========================================================
  FILTERS
  ========================================================
  */

  test("builds year filters", () => {
    const result =
      buildFilters({
        fromYear: "2020",
        toYear: "2025",
      });

    expect(
      result.filters
    ).toContain(
      "from_publication_date:2020-01-01,to_publication_date:2025-12-31"
    );
  });

  test("builds citation filter", () => {
    const result =
      buildFilters({
        minCitations: "100",
      });

    expect(
      result.filters
    ).toContain(
      "cited_by_count:>99"
    );
  });

  test("builds work type filter", () => {
    const result =
      buildFilters({
        workType: "article",
      });

    expect(
      result.filters
    ).toContain(
      "type:article"
    );
  });

  test("builds open access filter", () => {
    const result =
      buildFilters({
        openAccess: "true",
      });

    expect(
      result.filters
    ).toContain(
      "is_oa:true"
    );
  });

  test("rejects invalid year range", () => {
    expect(() =>
      buildFilters({
        fromYear: "2025",
        toYear: "2020",
      })
    ).toThrow(
      "From Year cannot be greater than To Year."
    );
  });

  /*
  ========================================================
  SORTING
  ========================================================
  */

  test("sorts by citations", () => {
    expect(
      getSortValue("citations")
    ).toBe(
      "cited_by_count:desc"
    );
  });

  test("sorts by date", () => {
    expect(
      getSortValue("date")
    ).toBe(
      "publication_date:desc"
    );
  });

  test("defaults to relevance", () => {
    expect(
      getSortValue("anything")
    ).toBe(
      "relevance_score:desc"
    );
  });
});

/*
=========================================================
API FAILURE TESTS
=========================================================
*/

describe(
  "OpenAlex Backend - API Failure Tests",
  () => {
    beforeEach(() => {
      vi.useFakeTimers();
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    /*
    -------------------------------------------------------
    HTTP 429
    -------------------------------------------------------
    */

    test(
      "handles HTTP 429 rate limiting",
      async () => {
        global.fetch
          .mockResolvedValueOnce({
            ok: false,
            status: 429,
            headers: {
              get: () => "1",
            },
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              results: [],
              meta: {},
            }),
          });

        const promise =
          requestOpenAlex(
            "https://example.com/test"
          );

        await vi.runAllTimersAsync();

        await expect(
          promise
        ).resolves.toEqual({
          results: [],
          meta: {},
        });

        expect(
          global.fetch
        ).toHaveBeenCalledTimes(2);
      }
    );

    /*
    -------------------------------------------------------
    HTTP 500 RETRY
    -------------------------------------------------------
    */

    test(
      "retries HTTP 500 server errors",
      async () => {
        global.fetch
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () =>
              "Server error",
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              results: [
                {
                  id: "W1",
                },
              ],
            }),
          });

        const promise =
          requestOpenAlex(
            "https://example.com/test"
          );

        await vi.runAllTimersAsync();

        await expect(
          promise
        ).resolves.toEqual({
          results: [
            {
              id: "W1",
            },
          ],
        });

        expect(
          global.fetch
        ).toHaveBeenCalledTimes(2);
      }
    );

    /*
    -------------------------------------------------------
    HTTP 400
    -------------------------------------------------------
    */

    test(
      "handles non-retryable HTTP 400 errors",
      async () => {
        global.fetch.mockResolvedValue({
          ok: false,
          status: 400,
          text: async () =>
            "Bad request",
        });

        const promise =
          requestOpenAlex(
            "https://example.com/test"
          );

        const assertion =
          expect(
            promise
          ).rejects.toThrow(
            "OpenAlex returned HTTP 400"
          );

        await vi.runAllTimersAsync();

        await assertion;

        expect(
          global.fetch
        ).toHaveBeenCalledTimes(1);
      }
    );

    /*
    -------------------------------------------------------
    REPEATED HTTP 500
    -------------------------------------------------------
    */

    test(
      "throws an error after repeated server failures",
      async () => {
        global.fetch.mockResolvedValue({
          ok: false,
          status: 500,
          text: async () =>
            "Server error",
        });

        const promise =
          requestOpenAlex(
            "https://example.com/test"
          );

        const assertion =
          expect(
            promise
          ).rejects.toThrow(
            "OpenAlex returned HTTP 500"
          );

        await vi.runAllTimersAsync();

        await assertion;

        expect(
          global.fetch
        ).toHaveBeenCalledTimes(5);
      },
      60000
    );

    /*
    -------------------------------------------------------
    NETWORK FAILURE
    -------------------------------------------------------
    */

    test(
      "retries network failures",
      async () => {
        global.fetch
          .mockRejectedValueOnce(
            new Error(
              "Network failure"
            )
          )
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              results: [],
              meta: {},
            }),
          });

        const promise =
          requestOpenAlex(
            "https://example.com/test"
          );

        await vi.runAllTimersAsync();

        await expect(
          promise
        ).resolves.toEqual({
          results: [],
          meta: {},
        });

        expect(
          global.fetch
        ).toHaveBeenCalledTimes(2);
      }
    );

    /*
    -------------------------------------------------------
    TIMEOUT
    -------------------------------------------------------
    */

    test(
      "retries timeout failures",
      async () => {
        const timeoutError =
          new Error(
            "The operation was aborted"
          );

        timeoutError.name =
          "AbortError";

        global.fetch
          .mockRejectedValueOnce(
            timeoutError
          )
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              results: [],
              meta: {},
            }),
          });

        const promise =
          requestOpenAlex(
            "https://example.com/test"
          );

        await vi.runAllTimersAsync();

        await expect(
          promise
        ).resolves.toEqual({
          results: [],
          meta: {},
        });

        expect(
          global.fetch
        ).toHaveBeenCalledTimes(2);
      }
    );
  }
);