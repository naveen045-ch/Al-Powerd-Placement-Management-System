import { useCallback, useEffect, useState } from "react";
import api from "../api";
import "./Dashboard.css";
import RecruiterDashboard from "./RecruiterDashboard";
import PlacementOfficerDashboard from "./PlacementOfficerDashboard";
import AdminDashboard from "./AdminDashboard";

const ROLE_CONFIG = {
  STUDENT: {
    title: "Student Dashboard",
    subtitle: "Track your placement journey and discover opportunities.",
  },
  RECRUITER: {
    title: "Recruiter Dashboard",
    subtitle: "Manage recruitment and discover talented candidates.",
  },
  PLACEMENT_OFFICER: {
    title: "Placement Officer Dashboard",
    subtitle: "Monitor placement activities and student progress.",
  },
  ADMIN: {
    title: "Admin Dashboard",
    subtitle: "Manage and monitor the placement management system.",
  },
};

function extractList(data, preferredKeys = []) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  for (const key of preferredKeys) {
    if (Array.isArray(data[key])) return data[key];
  }

  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;

  return [];
}

function getStatus(item) {
  return String(
    item?.status || item?.applicationStatus || item?.state || "APPLIED"
  )
    .replaceAll("_", " ")
    .toUpperCase();
}

function getJobTitle(application) {
  return (
    application?.job?.title ||
    application?.job?.jobTitle ||
    application?.jobTitle ||
    application?.job?.name ||
    "Job application"
  );
}

function getCompanyName(job) {
  if (typeof job?.company === "string") return job.company;

  return (
    job?.company?.name ||
    job?.companyName ||
    job?.company?.companyName ||
    "Company"
  );
}

function getApiError(error, fallback) {
  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.error ||
    error?.message ||
    fallback
  );
}

function displayText(value, fallback = "Not available") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : fallback;
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

// Handle one recommendation object or an array of saved recommendations.
function getLatestRecommendation(responseData) {
  const unwrapped =
    responseData?.data ??
    responseData?.result ??
    responseData?.careerRecommendation ??
    responseData?.recommendation ??
    responseData;

  const list = Array.isArray(unwrapped)
    ? unwrapped
    : Array.isArray(unwrapped?.content)
      ? unwrapped.content
      : null;

  if (!list) {
    return unwrapped && typeof unwrapped === "object"
      ? unwrapped
      : null;
  }

  const candidates = list.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      !Array.isArray(item)
  );

  if (!candidates.length) return null;

  const recommendationKeys = [
    "targetRole",
    "recommendedRoles",
    "strengths",
    "skillGaps",
    "recommendedTechnologies",
    "learningRoadmap",
    "placementAdvice",
    "overallAssessment",
  ];

  const usable = candidates.filter((item) =>
    recommendationKeys.some(
      (key) => item[key] !== undefined && item[key] !== null
    )
  );

  const records = usable.length ? usable : candidates;

  // Prefer the newest recommendation when a timestamp exists.
  return [...records].sort((a, b) => {
    const dateA = Date.parse(a.generatedAt || a.createdAt || "") || 0;
    const dateB = Date.parse(b.generatedAt || b.createdAt || "") || 0;
    return dateB - dateA;
  })[0];
}

