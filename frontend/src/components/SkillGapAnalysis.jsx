import { useState } from "react";
import api from "../api";
import "./SkillGapAnalysis.css";

function getErrorMessage(error) {
  const data = error?.response?.data;
  return (
    data?.message ||
    data?.error ||
    (typeof data === "string" ? data : "") ||
    error?.message ||
    "Skill gap analysis failed. Please try again."
  );
}

function unwrapResult(data) {
  return (
    data?.data ??
    data?.result ??
    data?.careerRecommendation ??
    data?.recommendation ??
    data
  );
}

function AnalysisCard({ icon, title, value, emptyText }) {
  return (
    <article className="sga-result-card">
      <h3><span aria-hidden="true">{icon}</span> {title}</h3>
      <p>{value || emptyText || "No information returned."}</p>
    </article>
  );
}

export default function SkillGapAnalysis({ onGenerated }) {
  const [targetRole, setTargetRole] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze(event) {
    event.preventDefault();

    const cleanTargetRole = targetRole.trim();
    if (!cleanTargetRole) {
      setError("Please enter your target job role.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        "/api/students/me/skill-gap-analysis",
        { targetRole: cleanTargetRole }
      );

      const result = unwrapResult(response.data);
      setAnalysis(result);

      if (typeof onGenerated === "function") {
        onGenerated();
      }
    } catch (err) {
      setAnalysis(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dashboard-section sga-section">
      <div className="sga-heading">
        <div>
          <span className="sga-eyebrow">GEMINI AI • PERSONALIZED LEARNING</span>
          <h2>AI Skill Gap Analysis</h2>
          <p>
            Compare your current profile and skills with your target role.
            Get missing-skill guidance and a focused learning roadmap.
          </p>
        </div>
        <span className="sga-ai-mark" aria-label="AI powered">✦ AI</span>
      </div>

      <form className="sga-form" onSubmit={handleAnalyze}>
        <label htmlFor="sga-target-role">Your target job role</label>
        <div className="sga-form-row">
          <input
            id="sga-target-role"
            type="text"
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            placeholder="e.g. Java Backend Developer"
            maxLength={120}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Analyzing…" : "Analyze my skill gaps"}
          </button>
        </div>
        <small>
          The analysis uses your saved profile, skills and available AI interview
          performance data.
        </small>
      </form>

      {loading && (
        <div className="sga-state" role="status">
          Gemini AI is reviewing your skills and preparing recommendations…
        </div>
      )}

      {error && (
        <div className="sga-error" role="alert">{error}</div>
      )}

      {!analysis && !loading && !error && (
        <div className="sga-empty">
          <span aria-hidden="true">🎯</span>
          <div>
            <strong>Ready to identify your skill gaps?</strong>
            <p>Enter a target role and generate a personalized learning plan.</p>
          </div>
        </div>
      )}

      {analysis && !loading && (
        <div className="sga-results">
          <div className="sga-result-summary">
            <div>
              <span>TARGET ROLE</span>
              <h3>{analysis.targetRole || targetRole}</h3>
            </div>
            {analysis.generatedAt && (
              <small>
                Generated {new Date(analysis.generatedAt).toLocaleString()}
              </small>
            )}
          </div>

          <div className="sga-result-grid">
            <AnalysisCard
              icon="📚"
              title="Missing Skills / Skill Gaps"
              value={analysis.skillGaps}
              emptyText="No specific gaps were returned."
            />
            <AnalysisCard
              icon="💪"
              title="Your Strengths"
              value={analysis.strengths}
            />
            <AnalysisCard
              icon="🛠"
              title="Recommended Technologies"
              value={analysis.recommendedTechnologies}
            />
            <AnalysisCard
              icon="🗺"
              title="Learning Roadmap"
              value={analysis.learningRoadmap}
            />
            <AnalysisCard
              icon="🚀"
              title="Placement Advice"
              value={analysis.placementAdvice}
            />
            <AnalysisCard
              icon="🎯"
              title="Recommended Career Roles"
              value={analysis.recommendedRoles}
            />
          </div>

          {analysis.overallAssessment && (
            <div className="sga-assessment">
              <strong>AI Assessment</strong>
              <p>{analysis.overallAssessment}</p>
            </div>
          )}

          <p className="sga-disclaimer">
            AI suggestions are guidance, not a hiring or eligibility decision.
            Update your skills in My Profile and run the analysis again to
            refresh your recommendations.
          </p>
        </div>
      )}
    </section>
  );
}
