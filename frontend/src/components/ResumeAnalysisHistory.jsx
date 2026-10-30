import { useCallback, useEffect, useState } from "react";
import api from "../api";
import "./ResumeAnalysisHistory.css";

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function ResultSection({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <section className="rah-result-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function ResumeAnalysisHistory({ role }) {
  const isStudent = String(role || "").toUpperCase() === "STUDENT";

  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        "/api/students/me/resume/analysis-history"
      );

      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load resume analysis history."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStudent) loadHistory();
  }, [isStudent, loadHistory]);

  const openAnalysis = async (id) => {
    setDetailLoading(true);
    setError("");
    setSelected(null);

    try {
      const response = await api.get(
        `/api/students/me/resume/analysis-history/${id}`
      );

      setSelected(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load this analysis."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  if (!isStudent) return null;

  const analysis = selected?.analysis;

  return (
    <section className="rah-container">
      <div className="rah-heading">
        <div>
          <p className="rah-eyebrow">AI CAREER TOOLS</p>
          <h2>Resume Analysis History</h2>
          <p className="rah-subtitle">
            Revisit your previous resume scores and suggestions.
          </p>
        </div>

        <button
          type="button"
          className="rah-refresh"
          onClick={loadHistory}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p className="rah-error">{error}</p>}

      {loading && <p className="rah-muted">Loading your history...</p>}

      {!loading && history.length === 0 && !error && (
        <div className="rah-empty">
          <h3>No saved analyses yet</h3>
          <p>
            Analyze a resume in Resume Center. Completed analyses
            will appear here.
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="rah-list">
          {history.map((item) => (
            <article className="rah-card" key={item.id}>
              <div className="rah-card-main">
                <div>
                  <h3>{item.targetRole}</h3>
                  <p className="rah-date">
                    {formatDate(item.createdAt)}
                  </p>
                </div>

                <div className="rah-score">
                  <strong>
                    {item.matchScore ?? "—"}
                    {item.matchScore != null ? "%" : ""}
                  </strong>
                  <span>Match score</span>
                </div>
              </div>

              <p className="rah-summary">
                {item.overallSummary || "No summary available."}
              </p>

              <button
                type="button"
                className="rah-view"
                onClick={() => openAnalysis(item.id)}
                disabled={detailLoading}
              >
                View full analysis
              </button>
            </article>
          ))}
        </div>
      )}

      {detailLoading && (
        <p className="rah-muted">Loading saved analysis...</p>
      )}

      {selected && analysis && (
        <div className="rah-detail">
          <div className="rah-detail-heading">
            <div>
              <p className="rah-eyebrow">SAVED RESULT</p>
              <h3>{selected.targetRole}</h3>
              <p className="rah-date">
                {formatDate(selected.createdAt)}
              </p>
            </div>

            <button
              type="button"
              className="rah-close"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>

          <h4>Overall assessment</h4>
          <p>{selected.overallSummary}</p>

          <h4>Role fit</h4>
          <p>{selected.roleFitSummary || "No role-fit summary saved."}</p>

          <h4>Suggested headline</h4>
          <p>{selected.suggestedHeadline || "No headline available."}</p>

          <ResultSection title="Strengths" items={analysis.strengths} />
          <ResultSection title="Matched skills" items={analysis.matchedSkills} />
          <ResultSection title="Missing skills" items={analysis.missingSkills} />
          <ResultSection
            title="Improvement suggestions"
            items={analysis.improvementSuggestions}
          />
          <ResultSection
            title="Suggested keywords"
            items={analysis.suggestedKeywords}
          />
          <ResultSection title="ATS tips" items={analysis.atsTips} />
          <ResultSection
            title="Interview questions"
            items={analysis.interviewQuestions}
          />
        </div>
      )}
    </section>
  );
}