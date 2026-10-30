import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";
import "./ResumeAnalysis.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function getApiError(error, fallback) {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return (
    data?.message ||
    data?.error ||
    error?.message ||
    fallback
  );
}

function normalizeRecommendations(data) {
  if (Array.isArray(data)) return data;

  if (!data || typeof data !== "object") return [];

  for (const key of [
    "recommendations",
    "jobs",
    "results",
    "content",
    "items",
    "data",
  ]) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  return [];
}

function formatFileSize(bytes) {
  const size = Number(bytes);

  if (!Number.isFinite(size) || size < 0) {
    return "Size unavailable";
  }

  if (size < 1024) return `${size} B`;

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getSkillName(skill) {
  if (typeof skill === "string") return skill;

  return (
    skill?.name ||
    skill?.skillName ||
    skill?.title ||
    ""
  );
}

function SkillList({ skills, emptyText }) {
  const names = asArray(skills)
    .map(getSkillName)
    .filter(Boolean);

  if (!names.length) {
    return (
      <span className="ra-no-skills">
        {emptyText}
      </span>
    );
  }

  return (
    <div className="ra-skill-list">
      {names.map((skill, index) => (
        <span
          className="ra-skill-tag"
          key={`${skill}-${index}`}
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

function AnalysisList({ title, items, emptyText }) {
  const list = asArray(items).filter(
    (item) => item !== null && item !== undefined && String(item).trim()
  );

  return (
    <article className="ra-analysis-card">
      <h4>{title}</h4>

      {list.length > 0 ? (
        <ul>
          {list.map((item, index) => (
            <li key={`${title}-${index}`}>
              {String(item)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ra-no-skills">
          {emptyText || "No items returned."}
        </p>
      )}
    </article>
  );
}

function ResumeAnalysis({ role }) {
  const normalizedRole = String(role || "").toUpperCase();

  const fileInputRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);

  // Resume storage state
  const [resume, setResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [resumeError, setResumeError] = useState("");
  const [resumeMessage, setResumeMessage] = useState("");

  // Personalized job recommendations
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] =
    useState(false);
  const [recommendationsError, setRecommendationsError] =
    useState("");

  // AI resume analysis
  const [targetRole, setTargetRole] = useState(
    "Java Backend Developer"
  );
  const [jobDescription, setJobDescription] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  // Load resume metadata from backend
  const loadResume = useCallback(async () => {
    setResumeLoading(true);
    setResumeError("");

    try {
      const response = await api.get(
        "/api/students/me/resume"
      );

      const data = response.data;

      setResume(
        data?.resume ??
        data?.data ??
        data ??
        null
      );
    } catch (error) {
      if (error?.response?.status === 404) {
        setResume(null);
      } else {
        setResumeError(
          getApiError(
            error,
            "Unable to load your resume details."
          )
        );
      }
    } finally {
      setResumeLoading(false);
    }
  }, []);

  // Load existing personalized job recommendations
  const loadRecommendations = useCallback(async () => {
    setRecommendationsLoading(true);
    setRecommendationsError("");

    try {
      const response = await api.get(
        "/api/students/me/recommendations"
      );

      setRecommendations(
        normalizeRecommendations(response.data)
      );
    } catch (error) {
      setRecommendations([]);
      setRecommendationsError(
        getApiError(
          error,
          "Unable to load personalized job recommendations."
        )
      );
    } finally {
      setRecommendationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (normalizedRole === "STUDENT" && isOpen) {
      loadResume();
      loadRecommendations();
    }
  }, [
    normalizedRole,
    isOpen,
    loadResume,
    loadRecommendations,
  ]);

  // Validate the selected resume
  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;

    setSelectedFile(null);
    setResumeError("");
    setResumeMessage("");
    setAnalysisError("");
    setAnalysisResult(null);

    if (!file) return;

    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
      setResumeError(
        "Please choose a PDF, DOC or DOCX file."
      );

      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setResumeError(
        "The resume must be 5 MB or smaller."
      );

      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  // Upload or update the stored resume
  async function handleUpload(event) {
    event.preventDefault();

    if (!selectedFile) {
      setResumeError(
        "Please select a resume file first."
      );
      return;
    }

    setUploading(true);
    setResumeError("");
    setResumeMessage("");

    try {
      const formData = new FormData();

      // The backend expects multipart field name "file".
      formData.append("file", selectedFile);

      await api.post(
        "/api/students/me/resume",
        formData
      );

      setResumeMessage(
        "Resume uploaded successfully."
      );

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadResume();
    } catch (error) {
      setResumeError(
        getApiError(
          error,
          "Unable to upload your resume."
        )
      );
    } finally {
      setUploading(false);
    }
  }

  // Download the stored resume
  async function handleDownload() {
    setDownloading(true);
    setResumeError("");
    setResumeMessage("");

    try {
      const response = await api.get(
        "/api/students/me/resume/download",
        {
          responseType: "blob",
        }
      );

      const blob = response.data;

      const downloadUrl =
        window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = downloadUrl;
      anchor.download =
        resume?.originalFileName || "resume";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);
    } catch (error) {
      setResumeError(
        getApiError(
          error,
          "Unable to download your resume."
        )
      );
    } finally {
      setDownloading(false);
    }
  }

  // Delete the stored resume
  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your uploaded resume?"
    );

    if (!confirmed) return;

    setDeleting(true);
    setResumeError("");
    setResumeMessage("");
    setAnalysisError("");
    setAnalysisResult(null);

    try {
      await api.delete(
        "/api/students/me/resume"
      );

      setResume(null);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setResumeMessage(
        "Resume deleted successfully."
      );
    } catch (error) {
      setResumeError(
        getApiError(
          error,
          "Unable to delete your resume."
        )
      );
    } finally {
      setDeleting(false);
    }
  }

  // Actual AI Resume Analysis endpoint
  async function handleAnalyzeResume(event) {
    event.preventDefault();

    setAnalysisError("");
    setResumeError("");
    setResumeMessage("");
    setAnalysisResult(null);

    const roleName = targetRole.trim();
    const description = jobDescription.trim();

    if (!roleName) {
      setAnalysisError(
        "Please enter your target job role."
      );
      return;
    }

    if (!description) {
      setAnalysisError(
        "Please enter the target job description."
      );
      return;
    }

    if (description.length > 15000) {
      setAnalysisError(
        "Job description cannot exceed 15000 characters."
      );
      return;
    }

    setAnalysisLoading(true);

    try {
      let fileToAnalyze = selectedFile;

      // If no new file is selected, download the saved resume
      // and send that file to the analysis endpoint.
      if (!fileToAnalyze) {
        if (!resume) {
          throw new Error(
            "Please select a resume or upload one first."
          );
        }

        const downloadResponse = await api.get(
          "/api/students/me/resume/download",
          {
            responseType: "blob",
          }
        );

        const filename =
          resume.originalFileName || "resume.pdf";

        const fileType =
          resume.contentType ||
          downloadResponse.data.type ||
          "application/octet-stream";

        fileToAnalyze = new File(
          [downloadResponse.data],
          filename,
          { type: fileType }
        );
      }

      if (fileToAnalyze.size > MAX_FILE_SIZE) {
        throw new Error(
          "The resume must be 5 MB or smaller."
        );
      }

      const formData = new FormData();
      formData.append("file", fileToAnalyze);

      // The backend controller expects targetRole and
      // jobDescription as query parameters.
      const response = await api.post(
        "/api/students/me/resume/analyze",
        formData,
        {
          params: {
            targetRole: roleName,
            jobDescription: description,
          },
        }
      );

      setAnalysisResult(response.data);

      setResumeMessage(
        "AI resume analysis completed successfully."
      );
    } catch (error) {
      setAnalysisError(
        getApiError(
          error,
          "Unable to analyze the resume. Please try again."
        )
      );
    } finally {
      setAnalysisLoading(false);
    }
  }

  if (normalizedRole !== "STUDENT") {
    return null;
  }

  return (
    <div className="ra-root">
      {!isOpen && (
        <button
          type="button"
          className="ra-launcher"
          onClick={() => setIsOpen(true)}
          aria-label="Open Resume Center"
        >
          <span
            className="ra-launcher-icon"
            aria-hidden="true"
          >
            ▤
          </span>

          <span className="ra-launcher-text">
            <strong>Resume Center</strong>
            <small>AI analysis & job matching</small>
          </span>

          <span
            className="ra-launcher-arrow"
            aria-hidden="true"
          >
            ↗
          </span>
        </button>
      )}

      {isOpen && (
        <div className="ra-overlay">
          <button
            type="button"
            className="ra-backdrop"
            aria-label="Close Resume Center"
            onClick={() => setIsOpen(false)}
          />

          <section
            className="ra-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ra-title"
          >
            <header className="ra-header">
              <div className="ra-brand">
                <span
                  className="ra-brand-icon"
                  aria-hidden="true"
                >
                  ▤
                </span>

                <div>
                  <span className="ra-eyebrow">
                    PLACEMENTPRO CAREER TOOLS
                  </span>

                  <h2 id="ra-title">
                    Resume Center
                  </h2>

                  <p>
                    Manage your resume and improve your job fit.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="ra-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close Resume Center"
              >
                ×
              </button>
            </header>

            <div className="ra-content">
              {resumeError && (
                <div
                  className="ra-alert"
                  role="alert"
                >
                  <strong>
                    Action could not be completed
                  </strong>

                  <p>{resumeError}</p>

                  <button
                    type="button"
                    onClick={() => setResumeError("")}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {resumeMessage && (
                <div
                  className="ra-success"
                  role="status"
                >
                  {resumeMessage}
                </div>
              )}

              <section className="ra-hero">
                <div>
                  <span className="ra-hero-pill">
                    CAREER PROFILE
                  </span>

                  <h3>
                    Turn your resume into an opportunity.
                  </h3>

                  <p>
                    Upload your resume, compare it against a
                    target job and get AI-generated insights
                    to improve your application.
                  </p>
                </div>

                <div
                  className="ra-hero-art"
                  aria-hidden="true"
                >
                  <div className="ra-art-paper">
                    <span />
                    <span />
                    <span />
                    <span />
                    <i>✓</i>
                  </div>

                  <div className="ra-art-star">✦</div>
                  <div className="ra-art-dot" />
                </div>
              </section>

              {/* Resume Upload / Download / Delete */}
              <section className="ra-section">
                <div className="ra-section-heading">
                  <div>
                    <h3>My resume</h3>

                    <p>
                      Manage the resume stored in your account.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="ra-secondary-button"
                    onClick={loadResume}
                    disabled={resumeLoading}
                  >
                    {resumeLoading
                      ? "Loading…"
                      : "↻ Refresh"}
                  </button>
                </div>

                {resumeLoading ? (
                  <div className="ra-loading">
                    <span className="ra-spinner" />
                    Loading your resume details…
                  </div>
                ) : resume ? (
                  <div className="ra-file-card">
                    <div className="ra-file-icon">
                      PDF
                    </div>

                    <div className="ra-file-info">
                      <strong>
                        {resume.originalFileName ||
                          "Uploaded resume"}
                      </strong>

                      <p>
                        {resume.contentType ||
                          "File type unavailable"}
                        {" · "}
                        {formatFileSize(resume.fileSize)}
                      </p>

                      <small>
                        Uploaded:{" "}
                        {formatDate(resume.uploadedAt)}
                      </small>

                      {resume.updatedAt && (
                        <small>
                          Updated:{" "}
                          {formatDate(resume.updatedAt)}
                        </small>
                      )}
                    </div>

                    <div className="ra-file-actions">
                      <button
                        type="button"
                        className="ra-primary-small"
                        onClick={handleDownload}
                        disabled={downloading}
                      >
                        {downloading
                          ? "Downloading…"
                          : "Download"}
                      </button>

                      <button
                        type="button"
                        className="ra-danger-small"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting
                          ? "Deleting…"
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ra-no-resume">
                    <span aria-hidden="true">▤</span>

                    <strong>
                      No resume uploaded yet
                    </strong>

                    <p>
                      Select your resume file below to add
                      it to your student profile.
                    </p>
                  </div>
                )}

                <form
                  className="ra-upload-form"
                  onSubmit={handleUpload}
                >
                  <label
                    className="ra-upload-zone"
                    htmlFor="ra-resume-file"
                  >
                    <span className="ra-upload-symbol">
                      ↑
                    </span>

                    <strong>
                      {selectedFile
                        ? selectedFile.name
                        : "Choose your resume"}
                    </strong>

                    <span>
                      PDF, DOC or DOCX · Maximum 5 MB
                    </span>

                    <input
                      ref={fileInputRef}
                      id="ra-resume-file"
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChange}
                    />
                  </label>

                  {selectedFile && (
                    <div className="ra-selected-file">
                      <span>
                        {formatFileSize(selectedFile.size)}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);

                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      >
                        Remove selection
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="ra-upload-button"
                    disabled={uploading || !selectedFile}
                  >
                    {uploading
                      ? "Uploading resume…"
                      : resume
                        ? "Upload new version"
                        : "Upload resume"}

                    <span>→</span>
                  </button>
                </form>
              </section>

              {/* Actual Gemini AI Resume Analysis */}
              <section className="ra-section ra-analysis-section">
                <div className="ra-section-heading">
                  <div>
                    <h3>AI Resume Analysis</h3>

                    <p>
                      Compare your resume with a real target job
                      description.
                    </p>
                  </div>

                  <span className="ra-analysis-badge">
                    GEMINI AI
                  </span>
                </div>

                <div className="ra-disclaimer">
                  <span aria-hidden="true">ⓘ</span>

                  The analysis sends the selected resume, target
                  role and job description to your backend AI
                  endpoint. The match score is an estimate, not
                  a hiring guarantee.
                </div>

                <form
                  className="ra-analysis-form"
                  onSubmit={handleAnalyzeResume}
                >
                  <div className="ra-analysis-field">
                    <label htmlFor="ra-analysis-role">
                      Target job role
                    </label>

                    <input
                      id="ra-analysis-role"
                      value={targetRole}
                      onChange={(event) =>
                        setTargetRole(event.target.value)
                      }
                      placeholder="Java Backend Developer"
                      maxLength={120}
                      required
                    />
                  </div>

                  <div className="ra-analysis-field">
                    <label htmlFor="ra-analysis-description">
                      Job description
                    </label>

                    <textarea
                      id="ra-analysis-description"
                      value={jobDescription}
                      onChange={(event) =>
                        setJobDescription(event.target.value)
                      }
                      placeholder="Paste the job responsibilities, required skills and qualifications..."
                      rows={5}
                      maxLength={15000}
                      required
                    />
                  </div>

                  <p className="ra-analysis-hint">
                    {selectedFile
                      ? `Selected file: ${selectedFile.name}`
                      : resume
                        ? `Using stored resume: ${resume.originalFileName}`
                        : "Choose a resume file or upload one before analysis."}
                  </p>

                  <button
                    type="submit"
                    className="ra-upload-button"
                    disabled={analysisLoading}
                  >
                    {analysisLoading
                      ? "Analyzing resume with AI…"
                      : "Analyze Resume with AI"}

                    <span>✦</span>
                  </button>
                </form>

                {analysisError && (
                  <div
                    className="ra-inline-error"
                    role="alert"
                  >
                    <strong>Analysis failed</strong>
                    <p>{analysisError}</p>

                    <button
                      type="button"
                      onClick={() => setAnalysisError("")}
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {analysisResult && (
                  <div className="ra-analysis-results">
                    <div className="ra-analysis-score-card">
                      <div>
                        <span>AI JOB MATCH SCORE</span>

                        <h3>
                          {analysisResult.matchScore ?? 0}
                          <small>/100</small>
                        </h3>

                        <p>
                          Estimated match based on the resume
                          content and target job description.
                        </p>
                      </div>

                      <div className="ra-analysis-score-circle">
                        {analysisResult.matchScore ?? 0}%
                      </div>
                    </div>

                    <div className="ra-analysis-summary">
                      <span className="ra-skills-label">
                        OVERALL ASSESSMENT
                      </span>

                      <p>
                        {analysisResult.overallSummary ||
                          "No overall assessment returned."}
                      </p>
                    </div>

                    <div className="ra-analysis-summary">
                      <span className="ra-skills-label">
                        ROLE FIT
                      </span>

                      <p>
                        {analysisResult.roleFitSummary ||
                          "No role-fit summary returned."}
                      </p>
                    </div>

                    {analysisResult.suggestedHeadline && (
                      <div className="ra-analysis-summary">
                        <span className="ra-skills-label">
                          SUGGESTED RESUME HEADLINE
                        </span>

                        <p>
                          {analysisResult.suggestedHeadline}
                        </p>
                      </div>
                    )}

                    <div className="ra-analysis-grid">
                      <AnalysisList
                        title="Strengths"
                        items={analysisResult.strengths}
                      />

                      <AnalysisList
                        title="Matched Skills"
                        items={analysisResult.matchedSkills}
                      />

                      <AnalysisList
                        title="Missing Skills"
                        items={analysisResult.missingSkills}
                      />

                      <AnalysisList
                        title="Improvement Suggestions"
                        items={analysisResult.improvementSuggestions}
                      />

                      <AnalysisList
                        title="Suggested Keywords"
                        items={analysisResult.suggestedKeywords}
                      />

                      <AnalysisList
                        title="ATS Tips"
                        items={analysisResult.atsTips}
                      />

                      <AnalysisList
                        title="Interview Questions"
                        items={analysisResult.interviewQuestions}
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* Existing personalized job recommendations */}
              <section className="ra-section ra-matches-section">
                <div className="ra-section-heading">
                  <div>
                    <h3>Recommended job matches</h3>

                    <p>
                      Job recommendations based on your
                      existing student profile and skills.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="ra-secondary-button"
                    onClick={loadRecommendations}
                    disabled={recommendationsLoading}
                  >
                    {recommendationsLoading
                      ? "Loading…"
                      : "↻ Refresh"}
                  </button>
                </div>

                <div className="ra-disclaimer">
                  <span aria-hidden="true">ⓘ</span>

                  These recommendations use your existing
                  profile recommendation API. They are separate
                  from the AI resume analysis above.
                </div>

                {recommendationsLoading ? (
                  <div className="ra-loading">
                    <span className="ra-spinner" />
                    Loading recommended jobs…
                  </div>
                ) : recommendationsError ? (
                  <div
                    className="ra-inline-error"
                    role="alert"
                  >
                    <strong>
                      Recommendations unavailable
                    </strong>

                    <p>{recommendationsError}</p>

                    <button
                      type="button"
                      onClick={loadRecommendations}
                    >
                      Try again
                    </button>
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="ra-no-resume">
                    <span aria-hidden="true">⌕</span>

                    <strong>
                      No job recommendations found
                    </strong>

                    <p>
                      Update your student profile and skills,
                      then refresh the recommendations.
                    </p>
                  </div>
                ) : (
                  <div className="ra-job-list">
                    {recommendations.map((job, index) => {
                      const jobId = job.jobId ?? job.id;

                      const rawScore =
                        job.skillMatchPercentage;

                      const hasMatchScore =
                        rawScore !== null &&
                        rawScore !== undefined &&
                        rawScore !== "" &&
                        Number.isFinite(Number(rawScore));

                      const matchScore = hasMatchScore
                        ? Math.max(
                            0,
                            Math.min(100, Number(rawScore))
                          )
                        : null;

                      return (
                        <article
                          className="ra-job-card"
                          key={jobId ?? index}
                        >
                          <div className="ra-job-top">
                            <div
                              className="ra-company-logo"
                              aria-hidden="true"
                            >
                              {String(job.companyName || "C")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="ra-job-title">
                              <h4>
                                {job.jobTitle ||
                                  job.title ||
                                  "Recommended job"}
                              </h4>

                              <p>
                                {job.companyName || "Company"}
                                {" · "}
                                {job.location ||
                                  "Location not specified"}
                              </p>
                            </div>

                            {typeof job.eligible === "boolean" && (
                              <span
                                className={`ra-eligibility ${
                                  job.eligible
                                    ? "ra-eligible"
                                    : "ra-review"
                                }`}
                              >
                                {job.eligible
                                  ? "Eligible"
                                  : "Review profile"}
                              </span>
                            )}
                          </div>

                          {matchScore !== null && (
                            <div className="ra-match-meter">
                              <div className="ra-match-meta">
                                <span>
                                  Profile skill match
                                </span>

                                <strong>
                                  {matchScore}%
                                </strong>
                              </div>

                              <div
                                className="ra-match-track"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={matchScore}
                                aria-label={`Profile skill match ${matchScore}%`}
                              >
                                <div
                                  className="ra-match-fill"
                                  style={{
                                    width: `${matchScore}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="ra-skills-block">
                            <span className="ra-skills-label">
                              Matched skills
                            </span>

                            <SkillList
                              skills={job.matchedSkills}
                              emptyText="No matched skills listed"
                            />
                          </div>

                          {asArray(job.missingSkills).length > 0 && (
                            <div className="ra-skills-block">
                              <span className="ra-skills-label">
                                Skills to improve
                              </span>

                              <SkillList
                                skills={job.missingSkills}
                                emptyText="None listed"
                              />
                            </div>
                          )}

                          <div className="ra-job-footer">
                            <span>
                              {job.jobType ||
                                "Job type not specified"}
                            </span>

                            {job.minimumCgpa != null && (
                              <span>
                                Minimum CGPA: {job.minimumCgpa}
                              </span>
                            )}

                            {job.graduationYear != null && (
                              <span>
                                Graduation: {job.graduationYear}
                              </span>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <footer className="ra-footer">
              <span>
                PlacementPro <span>•</span> Resume Center
              </span>

              <span>
                Resume storage · Gemini analysis · Job recommendations
              </span>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default ResumeAnalysis;