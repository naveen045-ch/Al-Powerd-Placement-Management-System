
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";
import "./AdminDashboard.css";
import MyProfile from "./MyProfile";

const ROLE_FILTERS = [
  { id: "ALL", label: "All users" },
  { id: "STUDENT", label: "Students" },
  { id: "RECRUITER", label: "Recruiters" },
  { id: "PLACEMENT_OFFICER", label: "Placement officers" },
  { id: "ADMIN", label: "Admins" },
];

const ROLE_OPTIONS = [
  "STUDENT",
  "RECRUITER",
  "PLACEMENT_OFFICER",
  "ADMIN",
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

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  for (const key of [
    "users",
    "content",
    "items",
    "results",
    "data",
  ]) {
    if (Array.isArray(data[key])) return data[key];
  }

  return [];
}

function prettifyRole(role) {
  return String(role || "UNKNOWN").replaceAll("_", " ");
}

function getCurrentEmailFromToken() {
  try {
    const token = localStorage.getItem("accessToken");

    if (!token) return "";

    const payloadPart = token.split(".")[1];

    if (!payloadPart) return "";

    const base64 = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = base64.padEnd(
      Math.ceil(base64.length / 4) * 4,
      "="
    );

    const payload = JSON.parse(atob(padded));

    const identity =
      payload.email ||
      payload.preferred_username ||
      payload.username ||
      payload.sub;

    return typeof identity === "string" &&
      identity.includes("@")
      ? identity.toLowerCase()
      : "";
  } catch {
    return "";
  }
}

function MetricCard({ label, value, hint, icon, tone }) {
  return (
    <article className={`ad-metric ad-metric-${tone}`}>
      <div className="ad-metric-head">
        <span>{label}</span>

        <span className="ad-metric-icon" aria-hidden="true">
          {icon}
        </span>
      </div>

      <strong>{value ?? 0}</strong>
      <small>{hint}</small>
    </article>
  );
}

function RoleChip({ roles }) {
  const safeRoles = Array.isArray(roles) ? roles : [];

  if (!safeRoles.length) {
    return (
      <span className="ad-role-chip">
        No role
      </span>
    );
  }

  return (
    <div className="ad-role-chips">
      {safeRoles.map((role) => (
        <span
          className={`ad-role-chip ad-role-${String(
            role
          ).toLowerCase()}`}
          key={role}
        >
          {prettifyRole(role)}
        </span>
      ))}
    </div>
  );
}

