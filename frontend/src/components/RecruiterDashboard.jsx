import { useCallback, useEffect, useState } from "react";
import api from "../api";
import "./RecruiterDashboard.css";

const STATUS_OPTIONS = [
  "APPLIED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "SELECTED",
  "REJECTED",
];

const DEFAULT_JOB_FORM = {
  title: "",
  description: "",
  location: "Bhopal, Madhya Pradesh",
  jobType: "FULL_TIME",
  salaryMin: "",
  salaryMax: "",
  minimumCgpa: "7",
  graduationYear: "2027",
  applicationDeadline: "",
  requiredSkillIds: "",
};

function getList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  for (const key of [
    "content",
    "jobs",
    "applications",
    "results",
    "items",
  ]) {
    if (Array.isArray(data[key])) return data[key];
  }

  if (Array.isArray(data.data)) return data.data;

  if (data.data && typeof data.data === "object") {
    return getList(data.data);
  }

  return [];
}

function getError(error, fallback) {
  const body = error?.response?.data;

  if (typeof body === "string" && body.trim()) {
    return body;
  }

  return (
    body?.message ||
    body?.error ||
    error?.message ||
    fallback
  );
}

function getJobId(job) {
  return job?.id ?? job?.jobId;
}

function getApplicationId(application) {
  return application?.id ?? application?.applicationId;
}

function getApplicationStatus(application) {
  return String(
    application?.status ||
      application?.applicationStatus ||
      "APPLIED"
  ).toUpperCase();
}

function getStudentDetails(application) {
  const student =
    application?.student ||
    application?.applicant ||
    {};

  const user = student?.user || student;

  return {
    name:
      application?.studentName ||
      application?.applicantName ||
      user?.fullName ||
      user?.name ||
      "Student",

    email:
      application?.studentEmail ||
      application?.applicantEmail ||
      user?.email ||
      "Email not available",

    cgpa:
      application?.studentCgpa ??
      application?.cgpa ??
      student?.cgpa ??
      student?.profile?.cgpa ??
      user?.studentProfile?.cgpa,

    graduationYear:
      application?.graduationYear ??
      student?.graduationYear ??
      student?.profile?.graduationYear,
  };
}

function getJobTitle(job) {
  return (
    job?.title ||
    job?.jobTitle ||
    job?.name ||
    "Untitled Job"
  );
}

function getCompanyName(job) {
  if (typeof job?.company === "string") {
    return job.company;
  }

  return (
    job?.company?.name ||
    job?.companyName ||
    job?.company?.companyName ||
    "Company"
  );
}

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
}

function getSkillIds(job) {
  const skills =
    job?.requiredSkillIds ??
    job?.requiredSkills ??
    job?.skills ??
    [];

  if (!Array.isArray(skills)) return [];

  return skills
    .map((skill) => {
      if (typeof skill === "number") return skill;

      if (
        typeof skill === "string" &&
        /^\d+$/.test(skill)
      ) {
        return Number(skill);
      }

      return skill?.id ?? skill?.skillId ?? null;
    })
    .filter((id) => id != null);
}