function Dashboard({ role, onLogout }) {
  const normalizedRole = String(role || "").toUpperCase();

  const config = ROLE_CONFIG[normalizedRole] || {
    title: "Dashboard",
    subtitle: "Welcome to PlacementPro.",
  };

  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobSearch, setJobSearch] = useState("");

  const [eligibilityResults, setEligibilityResults] = useState({});
  const [eligibilityErrors, setEligibilityErrors] = useState({});
  const [checkingJobId, setCheckingJobId] = useState(null);

  const [jobActionMessages, setJobActionMessages] = useState({});
  const [jobActionErrors, setJobActionErrors] = useState({});
  const [applyingJobId, setApplyingJobId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [jobError, setJobError] = useState("");
  const [applicationError, setApplicationError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const [careerRecommendation, setCareerRecommendation] = useState(null);
  const [careerRecommendationLoading, setCareerRecommendationLoading] =
    useState(false);
  const [careerRecommendationError, setCareerRecommendationError] =
    useState("");

  // Personalized job recommendations.
  const [jobRecommendations, setJobRecommendations] = useState([]);
  const [jobRecommendationsLoading, setJobRecommendationsLoading] =
    useState(false);
  const [jobRecommendationsError, setJobRecommendationsError] =
    useState("");

  // Load jobs and the current student's applications.
  const loadDashboard = useCallback(async () => {
    // Placement Officer and Admin use separate dashboards and APIs.
    if (
      normalizedRole === "PLACEMENT_OFFICER" ||
      normalizedRole === "ADMIN"
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setJobError("");
    setApplicationError("");

    const jobsRequest = api.get("/api/jobs");

    const applicationsRequest =
      normalizedRole === "STUDENT"
        ? api.get("/api/applications/me")
        : Promise.resolve(null);

    const [jobsResult, applicationsResult] = await Promise.allSettled([
      jobsRequest,
      applicationsRequest,
    ]);

    if (jobsResult.status === "fulfilled") {
      setJobs(
        extractList(jobsResult.value.data, ["jobs", "results"])
      );
    } else {
      setJobs([]);
      setJobError(
        getApiError(
          jobsResult.reason,
          "Could not load jobs. Please try again."
        )
      );
    }

    if (normalizedRole === "STUDENT") {
      if (applicationsResult.status === "fulfilled") {
        setApplications(
          extractList(applicationsResult.value.data, [
            "applications",
            "results",
          ])
        );
      } else {
        setApplications([]);
        setApplicationError(
          getApiError(
            applicationsResult.reason,
            "Could not load your applications."
          )
        );
      }
    } else {
      setApplications([]);
    }

    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, [normalizedRole]);

  // Load AI Career Recommendations.
  const loadCareerRecommendation = useCallback(async () => {
    if (normalizedRole !== "STUDENT") return;

    setCareerRecommendationLoading(true);
    setCareerRecommendationError("");

    try {
      const response = await api.get(
        "/api/students/me/career-recommendations"
      );

      const recommendation = getLatestRecommendation(response.data);

      setCareerRecommendation(recommendation);

      if (!recommendation) {
        setCareerRecommendationError(
          "The API returned no usable career recommendation records."
        );
      }
    } catch (error) {
      setCareerRecommendation(null);

      setCareerRecommendationError(
        getApiError(
          error,
          "Unable to load AI career recommendations."
        )
      );
    } finally {
      setCareerRecommendationLoading(false);
    }
  }, [normalizedRole]);

  // Fetch personalized job recommendations from the backend.
  const loadJobRecommendations = useCallback(async () => {
    if (normalizedRole !== "STUDENT") {
      return;
    }

    setJobRecommendationsLoading(true);
    setJobRecommendationsError("");

    try {
      const response = await api.get(
        "/api/students/me/recommendations"
      );

      const recommendations = extractList(response.data, [
        "recommendations",
        "jobs",
        "results",
      ]);

      setJobRecommendations(recommendations);
    } catch (error) {
      setJobRecommendations([]);
      setJobRecommendationsError(
        getApiError(
          error,
          "Unable to load personalized job recommendations."
        )
      );
    } finally {
      setJobRecommendationsLoading(false);
    }
  }, [normalizedRole]);

  // Load personalized recommendations when the student dashboard opens.
  useEffect(() => {
    if (normalizedRole === "STUDENT") {
      loadJobRecommendations();
    }
  }, [normalizedRole, loadJobRecommendations]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (normalizedRole === "STUDENT") {
      loadCareerRecommendation();
    }
  }, [normalizedRole, loadCareerRecommendation]);

  // Check eligibility for a job.
  async function handleCheckEligibility(jobId) {
    if (jobId == null) return;

    setCheckingJobId(jobId);

    setEligibilityResults((previous) => ({
      ...previous,
      [jobId]: undefined,
    }));

    setEligibilityErrors((previous) => ({
      ...previous,
      [jobId]: "",
    }));

    try {
      const response = await api.get(
        `/api/jobs/${jobId}/eligibility`
      );

      setEligibilityResults((previous) => ({
        ...previous,
        [jobId]:
          response.data ??
          "Eligibility check completed successfully.",
      }));
    } catch (error) {
      setEligibilityErrors((previous) => ({
        ...previous,
        [jobId]: getApiError(
          error,
          "Unable to check eligibility."
        ),
      }));
    } finally {
      setCheckingJobId(null);
    }
  }

  // Apply for a job.
  async function handleApplyJob(jobId) {
    if (jobId == null) return;

    setApplyingJobId(jobId);

    setJobActionMessages((previous) => ({
      ...previous,
      [jobId]: "",
    }));

    setJobActionErrors((previous) => ({
      ...previous,
      [jobId]: "",
    }));

    try {
      const response = await api.post(
        `/api/jobs/${jobId}/apply`
      );

      const responseData = response.data;

      setJobActionMessages((previous) => ({
        ...previous,
        [jobId]:
          responseData?.message ||
          (typeof responseData === "string" && responseData) ||
          "Application submitted successfully.",
      }));

      setEligibilityResults((previous) => ({
        ...previous,
        [jobId]: {
          ...(previous[jobId] &&
          typeof previous[jobId] === "object"
            ? previous[jobId]
            : {}),
          jobId,
          eligible: false,
          alreadyApplied: true,
          eligibilityReasons: [
            "You have already applied for this job",
          ],
        },
      }));

      await loadDashboard();
    } catch (error) {
      setJobActionErrors((previous) => ({
        ...previous,
        [jobId]: getApiError(
          error,
          "Unable to submit your application."
        ),
      }));
    } finally {
      setApplyingJobId(null);
    }
  }

  const shortlistedCount = applications.filter((application) =>
    getStatus(application).includes("SHORTLISTED")
  ).length;

  const interviewCount = applications.filter((application) =>
    getStatus(application).includes("INTERVIEW")
  ).length;

  const selectedCount = applications.filter((application) =>
    getStatus(application).includes("SELECTED")
  ).length;

  // Search jobs by title, company, location, description, or type.
  const filteredJobs = jobs.filter((job) => {
    const search = jobSearch.trim().toLowerCase();

    if (!search) return true;

    return [
      job.title,
      job.jobTitle,
      job.name,
      getCompanyName(job),
      job.location,
      job.description,
      job.jobType,
    ].some((value) =>
      String(value || "").toLowerCase().includes(search)
    );
  });

  // Role-based dashboard routing.
  if (normalizedRole === "RECRUITER") {
    return <RecruiterDashboard onLogout={onLogout} />;
  }

  if (normalizedRole === "PLACEMENT_OFFICER") {
    return <PlacementOfficerDashboard onLogout={onLogout} />;
  }

  if (normalizedRole === "ADMIN") {
    return <AdminDashboard onLogout={onLogout} />;
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">P</div>

          <div>
            <h2>PlacementPro</h2>
            <p>CAREER MANAGEMENT SYSTEM</p>
          </div>
        </div>

        <div className="dashboard-header-actions">
          <span className="role-label">
            {normalizedRole.replaceAll("_", " ")}
          </span>

          <button
            type="button"
            className="dashboard-logout"
            onClick={onLogout}
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-welcome">
          <div>
            <span className="dashboard-eyebrow">
              YOUR CAREER. YOUR FUTURE.
            </span>

            <h1>{config.title}</h1>
            <p>{config.subtitle}</p>
          </div>

          <button
            type="button"
            className="dashboard-refresh"
            onClick={loadDashboard}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh data"}
          </button>
        </div>

        {loading && (
          <p className="dashboard-info">
            Loading data from the backend...
          </p>
        )}

        {!loading && jobError && (
          <div className="dashboard-error" role="alert">
            <strong>Jobs could not be loaded.</strong>
            <p>{jobError}</p>
          </div>
        )}

        {!loading && applicationError && (
          <div className="dashboard-error" role="alert">
            <strong>Applications could not be loaded.</strong>
            <p>{applicationError}</p>
          </div>
        )}

        {/* Dashboard statistics */}
        <section className="dashboard-stats">
          <article className="dashboard-stat-card">
            <span className="stat-icon">💼</span>
            <p>Available Jobs</p>
            <h2>{loading ? "—" : jobs.length}</h2>
            <span className="stat-description">
              Jobs returned by the API
            </span>
          </article>

          {normalizedRole === "STUDENT" && (
            <>
              <article className="dashboard-stat-card">
                <span className="stat-icon">📄</span>
                <p>My Applications</p>
                <h2>{loading ? "—" : applications.length}</h2>
                <span className="stat-description">
                  Your submitted applications
                </span>
              </article>

              <article className="dashboard-stat-card">
                <span className="stat-icon">⭐</span>
                <p>Shortlisted</p>
                <h2>{loading ? "—" : shortlistedCount}</h2>
                <span className="stat-description">
                  Applications marked shortlisted
                </span>
              </article>

              <article className="dashboard-stat-card">
                <span className="stat-icon">🎯</span>
                <p>Selected</p>
                <h2>{loading ? "—" : selectedCount}</h2>
                <span className="stat-description">
                  Applications marked selected
                </span>
              </article>
            </>
          )}
        </section>

        {/* Available jobs for students */}
        {normalizedRole === "STUDENT" && (
          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <h2>Available Jobs</h2>
                <p>
                  Explore job opportunities available through PlacementPro.
                </p>

                <input
                  type="search"
                  className="job-search-input"
                  value={jobSearch}
                  onChange={(event) => setJobSearch(event.target.value)}
                  placeholder="Search jobs, companies, location..."
                  aria-label="Search available jobs"
                />
              </div>

              <span className="dashboard-updated">
                {filteredJobs.length} jobs found
              </span>
            </div>

            {loading && (
              <p className="dashboard-info">
                Loading available jobs...
              </p>
            )}

            {!loading && !jobError && filteredJobs.length === 0 && (
              <div className="dashboard-empty">
                <span>💼</span>
                <h3>
                  {jobSearch.trim()
                    ? "No matching jobs"
                    : "No jobs available"}
                </h3>

                <p>
                  {jobSearch.trim()
                    ? "Try another job title, company, or location."
                    : "New job opportunities will appear here when available."}
                </p>
              </div>
            )}

            {!jobError && filteredJobs.length > 0 && (
              <div className="dashboard-job-list">
                {filteredJobs.slice(0, 6).map((job, index) => {
                  const jobId = job.id ?? job.jobId;
                  const eligibility = eligibilityResults[jobId];

                  const eligibilityChecked =
                    eligibility !== undefined &&
                    eligibility !== null &&
                    typeof eligibility === "object";

                  const alreadyApplied =
                    eligibility?.alreadyApplied === true;

                  const isEligible = eligibility?.eligible === true;

                  return (
                    <article
                      className="dashboard-job-card"
                      key={jobId ?? index}
                    >
                      <div className="job-card-details">
                        <h3>
                          {job.title ||
                            job.jobTitle ||
                            job.name ||
                            "Untitled job"}
                        </h3>

                        <p>
                          {getCompanyName(job)}
                          {job.location ? ` · ${job.location}` : ""}
                        </p>

                        {job.jobType && (
                          <p>Job type: {job.jobType}</p>
                        )}

                        {job.description && (
                          <p className="job-description">
                            {job.description}
                          </p>
                        )}

                        <div className="job-card-actions">
                          <button
                            type="button"
                            className="job-action-button eligibility-button"
                            disabled={
                              jobId == null ||
                              checkingJobId === jobId
                            }
                            onClick={() =>
                              handleCheckEligibility(jobId)
                            }
                          >
                            {checkingJobId === jobId
                              ? "Checking..."
                              : "Check Eligibility"}
                          </button>

                          <button
                            type="button"
                            className="job-action-button apply-button"
                            disabled={
                              jobId == null ||
                              applyingJobId === jobId ||
                              !eligibilityChecked ||
                              !isEligible ||
                              alreadyApplied
                            }
                            onClick={() => handleApplyJob(jobId)}
                          >
                            {applyingJobId === jobId
                              ? "Applying..."
                              : alreadyApplied
                                ? "Already Applied"
                                : !eligibilityChecked
                                  ? "Check Eligibility First"
                                  : !isEligible
                                    ? "Not Eligible"
                                    : "Apply Now"}
                          </button>
                        </div>

                        {eligibilityErrors[jobId] && (
                          <p className="job-action-error" role="alert">
                            {eligibilityErrors[jobId]}
                          </p>
                        )}

                        {eligibilityResults[jobId] !== undefined && (
                          <div
                            className="job-eligibility-result"
                            role="status"
                          >
                            {typeof eligibility === "object" &&
                            eligibility !== null ? (
                              <>
                                <strong>
                                  {eligibility.alreadyApplied
                                    ? "✓ Application Already Submitted"
                                    : eligibility.eligible
                                      ? "✓ You Are Eligible"
                                      : "Eligibility Requirements"}
                                </strong>

                                {eligibility.jobTitle && (
                                  <p>
                                    <strong>Job:</strong>{" "}
                                    {eligibility.jobTitle}
                                  </p>
                                )}

                                {typeof eligibility.studentCgpa ===
                                  "number" && (
                                  <p>
                                    <strong>Your CGPA:</strong>{" "}
                                    {eligibility.studentCgpa}
                                    {" | "}
                                    <strong>Required:</strong>{" "}
                                    {eligibility.requiredCgpa}
                                  </p>
                                )}

                                {eligibility.studentGraduationYear !=
                                  null && (
                                  <p>
                                    <strong>Graduation year:</strong>{" "}
                                    {eligibility.studentGraduationYear}
                                  </p>
                                )}

                                {typeof eligibility.skillMatchPercentage ===
                                  "number" && (
                                  <p>
                                    <strong>Skill match:</strong>{" "}
                                    {eligibility.skillMatchPercentage}%
                                  </p>
                                )}

                                {Array.isArray(eligibility.matchedSkills) &&
                                  eligibility.matchedSkills.length > 0 && (
                                    <p>
                                      <strong>Matched skills:</strong>{" "}
                                      {eligibility.matchedSkills.join(", ")}
                                    </p>
                                  )}

                                {Array.isArray(eligibility.missingSkills) &&
                                  eligibility.missingSkills.length > 0 && (
                                    <p>
                                      <strong>Missing skills:</strong>{" "}
                                      {eligibility.missingSkills.join(", ")}
                                    </p>
                                  )}

                                {Array.isArray(
                                  eligibility.eligibilityReasons
                                ) &&
                                  eligibility.eligibilityReasons.length >
                                    0 && (
                                    <div>
                                      <strong>Details:</strong>
                                      <ul>
                                        {eligibility.eligibilityReasons.map(
                                          (reason, reasonIndex) => (
                                            <li key={reasonIndex}>
                                              {reason}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  )}
                              </>
                            ) : (
                              <p>{String(eligibility)}</p>
                            )}
                          </div>
                        )}

                        {jobActionMessages[jobId] && (
                          <p
                            className="job-action-success"
                            role="status"
                          >
                            {jobActionMessages[jobId]}
                          </p>
                        )}

                        {jobActionErrors[jobId] && (
                          <p className="job-action-error" role="alert">
                            {jobActionErrors[jobId]}
                          </p>
                        )}
                      </div>

                      <span className="application-status">
                        {job.status || "AVAILABLE"}
                      </span>
                    </article>
                  );
                })}
              </div>
            )}

            {!jobError && filteredJobs.length > 6 && (
              <p className="dashboard-info">
                Showing 6 of {filteredJobs.length} jobs.
              </p>
            )}
          </section>
        )}

        {/* Personalized Job Recommendations */}
        {normalizedRole === "STUDENT" && (
          <section className="dashboard-section personalized-jobs-section">
            <div className="dashboard-section-heading">
              <div>
                <h2>Recommended Jobs For You</h2>
                <p>
                  Jobs matched to your skills, CGPA and graduation year.
                </p>
              </div>

              <button
                type="button"
                className="dashboard-refresh"
                onClick={loadJobRecommendations}
                disabled={jobRecommendationsLoading}
              >
                {jobRecommendationsLoading
                  ? "Loading..."
                  : "↻ Refresh Jobs"}
              </button>
            </div>

            {jobRecommendationsLoading && (
              <p className="dashboard-info">
                Finding jobs matched to your profile...
              </p>
            )}

            {!jobRecommendationsLoading &&
              jobRecommendationsError && (
                <div className="dashboard-error" role="alert">
                  <strong>Recommendations could not be loaded.</strong>
                  <p>{jobRecommendationsError}</p>
                  <button
                    type="button"
                    className="dashboard-refresh"
                    onClick={loadJobRecommendations}
                  >
                    Try Again
                  </button>
                </div>
              )}

            {!jobRecommendationsLoading &&
              !jobRecommendationsError &&
              jobRecommendations.length === 0 && (
                <div className="dashboard-empty">
                  <span>🎯</span>
                  <h3>No personalized jobs found</h3>
                  <p>
                    Update your student profile and skills, then refresh
                    the recommendations.
                  </p>
                </div>
              )}

            {!jobRecommendationsLoading &&
              !jobRecommendationsError &&
              jobRecommendations.length > 0 && (
                <div className="personalized-jobs-grid">
                  {jobRecommendations.map((recommendation, index) => {
                    const jobId = recommendation.jobId;
                    const eligibility = eligibilityResults[jobId];

                    const eligibilityChecked =
                      eligibility !== undefined &&
                      eligibility !== null &&
                      typeof eligibility === "object";

                    const alreadyApplied =
                      eligibility?.alreadyApplied === true;

                    const canApply =
                      eligibilityChecked &&
                      eligibility?.eligible === true &&
                      !alreadyApplied;

                    const skillPercentage = Math.min(
                      100,
                      Math.max(
                        0,
                        Number(recommendation.skillMatchPercentage) || 0
                      )
                    );

                    return (
                      <article
                        className="personalized-job-card"
                        key={jobId ?? index}
                      >
                        <div className="personalized-job-header">
                          <div>
                            <h3>
                              {recommendation.jobTitle ||
                                "Recommended Job"}
                            </h3>

                            <p className="personalized-company">
                              {recommendation.companyName || "Company"}
                            </p>

                            <p className="personalized-job-meta">
                              {recommendation.location ||
                                "Location not specified"}
                              {" · "}
                              {recommendation.jobType ||
                                "Job type not specified"}
                            </p>
                          </div>

                          <span
                            className={
                              recommendation.eligible
                                ? "recommendation-badge recommendation-eligible"
                                : "recommendation-badge recommendation-review"
                            }
                          >
                            {recommendation.eligible
                              ? "Eligible"
                              : "Profile Review"}
                          </span>
                        </div>

                        <div className="skill-match-heading">
                          <span>Skill Match</span>
                          <strong>{skillPercentage}%</strong>
                        </div>

                        <div
                          className="skill-match-track"
                          role="progressbar"
                          aria-label={`Skill match ${skillPercentage}%`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={skillPercentage}
                        >
                          <div
                            className="skill-match-fill"
                            style={{ width: `${skillPercentage}%` }}
                          />
                        </div>

                        <div className="personalized-job-details">
                          <p>
                            <strong>Minimum CGPA:</strong>{" "}
                            {recommendation.minimumCgpa ?? "Not specified"}
                          </p>

                          <p>
                            <strong>Graduation Year:</strong>{" "}
                            {recommendation.graduationYear ?? "Not specified"}
                          </p>

                          <p>
                            <strong>Matched Skills:</strong>{" "}
                            {displayText(
                              recommendation.matchedSkills,
                              "None listed"
                            )}
                          </p>

                          {Array.isArray(recommendation.missingSkills) &&
                            recommendation.missingSkills.length > 0 && (
                              <p>
                                <strong>Skills to Improve:</strong>{" "}
                                {recommendation.missingSkills.join(", ")}
                              </p>
                            )}

                          <p>
                            <strong>Matched Skill Count:</strong>{" "}
                            {recommendation.matchedSkillCount ?? 0}
                            {" / "}
                            {recommendation.totalRequiredSkills ?? 0}
                          </p>
                        </div>

                        <div className="personalized-job-actions">
                          <button
                            type="button"
                            className="job-action-button eligibility-button"
                            disabled={
                              jobId == null ||
                              checkingJobId === jobId
                            }
                            onClick={() => handleCheckEligibility(jobId)}
                          >
                            {checkingJobId === jobId
                              ? "Checking..."
                              : "Check Eligibility"}
                          </button>

                          <button
                            type="button"
                            className="job-action-button apply-button"
                            disabled={
                              jobId == null ||
                              applyingJobId === jobId ||
                              !eligibilityChecked ||
                              !canApply
                            }
                            onClick={() => handleApplyJob(jobId)}
                          >
                            {applyingJobId === jobId
                              ? "Applying..."
                              : alreadyApplied
                                ? "Already Applied"
                                : !eligibilityChecked
                                  ? "Check Eligibility First"
                                  : !canApply
                                    ? "Not Eligible"
                                    : "Apply Now"}
                          </button>
                        </div>

                        {eligibilityErrors[jobId] && (
                          <p className="job-action-error" role="alert">
                            {eligibilityErrors[jobId]}
                          </p>
                        )}

                        {eligibilityChecked && (
                          <p className="personalized-eligibility-note">
                            {alreadyApplied
                              ? "You have already applied for this job."
                              : eligibility.eligible
                                ? "Eligibility check passed."
                                : "Your current profile does not meet all job requirements."}
                          </p>
                        )}

                        {jobActionMessages[jobId] && (
                          <p className="job-action-success" role="status">
                            {jobActionMessages[jobId]}
                          </p>
                        )}

                        {jobActionErrors[jobId] && (
                          <p className="job-action-error" role="alert">
                            {jobActionErrors[jobId]}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
          </section>
        )}

        {/* AI Career Recommendations */}
        {normalizedRole === "STUDENT" && (
          <section className="dashboard-section career-recommendation-section">
            <div className="dashboard-section-heading">
              <div>
                <h2>AI Career Recommendations</h2>
                <p>
                  Personalized career guidance based on your profile and skills.
                </p>
              </div>

              <button
                type="button"
                className="dashboard-refresh"
                onClick={loadCareerRecommendation}
                disabled={careerRecommendationLoading}
              >
                {careerRecommendationLoading
                  ? "Loading..."
                  : "↻ Refresh recommendations"}
              </button>
            </div>

            {careerRecommendationLoading && (
              <p className="dashboard-info">
                Loading your AI career recommendations...
              </p>
            )}

            {!careerRecommendationLoading &&
              careerRecommendationError && (
                <div className="dashboard-error" role="alert">
                  <strong>Unable to load recommendations</strong>
                  <p>{careerRecommendationError}</p>
                </div>
              )}

            {!careerRecommendationLoading &&
              !careerRecommendationError &&
              !careerRecommendation && (
                <div className="dashboard-empty">
                  <span>🤖</span>
                  <h3>No recommendations available</h3>
                  <p>
                    Generate your career recommendations first.
                  </p>
                </div>
              )}

            {!careerRecommendationLoading && careerRecommendation && (
              <>
                <div className="recommendation-target">
                  <span>YOUR TARGET ROLE</span>

                  <h3>
                    {displayText(
                      careerRecommendation.targetRole,
                      "Career Guidance"
                    )}
                  </h3>

                  {careerRecommendation.generatedAt && (
                    <p>
                      Generated at: {careerRecommendation.generatedAt}
                    </p>
                  )}
                </div>

                <div className="recommendation-grid">
                  <article className="recommendation-card">
                    <h3>🎯 Recommended Career Roles</h3>
                    <p className="recommendation-text">
                      {displayText(
                        careerRecommendation.recommendedRoles,
                        "No recommended roles available."
                      )}
                    </p>
                  </article>

                  <article className="recommendation-card">
                    <h3>💪 Your Strengths</h3>
                    <p className="recommendation-text">
                      {displayText(
                        careerRecommendation.strengths,
                        "No strengths information available."
                      )}
                    </p>
                  </article>

                  <article className="recommendation-card">
                    <h3>📚 Skill Gaps</h3>
                    <p className="recommendation-text">
                      {displayText(
                        careerRecommendation.skillGaps,
                        "No skill gap information available."
                      )}
                    </p>
                  </article>

                  <article className="recommendation-card">
                    <h3>🛠 Recommended Technologies</h3>
                    <p className="recommendation-text">
                      {displayText(
                        careerRecommendation.recommendedTechnologies,
                        "No technology recommendations available."
                      )}
                    </p>
                  </article>

                  <article className="recommendation-card">
                    <h3>🗺 Learning Roadmap</h3>
                    <p className="recommendation-text">
                      {displayText(
                        careerRecommendation.learningRoadmap,
                        "No learning roadmap available."
                      )}
                    </p>
                  </article>

                  <article className="recommendation-card">
                    <h3>🚀 Placement Advice</h3>
                    <p className="recommendation-text">
                      {displayText(
                        careerRecommendation.placementAdvice,
                        "No placement advice available."
                      )}
                    </p>
                  </article>
                </div>

                {careerRecommendation.overallAssessment && (
                  <div className="recommendation-assessment">
                    <h3>Overall Career Assessment</h3>

                    <p className="recommendation-text">
                      {displayText(
                        careerRecommendation.overallAssessment
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Recent Applications */}
        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <h2>
                {normalizedRole === "STUDENT"
                  ? "Recent Job Applications"
                  : "Available Jobs"}
              </h2>

              <p>
                {normalizedRole === "STUDENT"
                  ? "Track the status of your submitted applications."
                  : "Latest jobs returned by the backend API."}
              </p>
            </div>

            {lastUpdated && (
              <span className="dashboard-updated">
                Updated at {lastUpdated}
              </span>
            )}
          </div>

          {normalizedRole === "STUDENT" ? (
            <>
              {!loading &&
                !applicationError &&
                applications.length === 0 && (
                  <div className="dashboard-empty">
                    <span>📋</span>
                    <h3>No applications yet</h3>
                    <p>
                      Your submitted job applications will appear here.
                    </p>
                  </div>
                )}

              {applications.length > 0 && (
                <div className="dashboard-table-wrapper">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Job</th>
                        <th>Company</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {applications.map((application, index) => (
                        <tr
                          key={
                            application.id ||
                            application.applicationId ||
                            index
                          }
                        >
                          <td>{getJobTitle(application)}</td>
                          <td>{getCompanyName(application.job)}</td>

                          <td>
                            <span className="application-status">
                              {getStatus(application)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              {!loading && !jobError && jobs.length === 0 && (
                <div className="dashboard-empty">
                  <span>💼</span>
                  <h3>No jobs found</h3>
                  <p>
                    Jobs returned by the backend will appear here.
                  </p>
                </div>
              )}

              {jobs.length > 0 && (
                <div className="dashboard-job-list">
                  {jobs.slice(0, 5).map((job, index) => (
                    <article
                      className="dashboard-job-card"
                      key={job.id || job.jobId || index}
                    >
                      <div>
                        <h3>
                          {job.title ||
                            job.jobTitle ||
                            job.name ||
                            "Untitled job"}
                        </h3>

                        <p>
                          {getCompanyName(job)}
                          {job.location ? ` · ${job.location}` : ""}
                        </p>
                      </div>

                      <span className="application-status">
                        {job.status || "AVAILABLE"}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Interview summary */}
        {normalizedRole === "STUDENT" && (
          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <h2>Interview Progress</h2>
                <p>
                  Summary based on your application statuses.
                </p>
              </div>
            </div>

            <div className="dashboard-interview-summary">
              <div>
                <span>Interview-related statuses</span>
                <strong>{loading ? "—" : interviewCount}</strong>
              </div>

              <p>
                Actual interview schedules can be connected to the
                dedicated interview API in a later step.
              </p>
            </div>
          </section>
        )}

        {/* Other role dashboards */}
        {normalizedRole !== "STUDENT" && (
          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <h2>Your Management Workspace</h2>
                <p>
                  Role-specific management APIs and actions will be
                  connected in the next integration step.
                </p>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default Dashboard;