function AdminDashboard({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({});

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [roleDrafts, setRoleDrafts] = useState({});

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [mutationErrors, setMutationErrors] = useState({});
  const [mutationMessages, setMutationMessages] = useState({});

  const [savingRoleId, setSavingRoleId] = useState(null);
  const [changingStatusId, setChangingStatusId] = useState(null);

  const [lastUpdated, setLastUpdated] = useState("");

  // Admin account creation form
  const emptyCreateForm = {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "STUDENT",
    college: "",
    branch: "",
    semester: "",
    cgpa: "",
    graduationYear: "",
    companyName: "",
    industry: "",
    website: "",
    location: "",
    designation: "",
  };

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createMessage, setCreateMessage] = useState("");

  const currentEmail = useMemo(
    () => getCurrentEmailFromToken(),
    []
  );

  // Load registered users and system statistics.
  const loadAdminDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const [usersResult, dashboardResult] =
      await Promise.allSettled([
        api.get("/api/admin/users"),
        api.get("/api/admin/dashboard"),
      ]);

    const requestErrors = [];

    if (usersResult.status === "fulfilled") {
      const userList = normalizeList(
        usersResult.value.data
      );

      setUsers(userList);

      setRoleDrafts((previous) => {
        const next = { ...previous };

        userList.forEach((user) => {
          const id = user.userId;

          if (id != null && next[id] === undefined) {
            next[id] = Array.isArray(user.roles)
              ? user.roles[0] || "STUDENT"
              : "STUDENT";
          }
        });

        return next;
      });
    } else {
      setUsers([]);

      requestErrors.push(
        getApiError(
          usersResult.reason,
          "Could not load registered users."
        )
      );
    }

    if (dashboardResult.status === "fulfilled") {
      const data = dashboardResult.value.data;

      setSummary(
        data && typeof data === "object" ? data : {}
      );
    } else {
      setSummary({});

      requestErrors.push(
        getApiError(
          dashboardResult.reason,
          "Could not load admin statistics."
        )
      );
    }

    setLoadError(requestErrors.join(" "));
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAdminDashboard();
  }, [loadAdminDashboard]);

  // Calculate fallback counts from the user list.
  const counts = useMemo(() => {
    const derived = {
      totalUsers: users.length,
      totalStudents: 0,
      totalRecruiters: 0,
      totalPlacementOfficers: 0,
      totalAdmins: 0,
      enabledUsers: 0,
      disabledUsers: 0,
    };

    users.forEach((user) => {
      const roles = Array.isArray(user.roles)
        ? user.roles
        : [];

      if (roles.includes("STUDENT")) {
        derived.totalStudents += 1;
      }

      if (roles.includes("RECRUITER")) {
        derived.totalRecruiters += 1;
      }

      if (roles.includes("PLACEMENT_OFFICER")) {
        derived.totalPlacementOfficers += 1;
      }

      if (roles.includes("ADMIN")) {
        derived.totalAdmins += 1;
      }

      if (user.enabled === true) {
        derived.enabledUsers += 1;
      }

      if (user.enabled === false) {
        derived.disabledUsers += 1;
      }
    });

    return { ...derived, ...summary };
  }, [users, summary]);

  // Filter users by role and search term.
  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const roles = Array.isArray(user.roles)
        ? user.roles
        : [];

      const matchesRole =
        activeFilter === "ALL" ||
        roles.includes(activeFilter);

      const searchable = [
        user.fullName,
        user.email,
        user.phone,
        user.userId,
        ...roles,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesRole &&
        (!term || searchable.includes(term))
      );
    });
  }, [users, activeFilter, search]);

  function setUserMessage(userId, message) {
    setMutationMessages((previous) => ({
      ...previous,
      [userId]: message,
    }));
  }

  function setUserError(userId, message) {
    setMutationErrors((previous) => ({
      ...previous,
      [userId]: message,
    }));
  }

  async function refreshSummaryOnly() {
    try {
      const response = await api.get(
        "/api/admin/dashboard"
      );

      if (
        response.data &&
        typeof response.data === "object"
      ) {
        setSummary(response.data);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      // Keep the current summary if refresh fails.
    }
  }

  // Enable or disable a user account.
  async function handleToggleStatus(user) {
    if (user.userId == null) return;

    if (
      currentEmail &&
      String(user.email || "").toLowerCase() === currentEmail
    ) {
      setUserError(
        user.userId,
        "For safety, you cannot change your own account status here."
      );
      return;
    }

    const nextEnabled = user.enabled !== true;
    const action = nextEnabled ? "enable" : "disable";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} the account for ${
        user.fullName || user.email
      }?`
    );

    if (!confirmed) return;

    setChangingStatusId(user.userId);
    setUserError(user.userId, "");
    setUserMessage(user.userId, "");

    try {
      const response = await api.patch(
        `/api/admin/users/${user.userId}/status`,
        { enabled: nextEnabled }
      );

      const updatedUser = response.data;

      setUsers((previous) =>
        previous.map((item) =>
          item.userId === user.userId
            ? {
                ...item,
                ...(updatedUser &&
                typeof updatedUser === "object"
                  ? updatedUser
                  : {}),
                enabled: nextEnabled,
              }
            : item
        )
      );

      setUserMessage(
        user.userId,
        `Account ${
          nextEnabled ? "enabled" : "disabled"
        } successfully.`
      );

      await refreshSummaryOnly();
    } catch (error) {
      setUserError(
        user.userId,
        getApiError(
          error,
          `Unable to ${action} this account.`
        )
      );
    } finally {
      setChangingStatusId(null);
    }
  }

  // Update one user's role.
  async function handleSaveRole(user) {
    if (user.userId == null) return;

    const nextRole = roleDrafts[user.userId];

    const currentRoles = Array.isArray(user.roles)
      ? user.roles
      : [];

    if (
      !nextRole ||
      (currentRoles.length === 1 &&
        currentRoles[0] === nextRole)
    ) {
      return;
    }

    if (
      currentEmail &&
      String(user.email || "").toLowerCase() === currentEmail
    ) {
      setUserError(
        user.userId,
        "For safety, you cannot change your own role here."
      );
      return;
    }

    const confirmed = window.confirm(
      `Change ${user.fullName || user.email}'s role to ${
        prettifyRole(nextRole)
      }? This may change which dashboard they can access.`
    );

    if (!confirmed) return;

    setSavingRoleId(user.userId);
    setUserError(user.userId, "");
    setUserMessage(user.userId, "");

    try {
      const response = await api.patch(
        `/api/admin/users/${user.userId}/role`,
        { role: nextRole }
      );

      const updatedUser = response.data;

      setUsers((previous) =>
        previous.map((item) =>
          item.userId === user.userId
            ? {
                ...item,
                ...(updatedUser &&
                typeof updatedUser === "object"
                  ? updatedUser
                  : {}),
                roles: Array.isArray(updatedUser?.roles)
                  ? updatedUser.roles
                  : [nextRole],
              }
            : item
        )
      );

      setRoleDrafts((previous) => ({
        ...previous,
        [user.userId]: nextRole,
      }));

      setUserMessage(
        user.userId,
        "User role updated successfully."
      );

      await refreshSummaryOnly();
    } catch (error) {
      setUserError(
        user.userId,
        getApiError(
          error,
          "Unable to update user role."
        )
      );
    } finally {
      setSavingRoleId(null);
    }
  }

  // Handle changes in the create-account form.
  function handleCreateFormChange(event) {
    const { name, value } = event.target;

    setCreateForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setCreateError("");
    setCreateMessage("");
  }

  // Create a Student, Recruiter, or Placement Officer account.
  async function handleCreateUser(event) {
    event.preventDefault();

    if (creatingUser) return;

    setCreatingUser(true);
    setCreateError("");
    setCreateMessage("");

    const payload = {
      fullName: createForm.fullName.trim(),
      email: createForm.email.trim(),
      phone: createForm.phone.trim() || null,
      password: createForm.password,
      role: createForm.role,
    };

    if (createForm.role === "STUDENT") {
      payload.college = createForm.college.trim() || null;
      payload.branch = createForm.branch.trim() || null;
      payload.semester = createForm.semester
        ? Number(createForm.semester)
        : null;
      payload.cgpa = createForm.cgpa
        ? Number(createForm.cgpa)
        : null;
      payload.graduationYear = createForm.graduationYear
        ? Number(createForm.graduationYear)
        : null;
    }

    if (createForm.role === "RECRUITER") {
      payload.companyName = createForm.companyName.trim();
      payload.industry = createForm.industry.trim() || null;
      payload.website = createForm.website.trim() || null;
      payload.location = createForm.location.trim() || null;
      payload.designation = createForm.designation.trim() || null;
    }

    try {
      const response = await api.post("/api/admin/users", payload);
      const createdUser = response.data;

      if (createdUser && typeof createdUser === "object") {
        setUsers((previous) => {
          const withoutDuplicate = previous.filter(
            (user) => user.userId !== createdUser.userId
          );
          return [createdUser, ...withoutDuplicate];
        });

        if (createdUser.userId != null) {
          setRoleDrafts((previous) => ({
            ...previous,
            [createdUser.userId]: createForm.role,
          }));
        }
      }

      setCreateMessage(
        `${prettifyRole(createForm.role)} account created successfully.`
      );

      setCreateForm({ ...emptyCreateForm });
      setActiveFilter("ALL");
      setSearch("");

      await refreshSummaryOnly();
    } catch (error) {
      setCreateError(
        getApiError(
          error,
          "Unable to create this account. Please try again."
        )
      );
    } finally {
      setCreatingUser(false);
    }
  }

  return (
    <main className="ad-page">
      <header className="ad-topbar">
        <div className="ad-brand">
          <div className="ad-brand-logo">P</div>

          <div>
            <strong>PlacementPro</strong>
            <span>ADMINISTRATION CONSOLE</span>
          </div>
        </div>

        <div className="ad-top-actions">

          <MyProfile role="ADMIN" />

          <span className="ad-admin-label">
            <span />
            System administrator
          </span>

          <button
            type="button"
            className="ad-logout"
            onClick={onLogout}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="ad-content">
        <section className="ad-heading-row">
          <div>
            <span className="ad-eyebrow">
              SYSTEM CONTROL CENTER
            </span>

            <h1>Admin Dashboard</h1>

            <p>
              Manage accounts, review platform activity,
              and control user access.
            </p>
          </div>

          <div className="ad-heading-actions">
            <button
              type="button"
              className="ad-create-toggle"
              onClick={() => {
                setShowCreateForm((previous) => !previous);
                setCreateError("");
                setCreateMessage("");
              }}
              aria-expanded={showCreateForm}
              aria-controls="ad-create-user-panel"
            >
              <span aria-hidden="true">＋</span>
              {showCreateForm ? "Close form" : "Create account"}
            </button>

            {lastUpdated && (
              <span className="ad-updated">
                Updated {lastUpdated}
              </span>
            )}

            <button
              type="button"
              className="ad-refresh"
              onClick={loadAdminDashboard}
              disabled={loading}
            >
              <span>↻</span>
              {loading ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </section>

        {loadError && (
          <div className="ad-alert" role="alert">
            <strong>
              Some admin data could not be loaded.
            </strong>

            <p>{loadError}</p>

            <button
              type="button"
              onClick={loadAdminDashboard}
            >
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="ad-loading">
            <span />
            Loading users and system statistics…
          </div>
        )}

        <section
          className="ad-metrics-grid"
          aria-label="System statistics"
        >
          <MetricCard
            label="Total users"
            value={counts.totalUsers}
            hint="Registered accounts"
            icon="♙"
            tone="blue"
          />

          <MetricCard
            label="Students"
            value={counts.totalStudents}
            hint="Student accounts"
            icon="▤"
            tone="violet"
          />

          <MetricCard
            label="Recruiters"
            value={counts.totalRecruiters}
            hint="Recruiter accounts"
            icon="▥"
            tone="cyan"
          />

          <MetricCard
            label="Placement officers"
            value={counts.totalPlacementOfficers}
            hint="Officer accounts"
            icon="▦"
            tone="amber"
          />

          <MetricCard
            label="Admins"
            value={counts.totalAdmins}
            hint="Administrator accounts"
            icon="⚙"
            tone="rose"
          />

          <MetricCard
            label="Enabled accounts"
            value={counts.enabledUsers}
            hint={`${counts.disabledUsers ?? 0} disabled accounts`}
            icon="✓"
            tone="green"
          />
        </section>

        {/* CREATE ACCOUNT FORM */}

        {showCreateForm && (
          <section
            className="ad-create-panel"
            id="ad-create-user-panel"
            aria-labelledby="ad-create-user-title"
          >
            <div className="ad-create-heading">
              <div>
                <span className="ad-create-eyebrow">
                  ACCOUNT PROVISIONING
                </span>

                <h2 id="ad-create-user-title">
                  Create a new account
                </h2>

                <p>
                  Add a student, recruiter, or placement officer to PlacementPro.
                </p>
              </div>

              <span className="ad-create-secure">
                Admin access only
              </span>
            </div>

            <form
              className="ad-create-form"
              onSubmit={handleCreateUser}
            >
              <div className="ad-form-section-title">
                Basic information
              </div>

              <div className="ad-form-grid">
                <label className="ad-form-field">
                  <span>Full name <b>*</b></span>

                  <input
                    name="fullName"
                    value={createForm.fullName}
                    onChange={handleCreateFormChange}
                    placeholder="Enter full name"
                    maxLength={120}
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="ad-form-field">
                  <span>Email address <b>*</b></span>

                  <input
                    type="email"
                    name="email"
                    value={createForm.email}
                    onChange={handleCreateFormChange}
                    placeholder="name@example.com"
                    maxLength={180}
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="ad-form-field">
                  <span>Phone number</span>

                  <input
                    type="tel"
                    name="phone"
                    value={createForm.phone}
                    onChange={handleCreateFormChange}
                    placeholder="Enter phone number"
                    maxLength={30}
                    autoComplete="tel"
                  />
                </label>

                <label className="ad-form-field">
                  <span>Temporary password <b>*</b></span>

                  <input
                    type="password"
                    name="password"
                    value={createForm.password}
                    onChange={handleCreateFormChange}
                    placeholder="At least 8 characters"
                    minLength={8}
                    maxLength={64}
                    autoComplete="new-password"
                    required
                  />
                </label>

                <label className="ad-form-field">
                  <span>Account type <b>*</b></span>

                  <select
                    name="role"
                    value={createForm.role}
                    onChange={handleCreateFormChange}
                    required
                  >
                    <option value="STUDENT">Student</option>
                    <option value="RECRUITER">Recruiter</option>
                    <option value="PLACEMENT_OFFICER">
                      Placement Officer
                    </option>
                  </select>
                </label>
              </div>

              {/* STUDENT DETAILS */}

              {createForm.role === "STUDENT" && (
                <>
                  <div className="ad-form-section-title ad-form-section-spaced">
                    Student profile
                  </div>

                  <div className="ad-form-grid">
                    <label className="ad-form-field">
                      <span>College</span>

                      <input
                        name="college"
                        value={createForm.college}
                        onChange={handleCreateFormChange}
                        placeholder="College / institute name"
                        maxLength={255}
                      />
                    </label>

                    <label className="ad-form-field">
                      <span>Branch</span>

                      <input
                        name="branch"
                        value={createForm.branch}
                        onChange={handleCreateFormChange}
                        placeholder="e.g. Computer Science"
                        maxLength={100}
                      />
                    </label>

                    <label className="ad-form-field">
                      <span>Semester</span>

                      <input
                        type="number"
                        name="semester"
                        value={createForm.semester}
                        onChange={handleCreateFormChange}
                        placeholder="1–8"
                        min={1}
                        max={8}
                        step={1}
                      />
                    </label>

                    <label className="ad-form-field">
                      <span>CGPA</span>

                      <input
                        type="number"
                        name="cgpa"
                        value={createForm.cgpa}
                        onChange={handleCreateFormChange}
                        placeholder="e.g. 8.2"
                        min={0}
                        max={10}
                        step="0.01"
                      />
                    </label>

                    <label className="ad-form-field">
                      <span>Graduation year</span>

                      <input
                        type="number"
                        name="graduationYear"
                        value={createForm.graduationYear}
                        onChange={handleCreateFormChange}
                        placeholder="e.g. 2027"
                        min={2000}
                        max={2100}
                        step={1}
                      />
                    </label>
                  </div>
                </>
              )}

              {/* RECRUITER DETAILS */}

              {createForm.role === "RECRUITER" && (
                <>
                  <div className="ad-form-section-title ad-form-section-spaced">
                    Recruiter and company details
                  </div>

                  <div className="ad-form-grid">
                    <label className="ad-form-field">
                      <span>Company name <b>*</b></span>

                      <input
                        name="companyName"
                        value={createForm.companyName}
                        onChange={handleCreateFormChange}
                        placeholder="Registered company name"
                        maxLength={255}
                        required
                      />
                    </label>

                    <label className="ad-form-field">
                      <span>Designation</span>

                      <input
                        name="designation"
                        value={createForm.designation}
                        onChange={handleCreateFormChange}
                        placeholder="e.g. HR Manager"
                        maxLength={120}
                      />
                    </label>

                    <label className="ad-form-field">
                      <span>Industry</span>

                      <input
                        name="industry"
                        value={createForm.industry}
                        onChange={handleCreateFormChange}
                        placeholder="e.g. IT / Software"
                        maxLength={120}
                      />
                    </label>

                    <label className="ad-form-field">
                      <span>Company website</span>

                      <input
                        type="url"
                        name="website"
                        value={createForm.website}
                        onChange={handleCreateFormChange}
                        placeholder="https://example.com"
                        maxLength={255}
                      />
                    </label>

                    <label className="ad-form-field">
                      <span>Company location</span>

                      <input
                        name="location"
                        value={createForm.location}
                        onChange={handleCreateFormChange}
                        placeholder="City, state"
                        maxLength={255}
                      />
                    </label>
                  </div>
                </>
              )}

              {/* PLACEMENT OFFICER DETAILS */}

              {createForm.role === "PLACEMENT_OFFICER" && (
                <div className="ad-create-note">
                  Placement Officer accounts currently use the common
                  account details only. The supplied backend model does not
                  include a separate placement-officer profile entity.
                </div>
              )}

              {createError && (
                <div
                  className="ad-create-feedback is-error"
                  role="alert"
                >
                  {createError}
                </div>
              )}

              {createMessage && (
                <div
                  className="ad-create-feedback is-success"
                  role="status"
                >
                  {createMessage}
                </div>
              )}

              <div className="ad-create-actions">
                <p>
                  The account will be enabled. Its password is encoded by the backend.
                </p>

                <button
                  type="submit"
                  className="ad-create-submit"
                  disabled={creatingUser}
                >
                  {creatingUser
                    ? "Creating account…"
                    : "Create account"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* USER MANAGEMENT */}

        <section className="ad-users-panel">
          <div className="ad-panel-heading">
            <div>
              <h2>User management</h2>

              <p>
                Search accounts, adjust a user's role,
                or enable and disable account access.
              </p>
            </div>

            <span className="ad-record-count">
              {visibleUsers.length} of {users.length} users
            </span>
          </div>

          <div className="ad-toolbar">
            <div
              className="ad-filter-tabs"
              role="tablist"
              aria-label="Filter users by role"
            >
              {ROLE_FILTERS.map((filter) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === filter.id}
                  className={
                    activeFilter === filter.id
                      ? "is-active"
                      : ""
                  }
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}

                  {filter.id === "ALL" && (
                    <span>{users.length}</span>
                  )}
                </button>
              ))}
            </div>

            <label className="ad-search">
              <span aria-hidden="true">⌕</span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, email, phone, role…"
                aria-label="Search users"
              />
            </label>
          </div>

          {visibleUsers.length === 0 ? (
            <div className="ad-empty">
              <span>⌕</span>

              <h3>
                {loading
                  ? "Loading accounts"
                  : "No users found"}
              </h3>

              <p>
                {search.trim()
                  ? "Try a different search term."
                  : "No accounts match this role filter."}
              </p>
            </div>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Current role</th>
                    <th>Account status</th>
                    <th>Change role</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleUsers.map((user) => {
                    const roles = Array.isArray(user.roles)
                      ? user.roles
                      : [];

                    const currentRole =
                      roles.length === 1 ? roles[0] : "";

                    const selectedRole =
                      roleDrafts[user.userId] ||
                      currentRole ||
                      "STUDENT";

                    const ownAccount =
                      currentEmail &&
                      String(user.email || "").toLowerCase() ===
                        currentEmail;

                    const roleChanged =
                      !currentRole ||
                      selectedRole !== currentRole ||
                      roles.length !== 1;

                    return (
                      <tr key={user.userId}>
                        <td>
                          <div className="ad-user-cell">
                            <span className="ad-avatar">
                              {String(user.fullName || "U")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <div>
                              <strong>
                                {user.fullName || "Unnamed user"}
                              </strong>

                              <small>
                                ID: {user.userId ?? "—"}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong className="ad-email">
                            {user.email || "—"}
                          </strong>

                          <small className="ad-phone">
                            {user.phone || "No phone number"}
                          </small>
                        </td>

                        <td>
                          <RoleChip roles={roles} />
                        </td>

                        <td>
                          <span
                            className={`ad-status ${
                              user.enabled
                                ? "is-enabled"
                                : "is-disabled"
                            }`}
                          >
                            <span />
                            {user.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>

                        <td>
                          <div className="ad-role-editor">
                            <select
                              aria-label={`Select role for ${
                                user.fullName || user.email
                              }`}
                              value={selectedRole}
                              disabled={
                                Boolean(ownAccount) ||
                                savingRoleId === user.userId
                              }
                              onChange={(event) =>
                                setRoleDrafts((previous) => ({
                                  ...previous,
                                  [user.userId]:
                                    event.target.value,
                                }))
                              }
                            >
                              {ROLE_OPTIONS.map((roleOption) => (
                                <option
                                  key={roleOption}
                                  value={roleOption}
                                >
                                  {prettifyRole(roleOption)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td>
                          <div className="ad-actions-cell">
                            <button
                              type="button"
                              className="ad-save-role"
                              disabled={
                                Boolean(ownAccount) ||
                                !roleChanged ||
                                savingRoleId === user.userId
                              }
                              onClick={() => handleSaveRole(user)}
                            >
                              {savingRoleId === user.userId
                                ? "Saving…"
                                : "Save role"}
                            </button>

                            <button
                              type="button"
                              className={`ad-toggle ${
                                user.enabled
                                  ? "ad-disable-btn"
                                  : "ad-enable-btn"
                              }`}
                              disabled={
                                Boolean(ownAccount) ||
                                changingStatusId === user.userId
                              }
                              onClick={() =>
                                handleToggleStatus(user)
                              }
                              title={
                                ownAccount
                                  ? "You cannot change your own account status here"
                                  : undefined
                              }
                            >
                              {changingStatusId === user.userId
                                ? "Updating…"
                                : user.enabled
                                  ? "Disable"
                                  : "Enable"}
                            </button>
                          </div>

                          {ownAccount && (
                            <small className="ad-own-note">
                              Current account protected
                            </small>
                          )}

                          {mutationMessages[user.userId] && (
                            <small
                              className="ad-success-text"
                              role="status"
                            >
                              {mutationMessages[user.userId]}
                            </small>
                          )}

                          {mutationErrors[user.userId] && (
                            <small
                              className="ad-error-text"
                              role="alert"
                            >
                              {mutationErrors[user.userId]}
                            </small>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="ad-panel-footer">
            <span>
              Account changes are applied through secured admin APIs.
            </span>

            <span>{users.length} total accounts</span>
          </div>
        </section>

        <footer className="ad-footer">
          <span>
            PlacementPro{" "}
            <span className="ad-footer-dot">•</span>{" "}
            Administration console
          </span>

          <span>
            Use role and account controls carefully.
          </span>
        </footer>
      </div>
    </main>
  );
}

export default AdminDashboard;
