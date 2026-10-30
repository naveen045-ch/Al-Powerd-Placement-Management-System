import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";
import "./PlacementOfficerDashboard.css";

const INITIAL_ERRORS = {
  dashboard: "",
  statistics: "",
  students: "",
  companies: "",
  jobs: "",
  applications: "",
  selectedStudents: "",
};

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "students", label: "Students", icon: "♙" },
  { id: "companies", label: "Companies", icon: "▥" },
  { id: "jobs", label: "Jobs", icon: "▤" },
  { id: "applications", label: "Applications", icon: "▧" },
  { id: "selected", label: "Selected Students", icon: "✓" },
];

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

function normalizeList(data, entityKeys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const possibleKeys = [
    "content",
    "items",
    "results",
    "data",
    "students",
    "companies",
    "jobs",
    "applications",
    "selectedStudents",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  if (entityKeys.some((key) => data[key] !== undefined)) {
    return [data];
  }

  return [];
}

function formatValue(value, fallback = "—") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : fallback;
  }

  return String(value);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

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

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return String(value);
  }

  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

function formatSalaryRange(job) {
  const min = formatMoney(job?.salaryMin);
  const max = formatMoney(job?.salaryMax);

  if (min && max) {
    return `${min} – ${max}`;
  }

  return min || max || "Not specified";
}

function prettyStatus(value) {
  return String(value || "UNKNOWN")
    .replaceAll("_", " ");
}

function StatusBadge({ value }) {
  const normalized = String(value || "UNKNOWN")
    .toLowerCase()
    .replaceAll("_", "-");

  return (
    <span className={`po-status po-status-${normalized}`}>
      {prettyStatus(value)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}) {
  return (
    <article
      className={`po-metric-card po-tone-${tone || "blue"}`}
    >
      <div className="po-metric-topline">
        <span className="po-metric-label">
          {label}
        </span>

        <span className="po-metric-icon" aria-hidden="true">
          {icon}
        </span>
      </div>

      <strong className="po-metric-value">
        {value ?? 0}
      </strong>

      <span className="po-metric-detail">
        {detail}
      </span>
    </article>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="po-empty-state">
      <span className="po-empty-icon" aria-hidden="true">
        ⌕
      </span>

      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  count,
}) {
  return (
    <div className="po-section-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {count !== undefined && (
        <span className="po-count-pill">
          {count} records
        </span>
      )}
    </div>
  );
}

function PlacementOfficerDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [dashboardSummary, setDashboardSummary] = useState({});
  const [statistics, setStatistics] = useState({});

  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [lastUpdated, setLastUpdated] = useState("");

  // Load all seven confirmed Placement Officer APIs.
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrors(INITIAL_ERRORS);

    const requests = [
      [
        "dashboard",
        "/api/officer/dashboard",
        "Could not load dashboard summary.",
      ],
      [
        "statistics",
        "/api/officer/statistics",
        "Could not load placement statistics.",
      ],
      [
        "students",
        "/api/officer/students",
        "Could not load students.",
      ],
      [
        "companies",
        "/api/officer/companies",
        "Could not load companies.",
      ],
      [
        "jobs",
        "/api/officer/jobs",
        "Could not load jobs.",
      ],
      [
        "applications",
        "/api/officer/applications",
        "Could not load applications.",
      ],
      [
        "selectedStudents",
        "/api/officer/selected-students",
        "Could not load selected students.",
      ],
    ];

    try {
      const results = await Promise.allSettled(
        requests.map(([, url]) => api.get(url))
      );

      const nextErrors = { ...INITIAL_ERRORS };

      results.forEach((result, index) => {
        const [key, , fallback] = requests[index];

        if (result.status === "rejected") {
          nextErrors[key] = getApiError(
            result.reason,
            fallback
          );
        }
      });

      const resultData = (key) => {
        const index = requests.findIndex(
          ([requestKey]) => requestKey === key
        );

        const result = results[index];

        return result?.status === "fulfilled"
          ? result.value.data
          : null;
      };

      const dashboardData = resultData("dashboard");
      const statsData = resultData("statistics");

      setDashboardSummary(
        dashboardData &&
          typeof dashboardData === "object"
          ? dashboardData
          : {}
      );

      setStatistics(
        statsData && typeof statsData === "object"
          ? statsData
          : {}
      );

      setStudents(
        normalizeList(resultData("students"), [
          "studentId",
          "name",
        ])
      );

      setCompanies(
        normalizeList(resultData("companies"), [
          "companyId",
          "companyName",
        ])
      );

      setJobs(
        normalizeList(resultData("jobs"), [
          "jobId",
          "jobTitle",
        ])
      );

      setApplications(
        normalizeList(resultData("applications"), [
          "applicationId",
          "studentName",
          "jobTitle",
        ])
      );

      setSelectedStudents(
        normalizeList(resultData("selectedStudents"), [
          "applicationId",
          "studentName",
          "studentId",
        ])
      );

      setErrors(nextErrors);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        dashboard: getApiError(
          error,
          "Unable to load dashboard."
        ),
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Detailed statistics override corresponding summary values.
  const metrics = useMemo(
    () => ({
      ...dashboardSummary,
      ...statistics,
    }),
    [dashboardSummary, statistics]
  );

  // Search current table by any field in a record.
  const searchedData = useMemo(() => {
    const term = search.trim().toLowerCase();

    const sourceByTab = {
      students,
      companies,
      jobs,
      applications,
      selected: selectedStudents,
    };

    const source = sourceByTab[activeTab] || [];

    if (!term) {
      return source;
    }

    return source.filter((item) =>
      JSON.stringify(item ?? {})
        .toLowerCase()
        .includes(term)
    );
  }, [
    activeTab,
    search,
    students,
    companies,
    jobs,
    applications,
    selectedStudents,
  ]);

  const applicationStatusCounts = useMemo(() => {
    const counts = {
      APPLIED: 0,
      UNDER_REVIEW: 0,
      SHORTLISTED: 0,
      INTERVIEW: 0,
      SELECTED: 0,
      REJECTED: 0,
    };

    applications.forEach((application) => {
      const key = String(
        application?.status || "APPLIED"
      ).toUpperCase();

      if (Object.prototype.hasOwnProperty.call(counts, key)) {
        counts[key] += 1;
      }
    });

    return counts;
  }, [applications]);

  const placementRate =
    Number(metrics.totalApplications) > 0
      ? Math.round(
          (Number(metrics.totalSelected || 0) /
            Number(metrics.totalApplications)) *
            100
        )
      : 0;

  const dataErrorKeys = {
    students: "students",
    companies: "companies",
    jobs: "jobs",
    applications: "applications",
    selected: "selectedStudents",
  };

  function renderStudentsTable(rows) {
    return (
      <div className="po-table-wrap">
        <table className="po-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Contact</th>
              <th>College</th>
              <th>Branch</th>
              <th>CGPA</th>
              <th>Graduation</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((student, index) => (
              <tr key={student.studentId ?? index}>
                <td>
                  <div className="po-person-cell">
                    <span className="po-avatar">
                      {String(student.name || "S")
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </span>

                    <div>
                      <strong>
                        {formatValue(
                          student.name,
                          "Unnamed student"
                        )}
                      </strong>

                      <small>
                        ID: {formatValue(student.studentId)}
                      </small>
                    </div>
                  </div>
                </td>

                <td>
                  <span>{formatValue(student.email)}</span>
                  <small>
                    {formatValue(student.phone, "No phone")}
                  </small>
                </td>

                <td>{formatValue(student.college)}</td>
                <td>{formatValue(student.branch)}</td>

                <td>
                  <span className="po-cgpa">
                    {formatValue(student.cgpa)}
                  </span>
                </td>

                <td>
                  {formatValue(student.graduationYear)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderCompaniesTable(rows) {
    return (
      <div className="po-table-wrap">
        <table className="po-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Industry</th>
              <th>Location</th>
              <th>Website</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((company, index) => (
              <tr key={company.companyId ?? index}>
                <td>
                  <div className="po-company-cell">
                    <span className="po-company-icon">
                      ▥
                    </span>

                    <div>
                      <strong>
                        {formatValue(
                          company.companyName,
                          "Unnamed company"
                        )}
                      </strong>

                      <small>
                        ID: {formatValue(company.companyId)}
                      </small>
                    </div>
                  </div>
                </td>

                <td>{formatValue(company.industry)}</td>
                <td>{formatValue(company.location)}</td>

                <td>
                  {company.website ? (
                    <a
                      className="po-link"
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visit website ↗
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderJobsTable(rows) {
    return (
      <div className="po-table-wrap">
        <table className="po-table po-jobs-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Company</th>
              <th>Location</th>
              <th>Salary range</th>
              <th>Min CGPA</th>
              <th>Graduation</th>
              <th>Deadline</th>
              <th>State</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((job, index) => (
              <tr key={job.jobId ?? index}>
                <td>
                  <strong>
                    {formatValue(job.jobTitle, "Untitled job")}
                  </strong>

                  <small>
                    ID: {formatValue(job.jobId)}
                  </small>
                </td>

                <td>{formatValue(job.companyName)}</td>
                <td>{formatValue(job.location)}</td>
                <td>{formatSalaryRange(job)}</td>
                <td>{formatValue(job.minimumCgpa)}</td>
                <td>{formatValue(job.graduationYear)}</td>
                <td>{formatDate(job.applicationDeadline)}</td>

                <td>
                  <StatusBadge
                    value={
                      job.active === false
                        ? "INACTIVE"
                        : "ACTIVE"
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderApplicationsTable(rows) {
    return (
      <div className="po-table-wrap">
        <table className="po-table po-applications-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Job</th>
              <th>Company</th>
              <th>Status</th>
              <th>Applied at</th>
              <th>Recruiter note</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((application, index) => (
              <tr key={application.applicationId ?? index}>
                <td>
                  <div>
                    <strong>
                      {formatValue(
                        application.studentName,
                        "Unknown student"
                      )}
                    </strong>

                    <small>
                      {formatValue(application.studentEmail)}
                    </small>
                  </div>
                </td>

                <td>
                  <div>
                    <strong>
                      {formatValue(
                        application.jobTitle,
                        "Untitled job"
                      )}
                    </strong>

                    <small>
                      Application #
                      {formatValue(application.applicationId)}
                    </small>
                  </div>
                </td>

                <td>{formatValue(application.companyName)}</td>

                <td>
                  <StatusBadge value={application.status} />
                </td>

                <td>{formatDate(application.appliedAt)}</td>

                <td className="po-note-cell">
                  {formatValue(
                    application.recruiterNote,
                    "No note"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderSelectedTable(rows) {
    return (
      <div className="po-table-wrap">
        <table className="po-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Job selected for</th>
              <th>Company</th>
              <th>Student ID</th>
              <th>Application ID</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((student, index) => (
              <tr key={student.applicationId ?? index}>
                <td>
                  <div>
                    <strong>
                      {formatValue(
                        student.studentName,
                        "Unknown student"
                      )}
                    </strong>

                    <small>
                      {formatValue(student.studentEmail)}
                    </small>
                  </div>
                </td>

                <td>{formatValue(student.jobTitle)}</td>
                <td>{formatValue(student.companyName)}</td>
                <td>#{formatValue(student.studentId)}</td>
                <td>#{formatValue(student.applicationId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTableForTab(tab, rows) {
    if (tab === "students") {
      return renderStudentsTable(rows);
    }

    if (tab === "companies") {
      return renderCompaniesTable(rows);
    }

    if (tab === "jobs") {
      return renderJobsTable(rows);
    }

    if (tab === "applications") {
      return renderApplicationsTable(rows);
    }

    if (tab === "selected") {
      return renderSelectedTable(rows);
    }

    return null;
  }

  const tableMeta = {
    students: {
      title: "Student directory",
      description:
        "Review registered student profiles and academic details.",
    },
    companies: {
      title: "Company directory",
      description:
        "Companies registered in the placement system.",
    },
    jobs: {
      title: "Job postings",
      description:
        "Review job opportunities and their current availability.",
    },
    applications: {
      title: "Application tracker",
      description:
        "Follow application statuses and recruiter feedback.",
    },
    selected: {
      title: "Selected students",
      description:
        "Students whose applications have reached the selected stage.",
    },
  };

  return (
    <main className="po-page">
      <header className="po-topbar">
        <div className="po-brand">
          <div className="po-brand-mark">P</div>

          <div>
            <strong>PlacementPro</strong>
            <span>PLACEMENT OPERATIONS</span>
          </div>
        </div>

        <div className="po-topbar-actions">
          <span className="po-role-chip">
            <span className="po-online-dot" />
            Placement Officer
          </span>

          <button
            type="button"
            className="po-logout-button"
            onClick={onLogout}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="po-layout">
        <aside className="po-sidebar">
          <p className="po-nav-caption">WORKSPACE</p>

          <nav
            className="po-nav"
            aria-label="Placement officer dashboard sections"
          >
            {NAV_ITEMS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`po-nav-item ${
                  activeTab === item.id ? "is-active" : ""
                }`}
                onClick={() => {
                  setActiveTab(item.id);
                  setSearch("");
                }}
              >
                <span className="po-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>

                <span>{item.label}</span>

                {item.id === "students" && (
                  <span className="po-nav-count">
                    {students.length}
                  </span>
                )}

                {item.id === "selected" && (
                  <span className="po-nav-count">
                    {selectedStudents.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="po-sidebar-note">
            <span className="po-note-symbol">✦</span>

            <strong>Placement overview</strong>

            <p>
              Monitor student progress, employer activity and
              placement outcomes from one workspace.
            </p>
          </div>
        </aside>

        <section className="po-main">
          <div className="po-page-heading">
            <div>
              <span className="po-eyebrow">
                CAREER MANAGEMENT SYSTEM
              </span>

              <h1>
                {activeTab === "overview"
                  ? "Placement overview"
                  : NAV_ITEMS.find(
                      (item) => item.id === activeTab
                    )?.label}
              </h1>

              <p>
                {activeTab === "overview"
                  ? "A live snapshot of placement activity across your institution."
                  : tableMeta[activeTab]?.description}
              </p>
            </div>

            <div className="po-heading-actions">
              <span className="po-last-updated">
                {lastUpdated
                  ? `Updated ${lastUpdated}`
                  : "Live dashboard"}
              </span>

              <button
                type="button"
                className="po-refresh-button"
                onClick={loadDashboard}
                disabled={loading}
              >
                <span aria-hidden="true">↻</span>
                {loading ? "Refreshing…" : "Refresh data"}
              </button>
            </div>
          </div>

          {Object.values(errors).some(Boolean) && (
            <div className="po-alert" role="alert">
              <span className="po-alert-icon">!</span>

              <div>
                <strong>
                  Some dashboard data could not be loaded.
                </strong>

                <p>
                  {Object.entries(errors)
                    .filter(([, message]) => Boolean(message))
                    .map(([key, message]) =>
                      `${key === "selectedStudents" ? "selected students" : key}: ${message}`
                    )
                    .join(" · ")}
                </p>

                <button
                  type="button"
                  onClick={loadDashboard}
                >
                  Retry all requests
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="po-loading">
              <span className="po-spinner" />
              Loading placement data from the backend…
            </div>
          )}

          {activeTab === "overview" && (
            <>
              <section
                className="po-metrics-grid"
                aria-label="Placement statistics"
              >
                <MetricCard
                  label="Total students"
                  value={metrics.totalStudents ?? 0}
                  detail="Registered student profiles"
                  icon="♙"
                  tone="blue"
                />

                <MetricCard
                  label="Companies"
                  value={metrics.totalCompanies ?? 0}
                  detail="Registered employers"
                  icon="▥"
                  tone="violet"
                />

                <MetricCard
                  label="Jobs posted"
                  value={metrics.totalJobs ?? 0}
                  detail="Placement opportunities"
                  icon="▤"
                  tone="cyan"
                />

                <MetricCard
                  label="Applications"
                  value={metrics.totalApplications ?? 0}
                  detail="Total submitted applications"
                  icon="▧"
                  tone="amber"
                />

                <MetricCard
                  label="Selected"
                  value={metrics.totalSelected ?? 0}
                  detail="Selected application outcomes"
                  icon="✓"
                  tone="green"
                />

                <MetricCard
                  label="Interviews"
                  value={metrics.totalInterviews ?? 0}
                  detail="Interview-related records / statuses"
                  icon="◷"
                  tone="rose"
                />
              </section>

              <section className="po-overview-grid">
                <article className="po-panel po-status-panel">
                  <div className="po-panel-heading">
                    <div>
                      <h2>Application pipeline</h2>
                      <p>
                        Current counts by application status from
                        the application list.
                      </p>
                    </div>

                    <span className="po-panel-icon">↗</span>
                  </div>

                  {(() => {
                    const statusRows = [
                      [
                        "Applied",
                        applicationStatusCounts.APPLIED,
                        "blue",
                      ],
                      [
                        "Under review",
                        applicationStatusCounts.UNDER_REVIEW,
                        "amber",
                      ],
                      [
                        "Shortlisted",
                        applicationStatusCounts.SHORTLISTED,
                        "violet",
                      ],
                      [
                        "Interview",
                        applicationStatusCounts.INTERVIEW,
                        "cyan",
                      ],
                      [
                        "Selected",
                        applicationStatusCounts.SELECTED,
                        "green",
                      ],
                      [
                        "Rejected",
                        applicationStatusCounts.REJECTED,
                        "rose",
                      ],
                    ];

                    const maxCount = Math.max(
                      1,
                      ...statusRows.map((row) => row[1])
                    );

                    return (
                      <div className="po-pipeline-list">
                        {statusRows.map(([label, count, tone]) => (
                          <div
                            className="po-pipeline-row"
                            key={label}
                          >
                            <div className="po-pipeline-label">
                              <span>{label}</span>
                              <strong>{count}</strong>
                            </div>

                            <div className="po-pipeline-track">
                              <div
                                className={`po-pipeline-fill po-fill-${tone}`}
                                style={{
                                  width: `${(count / maxCount) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="po-status-summary">
                    <div>
                      <span>Placement rate</span>
                      <strong>{placementRate}%</strong>
                    </div>

                    <p>
                      Selected applications divided by total
                      applications.
                    </p>
                  </div>
                </article>

                <article className="po-panel po-outcome-panel">
                  <div className="po-panel-heading">
                    <div>
                      <h2>Placement outcomes</h2>
                      <p>
                        Summary returned by the officer dashboard API.
                      </p>
                    </div>

                    <span className="po-panel-icon">◎</span>
                  </div>

                  <div className="po-outcome-big">
                    <strong>{metrics.totalSelected ?? 0}</strong>
                    <span>selected applications</span>
                  </div>

                  <div className="po-outcome-stats">
                    <div>
                      <span>Rejected</span>
                      <strong>{metrics.totalRejected ?? 0}</strong>
                    </div>

                    <div>
                      <span>Shortlisted</span>
                      <strong>{metrics.totalShortlisted ?? 0}</strong>
                    </div>

                    <div>
                      <span>Under review</span>
                      <strong>{metrics.totalUnderReview ?? 0}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="po-text-action"
                    onClick={() => setActiveTab("selected")}
                  >
                    View selected students <span>→</span>
                  </button>
                </article>
              </section>

              <section className="po-panel po-recent-panel">
                <div className="po-panel-heading">
                  <div>
                    <h2>Recent applications</h2>
                    <p>
                      Latest records returned by the applications
                      endpoint.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="po-text-action"
                    onClick={() => setActiveTab("applications")}
                  >
                    View all <span>→</span>
                  </button>
                </div>

                {applications.length ? (
                  renderApplicationsTable(
                    [...applications]
                      .sort(
                        (a, b) =>
                          (Date.parse(b.appliedAt || "") || 0) -
                          (Date.parse(a.appliedAt || "") || 0)
                      )
                      .slice(0, 5)
                  )
                ) : (
                  <EmptyState
                    title="No applications to show"
                    description={
                      errors.applications ||
                      "Application records will appear here when available."
                    }
                  />
                )}
              </section>
            </>
          )}

          {activeTab !== "overview" && tableMeta[activeTab] && (
            <section className="po-panel po-directory-panel">
              <div className="po-directory-toolbar">
                <SectionHeading
                  title={tableMeta[activeTab].title}
                  description={tableMeta[activeTab].description}
                  count={searchedData.length}
                />

                <label className="po-search-box">
                  <span aria-hidden="true">⌕</span>

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    type="search"
                    placeholder={`Search ${
                      activeTab === "selected"
                        ? "selected students"
                        : activeTab
                    }…`}
                    aria-label={`Search ${activeTab}`}
                  />
                </label>
              </div>

              {loading ? (
                <EmptyState
                  title="Loading records"
                  description="The latest records are being fetched from your backend."
                />
              ) : searchedData.length ? (
                renderTableForTab(activeTab, searchedData)
              ) : (
                <EmptyState
                  title={
                    search.trim()
                      ? "No matching records"
                      : `No ${
                          activeTab === "selected"
                            ? "selected students"
                            : activeTab
                        } found`
                  }
                  description={
                    search.trim()
                      ? "Try a different name, company, job title, status or keyword."
                      : errors[dataErrorKeys[activeTab]] ||
                        "The API returned no records for this section."
                  }
                />
              )}
            </section>
          )}

          <footer className="po-footer">
            <span>
              PlacementPro{" "}
              <span className="po-footer-dot">•</span>{" "}
              Placement Officer Workspace
            </span>

            <span>
              Data is fetched from your secured backend APIs.
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}

export default PlacementOfficerDashboard;