function buildJobPayload(form) {
  const requiredSkillIds = [
    ...new Set(
      String(form.requiredSkillIds || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map(Number)
    ),
  ];

  if (
    requiredSkillIds.length === 0 ||
    requiredSkillIds.some(
      (id) => !Number.isInteger(id) || id <= 0
    )
  ) {
    return {
      error:
        "Enter at least one valid skill ID, for example: 1, 2, 3.",
    };
  }

  if (!form.applicationDeadline) {
    return {
      error: "Please select an application deadline.",
    };
  }

  const deadline = new Date(
    form.applicationDeadline
  );

  if (
    Number.isNaN(deadline.getTime()) ||
    deadline.getTime() <= Date.now()
  ) {
    return {
      error:
        "Please select an application deadline in the future.",
    };
  }

  const salaryMin = Number(form.salaryMin);
  const salaryMax = Number(form.salaryMax);
  const minimumCgpa = Number(form.minimumCgpa);
  const graduationYear = Number(form.graduationYear);

  if (
    !form.title.trim() ||
    !form.description.trim() ||
    !form.location.trim() ||
    !Number.isFinite(salaryMin) ||
    !Number.isFinite(salaryMax) ||
    salaryMin < 0 ||
    salaryMax < salaryMin ||
    !Number.isFinite(minimumCgpa) ||
    minimumCgpa < 0 ||
    minimumCgpa > 10 ||
    !Number.isInteger(graduationYear)
  ) {
    return {
      error:
        "Check job title, description, location, salary range, CGPA, and graduation year.",
    };
  }

  return {
    payload: {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      jobType: form.jobType,
      salaryMin,
      salaryMax,
      minimumCgpa,
      graduationYear,
      applicationDeadline: deadline.toISOString(),
      requiredSkillIds,
    },
  };
}

function JobFormFields({ form, setForm, prefix }) {
  const update = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  return (
    <div className="recruiter-create-job-grid">
      <div className="recruiter-form-field">
        <label htmlFor={`${prefix}-title`}>
          Job Title
        </label>
        <input
          id={`${prefix}-title`}
          className="recruiter-input"
          value={form.title}
          onChange={(event) =>
            update("title", event.target.value)
          }
          required
        />
      </div>

      <div className="recruiter-form-field">
        <label htmlFor={`${prefix}-location`}>
          Location
        </label>
        <input
          id={`${prefix}-location`}
          className="recruiter-input"
          value={form.location}
          onChange={(event) =>
            update("location", event.target.value)
          }
          required
        />
      </div>

      <div className="recruiter-form-field">
        <label htmlFor={`${prefix}-type`}>
          Job Type
        </label>
        <select
          id={`${prefix}-type`}
          className="recruiter-input"
          value={form.jobType}
          onChange={(event) =>
            update("jobType", event.target.value)
          }
        >
          <option value="FULL_TIME">FULL_TIME</option>
          <option value="PART_TIME">PART_TIME</option>
          <option value="INTERNSHIP">INTERNSHIP</option>
          <option value="CONTRACT">CONTRACT</option>
        </select>
      </div>

      <div className="recruiter-form-field">
        <label htmlFor={`${prefix}-cgpa`}>
          Minimum CGPA (0–10)
        </label>
        <input
          id={`${prefix}-cgpa`}
          type="number"
          min="0"
          max="10"
          step="0.1"
          className="recruiter-input"
          value={form.minimumCgpa}
          onChange={(event) =>
            update("minimumCgpa", event.target.value)
          }
          required
        />
      </div>

      <div className="recruiter-form-field">
        <label htmlFor={`${prefix}-salary-min`}>
          Minimum Salary
        </label>
        <input
          id={`${prefix}-salary-min`}
          type="number"
          min="0"
          className="recruiter-input"
          value={form.salaryMin}
          onChange={(event) =>
            update("salaryMin", event.target.value)
          }
          required
        />
      </div>

      <div className="recruiter-form-field">
        <label htmlFor={`${prefix}-salary-max`}>
          Maximum Salary
        </label>
        <input
          id={`${prefix}-salary-max`}
          type="number"
          min="0"
          className="recruiter-input"
          value={form.salaryMax}
          onChange={(event) =>
            update("salaryMax", event.target.value)
          }
          required
        />
      </div>

      <div className="recruiter-form-field">
        <label htmlFor={`${prefix}-year`}>
          Graduation Year
        </label>
        <input
          id={`${prefix}-year`}
          type="number"
          min="2020"
          max="2100"
          className="recruiter-input"
          value={form.graduationYear}
          onChange={(event) =>
            update("graduationYear", event.target.value)
          }
          required
        />
      </div>

      <div className="recruiter-form-field">
        <label htmlFor={`${prefix}-deadline`}>
          Application Deadline
        </label>
        <input
          id={`${prefix}-deadline`}
          type="datetime-local"
          className="recruiter-input"
          value={form.applicationDeadline}
          onChange={(event) =>
            update(
              "applicationDeadline",
              event.target.value
            )
          }
          required
        />
      </div>

      <div className="recruiter-form-field recruiter-description-field">
        <label htmlFor={`${prefix}-description`}>
          Description
        </label>
        <textarea
          id={`${prefix}-description`}
          className="recruiter-input recruiter-textarea"
          value={form.description}
          onChange={(event) =>
            update("description", event.target.value)
          }
          rows={4}
          required
        />
      </div>

      <div className="recruiter-form-field recruiter-skills-field">
        <label htmlFor={`${prefix}-skills`}>
          Required Skill IDs
        </label>
        <input
          id={`${prefix}-skills`}
          className="recruiter-input"
          value={form.requiredSkillIds}
          onChange={(event) =>
            update("requiredSkillIds", event.target.value)
          }
          placeholder="Enter actual IDs, e.g. 1, 2, 3"
          required
        />
        <small>
          Use the actual skill IDs from your database,
          separated by commas.
        </small>
      </div>
    </div>
  );
}

function RecruiterDashboard({ onLogout }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");

  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");

  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] =
    useState(false);
  const [applicationsError, setApplicationsError] =
    useState("");

  const [statusDrafts, setStatusDrafts] = useState({});
  const [recruiterNotes, setRecruiterNotes] = useState({});

  const [savingApplicationId, setSavingApplicationId] =
    useState(null);
  const [applicationMessages, setApplicationMessages] =
    useState({});
  const [applicationErrors, setApplicationErrors] =
    useState({});

  const [openInterviewFor, setOpenInterviewFor] =
    useState(null);
  const [interviewDrafts, setInterviewDrafts] = useState({});
  const [schedulingApplicationId, setSchedulingApplicationId] =
    useState(null);
  const [interviewMessages, setInterviewMessages] =
    useState({});
  const [interviewErrors, setInterviewErrors] = useState({});

  const [showJobForm, setShowJobForm] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [createJobMessage, setCreateJobMessage] = useState("");
  const [createJobError, setCreateJobError] = useState("");
  const [jobForm, setJobForm] = useState({
    ...DEFAULT_JOB_FORM,
  });

  const [editingJobId, setEditingJobId] = useState(null);
  const [savingJobEdit, setSavingJobEdit] = useState(false);
  const [editJobMessage, setEditJobMessage] = useState("");
  const [editJobError, setEditJobError] = useState("");
  const [editJobForm, setEditJobForm] = useState({
    ...DEFAULT_JOB_FORM,
  });

  // Load recruiter's jobs.
  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError("");

    try {
      const response = await api.get("/api/jobs/my", {
        params: {
          page: 0,
          size: 100,
          sort: "createdAt,DESC",
        },
      });

      const list = getList(response.data);
      setJobs(list);

      setSelectedJobId((currentId) => {
        const currentExists = list.some(
          (job) =>
            String(getJobId(job)) === String(currentId)
        );

        if (currentId && currentExists) {
          return currentId;
        }

        return list.length && getJobId(list[0]) != null
          ? String(getJobId(list[0]))
          : "";
      });
    } catch (error) {
      setJobs([]);
      setSelectedJobId("");
      setJobsError(
        getError(error, "Unable to load your job postings.")
      );
    } finally {
      setJobsLoading(false);
    }
  }, []);

  // Load applications belonging to the selected job.
  const loadApplications = useCallback(async (jobId) => {
    if (jobId == null || jobId === "") {
      setApplications([]);
      setApplicationsError("");
      return;
    }

    setApplicationsLoading(true);
    setApplicationsError("");

    try {
      const response = await api.get(
        `/api/jobs/${jobId}/applications`,
        {
          params: {
            page: 0,
            size: 100,
            sort: "appliedAt,DESC",
          },
        }
      );

      setApplications(getList(response.data));
    } catch (error) {
      setApplications([]);
      setApplicationsError(
        getError(error, "Unable to load job applicants.")
      );
    } finally {
      setApplicationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (selectedJobId) {
      loadApplications(selectedJobId);
    } else {
      setApplications([]);
      setApplicationsError("");
    }
  }, [selectedJobId, loadApplications]);

  // Create a new job.
  async function handleCreateJob(event) {
    event.preventDefault();
    setCreateJobMessage("");
    setCreateJobError("");

    const result = buildJobPayload(jobForm);

    if (result.error) {
      setCreateJobError(result.error);
      return;
    }

    setCreatingJob(true);

    try {
      const response = await api.post(
        "/api/jobs",
        result.payload
      );

      setCreateJobMessage(
        response.data?.message || "Job created successfully."
      );

      setJobForm({ ...DEFAULT_JOB_FORM });
      setShowJobForm(false);

      await loadJobs();
    } catch (error) {
      setCreateJobError(
        getError(error, "Unable to create the job.")
      );
    } finally {
      setCreatingJob(false);
    }
  }

  // Populate the edit form from a selected job.
  function handleStartEditJob(job) {
    const jobId = getJobId(job);

    if (jobId == null) {
      setEditJobError(
        "Job ID was not found in the API response."
      );
      return;
    }

    setEditJobForm({
      title: job.title || job.jobTitle || "",
      description: job.description || "",
      location: job.location || "",
      jobType: job.jobType || "FULL_TIME",
      salaryMin: job.salaryMin ?? "",
      salaryMax: job.salaryMax ?? "",
      minimumCgpa: job.minimumCgpa ?? "7",
      graduationYear: job.graduationYear ?? "2027",
      applicationDeadline: toDateTimeLocal(
        job.applicationDeadline
      ),
      requiredSkillIds: getSkillIds(job).join(", "),
    });

    setEditingJobId(String(jobId));
    setEditJobError("");
    setEditJobMessage("");
  }

  // Save edits to an existing job.
  async function handleSaveJobEdit(event) {
    event.preventDefault();

    if (editingJobId == null) return;

    setEditJobError("");
    setEditJobMessage("");

    const result = buildJobPayload(editJobForm);

    if (result.error) {
      setEditJobError(result.error);
      return;
    }

    setSavingJobEdit(true);

    try {
      const response = await api.put(
        `/api/jobs/${editingJobId}`,
        result.payload
      );

      setEditJobMessage(
        response.data?.message || "Job updated successfully."
      );

      setEditingJobId(null);
      await loadJobs();
    } catch (error) {
      setEditJobError(
        getError(error, "Unable to update the job.")
      );
    } finally {
      setSavingJobEdit(false);
    }
  }

  // Update application status and recruiter note.
  async function handleUpdateStatus(application) {
    const applicationId = getApplicationId(application);

    if (applicationId == null) return;

    const status =
      statusDrafts[applicationId] ??
      getApplicationStatus(application);

    const recruiterNote =
      recruiterNotes[applicationId] ??
      application?.recruiterNote ??
      "";

    setSavingApplicationId(applicationId);

    setApplicationMessages((previous) => ({
      ...previous,
      [applicationId]: "",
    }));

    setApplicationErrors((previous) => ({
      ...previous,
      [applicationId]: "",
    }));

    try {
      await api.patch(
        `/api/applications/${applicationId}/status`,
        {
          status,
          recruiterNote,
        }
      );

      setApplicationMessages((previous) => ({
        ...previous,
        [applicationId]:
          "Application status updated successfully.",
      }));

      await loadApplications(selectedJobId);
    } catch (error) {
      setApplicationErrors((previous) => ({
        ...previous,
        [applicationId]: getError(
          error,
          "Unable to update application status."
        ),
      }));
    } finally {
      setSavingApplicationId(null);
    }
  }

  function updateInterviewDraft(applicationId, field, value) {
    setInterviewDrafts((previous) => ({
      ...previous,
      [applicationId]: {
        interviewDateTime:
          previous[applicationId]?.interviewDateTime || "",
        mode: previous[applicationId]?.mode || "ONLINE",
        locationOrLink:
          previous[applicationId]?.locationOrLink || "",
        notes: previous[applicationId]?.notes || "",
        ...previous[applicationId],
        [field]: value,
      },
    }));
  }

  function getInterviewDraft(applicationId) {
    return (
      interviewDrafts[applicationId] || {
        interviewDateTime: "",
        mode: "ONLINE",
        locationOrLink: "",
        notes: "",
      }
    );
  }

  // Schedule an interview for an application.
  async function handleScheduleInterview(event, application) {
    event.preventDefault();

    const applicationId = getApplicationId(application);

    if (applicationId == null) return;

    const draft = getInterviewDraft(applicationId);

    if (!draft.interviewDateTime || !draft.mode.trim()) {
      setInterviewErrors((previous) => ({
        ...previous,
        [applicationId]:
          "Please enter the interview date, time and mode.",
      }));
      return;
    }

    const parsedDate = new Date(
      draft.interviewDateTime
    );

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.getTime() <= Date.now()
    ) {
      setInterviewErrors((previous) => ({
        ...previous,
        [applicationId]:
          "Choose a valid interview date and time in the future.",
      }));
      return;
    }

    setSchedulingApplicationId(applicationId);

    setInterviewMessages((previous) => ({
      ...previous,
      [applicationId]: "",
    }));

    setInterviewErrors((previous) => ({
      ...previous,
      [applicationId]: "",
    }));

    try {
      await api.post(
        `/api/interviews/applications/${applicationId}`,
        {
          interviewDateTime: parsedDate.toISOString(),
          mode: draft.mode.trim(),
          locationOrLink: draft.locationOrLink.trim(),
          notes: draft.notes.trim(),
        }
      );

      setInterviewMessages((previous) => ({
        ...previous,
        [applicationId]: "Interview scheduled successfully.",
      }));

      setOpenInterviewFor(null);
      await loadApplications(selectedJobId);
    } catch (error) {
      setInterviewErrors((previous) => ({
        ...previous,
        [applicationId]: getError(
          error,
          "Unable to schedule the interview."
        ),
      }));
    } finally {
      setSchedulingApplicationId(null);
    }
  }

  const selectedJob = jobs.find(
    (job) =>
      String(getJobId(job)) === String(selectedJobId)
  );

  const shortlistedCount = applications.filter(
    (application) =>
      getApplicationStatus(application) === "SHORTLISTED"
  ).length;

  const pendingCount = applications.filter((application) =>
    ["APPLIED", "UNDER_REVIEW"].includes(
      getApplicationStatus(application)
    )
  ).length;

  return (
    <main className="recruiter-page">
      {/* Header */}
      <header className="recruiter-header">
        <div className="recruiter-brand">
          <div className="recruiter-brand-icon">P</div>

          <div>
            <h2>PlacementPro</h2>
            <p>RECRUITER WORKSPACE</p>
          </div>
        </div>

        <div className="recruiter-header-actions">
          <span className="recruiter-role-label">
            RECRUITER
          </span>

          <button
            type="button"
            className="recruiter-secondary-button"
            onClick={onLogout}
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="recruiter-content">
        {/* Welcome section */}
        <div className="recruiter-welcome">
          <div>
            <span className="recruiter-eyebrow">
              HIRING MANAGEMENT
            </span>

            <h1>Recruiter Dashboard</h1>

            <p>
              Manage your job postings, review candidates and
              schedule interviews.
            </p>
          </div>

          <button
            type="button"
            className="recruiter-primary-button"
            onClick={async () => {
              await loadJobs();

              if (selectedJobId) {
                await loadApplications(selectedJobId);
              }
            }}
            disabled={jobsLoading || applicationsLoading}
          >
            {jobsLoading || applicationsLoading
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>
        </div>

        {jobsError && (
          <div className="recruiter-error" role="alert">
            <strong>Jobs could not be loaded.</strong>
            <p>{jobsError}</p>
          </div>
        )}

        {/* Statistics */}
        <section className="recruiter-stats">
          <article className="recruiter-stat-card">
            <span>💼</span>
            <p>My Job Postings</p>
            <h2>{jobsLoading ? "—" : jobs.length}</h2>
          </article>

          <article className="recruiter-stat-card">
            <span>👥</span>
            <p>Applicants for Selected Job</p>
            <h2>
              {applicationsLoading ? "—" : applications.length}
            </h2>
          </article>

          <article className="recruiter-stat-card">
            <span>⌛</span>
            <p>Pending Review</p>
            <h2>
              {applicationsLoading ? "—" : pendingCount}
            </h2>
          </article>

          <article className="recruiter-stat-card">
            <span>⭐</span>
            <p>Shortlisted</p>
            <h2>
              {applicationsLoading ? "—" : shortlistedCount}
            </h2>
          </article>
        </section>

        {/* Job management */}
        <section className="recruiter-panel">
          <div className="recruiter-panel-heading">
            <div>
              <h2>My Job Postings</h2>
              <p>
                Create a job or select one of your postings
                to edit and review applicants.
              </p>
            </div>

            <button
              type="button"
              className="recruiter-primary-button"
              onClick={() => {
                setShowJobForm((previous) => !previous);
                setCreateJobError("");
                setCreateJobMessage("");
              }}
            >
              {showJobForm
                ? "Close Create Form"
                : "+ Create New Job"}
            </button>
          </div>

          {createJobMessage && (
            <div
              className="recruiter-create-success"
              role="status"
            >
              {createJobMessage}
            </div>
          )}

          {createJobError && (
            <div className="recruiter-error" role="alert">
              {createJobError}
            </div>
          )}

          {/* Create job form */}
          {showJobForm && (
            <form
              className="recruiter-create-job-form"
              onSubmit={handleCreateJob}
            >
              <h3>Create Job Posting</h3>

              <JobFormFields
                form={jobForm}
                setForm={setJobForm}
                prefix="new-job"
              />

              <button
                type="submit"
                className="recruiter-primary-button"
                disabled={creatingJob}
              >
                {creatingJob
                  ? "Creating Job..."
                  : "Create Job"}
              </button>
            </form>
          )}

          {jobsLoading && (
            <p className="recruiter-info">
              Loading your jobs...
            </p>
          )}

          {!jobsLoading && !jobsError && jobs.length === 0 && (
            <div className="recruiter-empty">
              <span>💼</span>
              <h3>No job postings found</h3>
              <p>
                Jobs created by your recruiter account will
                appear here.
              </p>
            </div>
          )}

          {jobs.length > 0 && (
            <>
              <label
                className="recruiter-field-label"
                htmlFor="recruiter-job-select"
              >
                Choose a job
              </label>

              <select
                id="recruiter-job-select"
                className="recruiter-input"
                value={selectedJobId}
                onChange={(event) =>
                  setSelectedJobId(event.target.value)
                }
              >
                {jobs.map((job, index) => (
                  <option
                    key={getJobId(job) ?? index}
                    value={String(getJobId(job) ?? "")}
                  >
                    {getJobTitle(job)} — {getCompanyName(job)}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Selected job details and edit form */}
          {selectedJob && (
            <div className="recruiter-selected-job">
              <div>
                <h3>{getJobTitle(selectedJob)}</h3>

                <p>
                  {getCompanyName(selectedJob)}
                  {selectedJob.location
                    ? ` · ${selectedJob.location}`
                    : ""}
                </p>
              </div>

              <span
                className={
                  selectedJob.active === false
                    ? "recruiter-status inactive"
                    : "recruiter-status"
                }
              >
                {selectedJob.active === false
                  ? "INACTIVE"
                  : "JOB POSTING"}
              </span>

              <div className="recruiter-job-meta">
                {selectedJob.jobType && (
                  <span>
                    Type: {selectedJob.jobType}
                  </span>
                )}

                {selectedJob.minimumCgpa != null && (
                  <span>
                    Minimum CGPA: {selectedJob.minimumCgpa}
                  </span>
                )}

                {selectedJob.graduationYear != null && (
                  <span>
                    Graduation year: {selectedJob.graduationYear}
                  </span>
                )}

                {selectedJob.salaryMin != null &&
                  selectedJob.salaryMax != null && (
                    <span>
                      Salary: {selectedJob.salaryMin}–
                      {selectedJob.salaryMax}
                    </span>
                  )}
              </div>

              <div className="recruiter-job-edit-toolbar">
                <button
                  type="button"
                  className="recruiter-secondary-button"
                  onClick={() => {
                    if (
                      editingJobId ===
                      String(getJobId(selectedJob))
                    ) {
                      setEditingJobId(null);
                      setEditJobError("");
                    } else {
                      handleStartEditJob(selectedJob);
                    }
                  }}
                >
                  {editingJobId ===
                  String(getJobId(selectedJob))
                    ? "Cancel Edit"
                    : "✎ Edit Selected Job"}
                </button>
              </div>

              {editJobMessage && (
                <p className="recruiter-success" role="status">
                  {editJobMessage}
                </p>
              )}

              {editJobError && (
                <div className="recruiter-error" role="alert">
                  {editJobError}
                </div>
              )}

              {editingJobId ===
                String(getJobId(selectedJob)) && (
                <form
                  className="recruiter-edit-job-form"
                  onSubmit={handleSaveJobEdit}
                >
                  <h3>Edit Job Details</h3>

                  <JobFormFields
                    form={editJobForm}
                    setForm={setEditJobForm}
                    prefix="edit-job"
                  />

                  <div className="recruiter-applicant-actions">
                    <button
                      type="submit"
                      className="recruiter-primary-button"
                      disabled={savingJobEdit}
                    >
                      {savingJobEdit
                        ? "Saving Changes..."
                        : "Save Job Changes"}
                    </button>

                    <button
                      type="button"
                      className="recruiter-secondary-button"
                      disabled={savingJobEdit}
                      onClick={() => {
                        setEditingJobId(null);
                        setEditJobError("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>

        {/* Applicants */}
        <section className="recruiter-panel">
          <div className="recruiter-panel-heading">
            <div>
              <h2>Applicants</h2>
              <p>
                Review candidates and update their application
                status.
              </p>
            </div>

            {selectedJobId && (
              <button
                type="button"
                className="recruiter-secondary-button"
                onClick={() =>
                  loadApplications(selectedJobId)
                }
                disabled={applicationsLoading}
              >
                {applicationsLoading
                  ? "Loading..."
                  : "↻ Refresh Applicants"}
              </button>
            )}
          </div>

          {applicationsLoading && (
            <p className="recruiter-info">
              Loading applicants...
            </p>
          )}

          {applicationsError && (
            <div className="recruiter-error" role="alert">
              {applicationsError}
            </div>
          )}

          {!applicationsLoading &&
            !applicationsError &&
            selectedJobId &&
            applications.length === 0 && (
              <div className="recruiter-empty">
                <span>👥</span>
                <h3>No applicants yet</h3>
                <p>
                  Applications for the selected job will
                  appear here.
                </p>
              </div>
            )}

          {!applicationsLoading &&
            !applicationsError &&
            applications.length > 0 && (
              <div className="recruiter-applicant-list">
                {applications.map((application, index) => {
                  const applicationId =
                    getApplicationId(application);

                  const student =
                    getStudentDetails(application);

                  const currentStatus =
                    getApplicationStatus(application);

                  const selectedStatus =
                    statusDrafts[applicationId] ??
                    currentStatus;

                  const noteValue =
                    recruiterNotes[applicationId] ??
                    application?.recruiterNote ??
                    "";

                  const isSaving =
                    savingApplicationId === applicationId;

                  const isScheduling =
                    schedulingApplicationId === applicationId;

                  const interviewDraft =
                    getInterviewDraft(applicationId);

                  const interviewFormOpen =
                    String(openInterviewFor) ===
                    String(applicationId);

                  const statusOptions =
                    STATUS_OPTIONS.includes(currentStatus)
                      ? STATUS_OPTIONS
                      : [currentStatus, ...STATUS_OPTIONS];

                  return (
                    <article
                      className="recruiter-applicant-card"
                      key={applicationId ?? index}
                    >
                      <div className="recruiter-applicant-header">
                        <div className="recruiter-avatar">
                          {student.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="recruiter-applicant-identity">
                          <h3>{student.name}</h3>
                          <p>{student.email}</p>

                          <span className="recruiter-current-status">
                            {currentStatus.replaceAll("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div className="recruiter-candidate-details">
                        <p>
                          <strong>Application ID:</strong>{" "}
                          {applicationId ?? "Not available"}
                        </p>

                        {student.cgpa != null && (
                          <p>
                            <strong>CGPA:</strong> {student.cgpa}
                          </p>
                        )}

                        {student.graduationYear != null && (
                          <p>
                            <strong>Graduation year:</strong>{" "}
                            {student.graduationYear}
                          </p>
                        )}

                        {application.appliedAt && (
                          <p>
                            <strong>Applied at:</strong>{" "}
                            {new Date(
                              application.appliedAt
                            ).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="recruiter-edit-status">
                        <div className="recruiter-form-field">
                          <label
                            htmlFor={`status-${applicationId}`}
                          >
                            Application Status
                          </label>

                          <select
                            id={`status-${applicationId}`}
                            className="recruiter-input"
                            value={selectedStatus}
                            onChange={(event) =>
                              setStatusDrafts((previous) => ({
                                ...previous,
                                [applicationId]:
                                  event.target.value,
                              }))
                            }
                          >
                            {statusOptions.map((status) => (
                              <option
                                key={status}
                                value={status}
                              >
                                {status.replaceAll("_", " ")}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="recruiter-form-field">
                          <label
                            htmlFor={`note-${applicationId}`}
                          >
                            Recruiter Note
                          </label>

                          <textarea
                            id={`note-${applicationId}`}
                            className="recruiter-input recruiter-textarea"
                            value={noteValue}
                            onChange={(event) =>
                              setRecruiterNotes((previous) => ({
                                ...previous,
                                [applicationId]:
                                  event.target.value,
                              }))
                            }
                            placeholder="Add feedback or an internal note..."
                            rows={3}
                          />
                        </div>

                        <div className="recruiter-applicant-actions">
                          <button
                            type="button"
                            className="recruiter-primary-button"
                            disabled={
                              applicationId == null ||
                              isSaving ||
                              selectedStatus === "WITHDRAWN"
                            }
                            onClick={() =>
                              handleUpdateStatus(application)
                            }
                          >
                            {isSaving
                              ? "Saving..."
                              : "Save Status"}
                          </button>

                          <button
                            type="button"
                            className="recruiter-secondary-button"
                            disabled={
                              applicationId == null ||
                              isScheduling
                            }
                            onClick={() =>
                              setOpenInterviewFor(
                                interviewFormOpen
                                  ? null
                                  : applicationId
                              )
                            }
                          >
                            {interviewFormOpen
                              ? "Close Interview Form"
                              : "Schedule Interview"}
                          </button>
                        </div>
                      </div>

                      {applicationMessages[applicationId] && (
                        <p
                          className="recruiter-success"
                          role="status"
                        >
                          {applicationMessages[applicationId]}
                        </p>
                      )}

                      {applicationErrors[applicationId] && (
                        <p
                          className="recruiter-error-text"
                          role="alert"
                        >
                          {applicationErrors[applicationId]}
                        </p>
                      )}

                      {interviewMessages[applicationId] && (
                        <p
                          className="recruiter-success"
                          role="status"
                        >
                          {interviewMessages[applicationId]}
                        </p>
                      )}

                      {interviewErrors[applicationId] && (
                        <p
                          className="recruiter-error-text"
                          role="alert"
                        >
                          {interviewErrors[applicationId]}
                        </p>
                      )}

                      {/* Interview form */}
                      {interviewFormOpen && (
                        <form
                          className="recruiter-interview-form"
                          onSubmit={(event) =>
                            handleScheduleInterview(
                              event,
                              application
                            )
                          }
                        >
                          <h4>Schedule Interview</h4>

                          <div className="recruiter-form-field">
                            <label
                              htmlFor={`interview-time-${applicationId}`}
                            >
                              Interview Date and Time
                            </label>

                            <input
                              id={`interview-time-${applicationId}`}
                              type="datetime-local"
                              className="recruiter-input"
                              value={
                                interviewDraft.interviewDateTime
                              }
                              onChange={(event) =>
                                updateInterviewDraft(
                                  applicationId,
                                  "interviewDateTime",
                                  event.target.value
                                )
                              }
                              required
                            />
                          </div>

                          <div className="recruiter-form-field">
                            <label
                              htmlFor={`interview-mode-${applicationId}`}
                            >
                              Interview Mode
                            </label>

                            <select
                              id={`interview-mode-${applicationId}`}
                              className="recruiter-input"
                              value={interviewDraft.mode}
                              onChange={(event) =>
                                updateInterviewDraft(
                                  applicationId,
                                  "mode",
                                  event.target.value
                                )
                              }
                              required
                            >
                              <option value="ONLINE">ONLINE</option>
                              <option value="OFFLINE">OFFLINE</option>
                            </select>
                          </div>

                          <div className="recruiter-form-field">
                            <label
                              htmlFor={`interview-link-${applicationId}`}
                            >
                              Meeting Link or Location
                            </label>

                            <input
                              id={`interview-link-${applicationId}`}
                              className="recruiter-input"
                              value={interviewDraft.locationOrLink}
                              onChange={(event) =>
                                updateInterviewDraft(
                                  applicationId,
                                  "locationOrLink",
                                  event.target.value
                                )
                              }
                              placeholder="Meeting URL or venue"
                            />
                          </div>

                          <div className="recruiter-form-field">
                            <label
                              htmlFor={`interview-notes-${applicationId}`}
                            >
                              Interview Notes
                            </label>

                            <textarea
                              id={`interview-notes-${applicationId}`}
                              className="recruiter-input recruiter-textarea"
                              value={interviewDraft.notes}
                              onChange={(event) =>
                                updateInterviewDraft(
                                  applicationId,
                                  "notes",
                                  event.target.value
                                )
                              }
                              placeholder="Agenda or instructions for the candidate"
                              rows={3}
                            />
                          </div>

                          <button
                            type="submit"
                            className="recruiter-primary-button"
                            disabled={isScheduling}
                          >
                            {isScheduling
                              ? "Scheduling..."
                              : "Confirm Interview"}
                          </button>
                        </form>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
        </section>
      </section>
    </main>
  );
}

export default RecruiterDashboard;