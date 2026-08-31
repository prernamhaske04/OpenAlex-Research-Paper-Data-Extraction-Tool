
function getPaperUrl(work) {
  const locations = [
    work?.best_oa_location,
    work?.primary_location,
    ...(work?.locations || []),
  ].filter(Boolean);

  for (const location of locations) {
    if (location?.landing_page_url) {
      return location.landing_page_url;
    }

    if (location?.pdf_url) {
      return location.pdf_url;
    }
  }

  if (work?.doi) {
    return work.doi.startsWith("http")
      ? work.doi
      : `https://doi.org/${work.doi.replace("https://doi.org/", "")}`;
  }

  if (work?.id) {
    return work.id;
  }

  return "#";
}

function getPdfUrl(work) {
  const locations = [
    work?.best_oa_location,
    work?.primary_location,
    ...(work?.locations || []),
  ].filter(Boolean);

  for (const location of locations) {
    if (location?.pdf_url) {
      return location.pdf_url;
    }
  }

  return null;
}

function getDoiUrl(work) {
  if (!work?.doi) {
    return null;
  }

  return work.doi.startsWith("http")
    ? work.doi
    : `https://doi.org/${work.doi.replace("https://doi.org/", "")}`;
}

function getAuthors(work) {
  if (!work?.authorships?.length) {
    return "Authors not available";
  }

  const authors = work.authorships
    .map((item) => item?.author?.display_name)
    .filter(Boolean);

  return authors.length > 0
    ? authors.join(", ")
    : "Authors not available";
}

function getSource(work) {
  return (
    work?.primary_location?.source ||
    work?.best_oa_location?.source ||
    work?.locations?.find((location) => location?.source)?.source ||
    null
  );
}

function getPublicationDate(work) {
  if (work?.publication_date) {
    return work.publication_date;
  }

  if (work?.publication_year) {
    return String(work.publication_year);
  }

  return "Date unavailable";
}

function getType(work) {
  if (!work?.type) {
    return "Research work";
  }

  return work.type.charAt(0).toUpperCase() + work.type.slice(1);
}

function cleanAbstract(work) {
  if (!work?.abstract_inverted_index) {
    return "Abstract not available for this paper.";
  }

  const words = [];

  Object.entries(work.abstract_inverted_index).forEach(
    ([word, positions]) => {
      positions.forEach((position) => {
        words[position] = word;
      });
    }
  );

  const abstract = words.filter(Boolean).join(" ");

  return abstract || "Abstract not available for this paper.";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function PaperDetails({ work, onBack }) {
  if (!work) {
    return (
      <div className="details-page">
        <div className="details-empty">
          <h2>Paper not found</h2>
          <p>
            The selected research paper could not be loaded.
          </p>

          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >
            ← Back to Results
          </button>
        </div>
      </div>
    );
  }

  const source = getSource(work);
  const paperUrl = getPaperUrl(work);
  const pdfUrl = getPdfUrl(work);
  const doiUrl = getDoiUrl(work);
  const authors = getAuthors(work);
  const abstract = cleanAbstract(work);

  return (
    <div className="details-page">
      <div className="details-container">

        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          ← Back to Results
        </button>

        <article className="details-card">

          <div className="details-top">

            <div className="details-type">
              {getType(work)}
            </div>

            <h1>
              {work.display_name || "Untitled research work"}
            </h1>

            <p className="details-authors">
              {authors}
            </p>

            <div className="details-badges">

              <span className="details-badge">
                📅 {getPublicationDate(work)}
              </span>

              <span className="details-badge">
                📊 {formatNumber(work.cited_by_count)} citations
              </span>

              {source && (
                <span className="details-badge">
                  📚 {source.display_name}
                </span>
              )}

            </div>
          </div>

          <section className="abstract-section">

            <h2>Abstract</h2>

            <p className="details-abstract">
              {abstract}
            </p>

          </section>

          <section className="information-section">

            <h2>Paper Information</h2>

            <div className="information-grid">

              <div className="information-item">
                <span>Publication Date</span>
                <strong>{getPublicationDate(work)}</strong>
              </div>

              <div className="information-item">
                <span>Publication Year</span>
                <strong>
                  {work.publication_year || "Unavailable"}
                </strong>
              </div>

              <div className="information-item">
                <span>Citations</span>
                <strong>
                  {formatNumber(work.cited_by_count)}
                </strong>
              </div>

              <div className="information-item">
                <span>Type</span>
                <strong>{getType(work)}</strong>
              </div>

              <div className="information-item">
                <span>Journal / Source</span>
                <strong>
                  {source?.display_name || "Unavailable"}
                </strong>
              </div>

              <div className="information-item">
                <span>OpenAlex ID</span>
                <strong>
                  {work.id
                    ? work.id.split("/").pop()
                    : "Unavailable"}
                </strong>
              </div>

            </div>

          </section>

          <section className="links-section">

            <h2>Paper Links</h2>

            <div className="paper-links">

              {paperUrl !== "#" && (
                <a
                  href={paperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="paper-link primary-link"
                >
                  🔗 Open Paper
                </a>
              )}

              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="paper-link pdf-link"
                >
                  📄 Open PDF
                </a>
              )}

              {doiUrl && (
                <a
                  href={doiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="paper-link doi-link"
                >
                  🔗 DOI
                </a>
              )}

              {work.id && (
                <a
                  href={work.id}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="paper-link openalex-link"
                >
                  🧬 OpenAlex
                </a>
              )}

            </div>

          </section>

          <div className="details-footer">

            <span>
              Research data provided by OpenAlex
            </span>

            <button
              type="button"
              onClick={onBack}
              className="footer-back-button"
            >
              ← Back to Results
            </button>

          </div>

        </article>
      </div>
    </div>
  );
}

export default PaperDetails;
