import { useCallback, useEffect, useState } from "react";
import api from "../api";
import "./MyProfile.css";

const PROFICIENCY_OPTIONS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
];

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  college: "",
  branch: "",
  semester: "",
  cgpa: "",
  graduationYear: "",
  githubUrl: "",
  linkedinUrl: "",
  bio: "",
  designation: "",
};

function normalizeRole(role) {
  return String(role || "")
    .toUpperCase()
    .replace(/^ROLE_/, "");
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  for (const key of ["content", "items", "results", "data", "skills"]) {
    if (Array.isArray(data[key])) return data[key];
  }

  return [];
}

function getError(error, fallback) {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) return data;

  return (
    data?.message ||
    data?.error ||
    data?.detail ||
    error?.message ||
    fallback
  );
}

function mapProfileToForm(profile) {
  const student = profile?.studentProfile || {};
  const recruiter = profile?.recruiterProfile || {};

  return {
    fullName: profile?.fullName || "",
    phone: profile?.phone || "",
    college: student.college || "",
    branch: student.branch || "",
    semester: student.semester ?? "",
    cgpa: student.cgpa ?? "",
    graduationYear: student.graduationYear ?? "",
    githubUrl: student.githubUrl || "",
    linkedinUrl: student.linkedinUrl || "",
    bio: student.bio || "",
    designation: recruiter.designation || "",
  };
}

function ProfileField({ label, name, value, onChange, type = "text", ...props }) {
  return (
    <label className="mp-field">
      <span>{label}</span>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        {...props}
      />
    </label>
  );
}

export default function MyProfile({ role }) {
  const normalizedRole = normalizeRole(role);
  const isStudent = normalizedRole === "STUDENT";
  const isRecruiter = normalizedRole === "RECRUITER";

  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [skills, setSkills] = useState([]);
  const [skillCatalog, setSkillCatalog] = useState([]);
  const [skillDrafts, setSkillDrafts] = useState({});

  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSkill, setSavingSkill] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [skillError, setSkillError] = useState("");
  const [skillMessage, setSkillMessage] = useState("");

  const [newSkill, setNewSkill] = useState({
    skillId: "",
    proficiency: "BEGINNER",
    yearsOfExperience: "0",
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setProfileError("");
    setProfileMessage("");
    setSkillError("");

    try {
      const response = await api.get("/api/users/me/profile");
      const data = response.data || {};

      setProfile(data);
      setForm(mapProfileToForm(data));

      if (isStudent) {
        const [skillsResult, catalogResult] = await Promise.allSettled([
          api.get("/api/users/me/skills"),
          api.get("/api/users/me/skills/catalog"),
        ]);

        if (skillsResult.status === "fulfilled") {
          const list = normalizeList(skillsResult.value.data);
          setSkills(list);
          const drafts = {};
          list.forEach((item) => {
            drafts[item.id] = {
              proficiency: item.proficiency || "BEGINNER",
              yearsOfExperience: item.yearsOfExperience ?? 0,
            };
          });
          setSkillDrafts(drafts);
        } else {
          setSkills([]);
          setSkillError(
            getError(skillsResult.reason, "Could not load your skills.")
          );
        }

        if (catalogResult.status === "fulfilled") {
          setSkillCatalog(normalizeList(catalogResult.value.data));
        } else {
          setSkillCatalog([]);
          setSkillError((previous) =>
            [previous, getError(catalogResult.reason, "Could not load skill catalog.")]
              .filter(Boolean)
              .join(" ")
          );
        }
      }
    } catch (error) {
      setProfileError(
        getError(error, "Unable to load your profile.")
      );
    } finally {
      setLoading(false);
    }
  }, [isStudent]);

  useEffect(() => {
    if (isOpen) loadProfile();
  }, [isOpen, loadProfile]);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setProfileError("");
    setProfileMessage("");
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (savingProfile) return;

    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");

    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
    };

    if (isStudent) {
      Object.assign(payload, {
        college: form.college.trim(),
        branch: form.branch.trim(),
        semester: form.semester === "" ? null : Number(form.semester),
        cgpa: form.cgpa === "" ? null : Number(form.cgpa),
        graduationYear:
          form.graduationYear === "" ? null : Number(form.graduationYear),
        githubUrl: form.githubUrl.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
        bio: form.bio.trim(),
      });
    }

    if (isRecruiter) {
      payload.designation = form.designation.trim();
    }

    try {
      const response = await api.put("/api/users/me/profile", payload);
      const updated = response.data || {};
      setProfile(updated);
      setForm(mapProfileToForm(updated));
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(
        getError(error, "Unable to update your profile.")
      );
    } finally {
      setSavingProfile(false);
    }
  }

  function handleNewSkillChange(event) {
    const { name, value } = event.target;
    setNewSkill((previous) => ({ ...previous, [name]: value }));
    setSkillError("");
    setSkillMessage("");
  }

  async function handleAddSkill(event) {
    event.preventDefault();
    if (savingSkill) return;

    if (!newSkill.skillId) {
      setSkillError("Please select a skill.");
      return;
    }

    setSavingSkill(true);
    setSkillError("");
    setSkillMessage("");

    try {
      const response = await api.post("/api/users/me/skills", {
        skillId: Number(newSkill.skillId),
        proficiency: newSkill.proficiency,
        yearsOfExperience: Number(newSkill.yearsOfExperience),
      });

      const added = response.data;
      setSkills((previous) => [
        ...previous.filter((item) => item.id !== added.id),
        added,
      ]);
      setSkillDrafts((previous) => ({
        ...previous,
        [added.id]: {
          proficiency: added.proficiency,
          yearsOfExperience: added.yearsOfExperience,
        },
      }));
      setNewSkill({
        skillId: "",
        proficiency: "BEGINNER",
        yearsOfExperience: "0",
      });
      setSkillMessage("Skill added successfully.");
    } catch (error) {
      setSkillError(getError(error, "Unable to add this skill."));
    } finally {
      setSavingSkill(false);
    }
  }

  function handleSkillDraftChange(skillId, field, value) {
    setSkillDrafts((previous) => ({
      ...previous,
      [skillId]: {
        ...(previous[skillId] || {}),
        [field]: value,
      },
    }));
  }

  async function handleUpdateSkill(skill) {
    const draft = skillDrafts[skill.id];
    if (!draft || savingSkill) return;

    setSavingSkill(true);
    setSkillError("");
    setSkillMessage("");

    try {
      const response = await api.put(
        `/api/users/me/skills/${skill.id}`,
        {
          proficiency: draft.proficiency,
          yearsOfExperience: Number(draft.yearsOfExperience),
        }
      );

      const updated = response.data;
      setSkills((previous) =>
        previous.map((item) => item.id === skill.id ? updated : item)
      );
      setSkillMessage(`${skill.skillName} updated successfully.`);
    } catch (error) {
      setSkillError(getError(error, "Unable to update this skill."));
    } finally {
      setSavingSkill(false);
    }
  }

  async function handleDeleteSkill(skill) {
    const confirmed = window.confirm(
      `Remove ${skill.skillName} from your profile?`
    );
    if (!confirmed || savingSkill) return;

    setSavingSkill(true);
    setSkillError("");
    setSkillMessage("");

    try {
      await api.delete(`/api/users/me/skills/${skill.id}`);
      setSkills((previous) => previous.filter((item) => item.id !== skill.id));
      setSkillDrafts((previous) => {
        const next = { ...previous };
        delete next[skill.id];
        return next;
      });
      setSkillMessage(`${skill.skillName} removed successfully.`);
    } catch (error) {
      setSkillError(getError(error, "Unable to remove this skill."));
    } finally {
      setSavingSkill(false);
    }
  }
    
const completionItems = [
  { label: "Full name", complete: Boolean(form.fullName.trim()) },
  { label: "Phone number", complete: Boolean(form.phone.trim()) },
  { label: "College", complete: Boolean(form.college.trim()) },
  { label: "Branch", complete: Boolean(form.branch.trim()) },
  {
    label: "Semester",
    complete: form.semester !== "" &&
      Number(form.semester) >= 1 &&
      Number(form.semester) <= 8
  },
  {
    label: "CGPA",
    complete: form.cgpa !== "" &&
      Number(form.cgpa) >= 0 &&
      Number(form.cgpa) <= 10
  },
  {
    label: "Graduation year",
    complete: Number(form.graduationYear) >= 2000 &&
      Number(form.graduationYear) <= 2100
  },
  { label: "GitHub URL", complete: Boolean(form.githubUrl.trim()) },
  { label: "LinkedIn URL", complete: Boolean(form.linkedinUrl.trim()) },
  { label: "Bio", complete: Boolean(form.bio.trim()) },
  { label: "At least one skill", complete: skills.length > 0 },
];

const completedItems = completionItems.filter(
  (item) => item.complete
).length;

const completionPercentage = Math.round(
  (completedItems / completionItems.length) * 100
);

const missingItems = completionItems.filter(
  (item) => !item.complete
);

  const company = profile?.company;
  const roles = Array.isArray(profile?.roles) ? profile.roles : [];

  return (
    <>
      <button
        type="button"
        className="mp-launcher"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="mp-launcher-icon" aria-hidden="true">♙</span>
        <span>My Profile</span>
      </button>

      {isOpen && (
        <div className="mp-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}>
          <section
            className="mp-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mp-title"
          >
            <header className="mp-header">
              <div>
                <span className="mp-eyebrow">ACCOUNT SETTINGS</span>
                <h2 id="mp-title">My Profile</h2>
                <p>View and update your PlacementPro profile.</p>
              </div>
              <button
                type="button"
                className="mp-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close profile"
              >
                ×
              </button>
            </header>

            {loading ? (
              <div className="mp-state">Loading your profile…</div>
            ) : profileError && !profile ? (
              <div className="mp-feedback mp-error" role="alert">
                {profileError}
                <button type="button" onClick={loadProfile}>Retry</button>
              </div>
            ) : (
              <div className="mp-content">
                <div className="mp-identity">
                  <div className="mp-avatar">
                    {String(profile?.fullName || "U").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="mp-identity-copy">
                    <strong>{profile?.fullName || "Your name"}</strong>
                    <span>{profile?.email || "Email not available"}</span>
                    <div className="mp-role-list">
                      {roles.map((item) => (
                        <span key={item}>{String(item).replaceAll("_", " ")}</span>
                      ))}
                    </div>
                  </div>
                  
{isStudent && (
  <section
    className="mp-completion-card"
    aria-label="Student profile completion"
  >
    <div className="mp-completion-top">
      <div>
        <span className="mp-completion-eyebrow">
          PROFILE STRENGTH
        </span>

        <h3>Profile completion</h3>

        <p>
          Complete these details to build a stronger placement profile.
        </p>
      </div>

      <strong className="mp-completion-percent">
        {completionPercentage}%
      </strong>
    </div>

    <div
      className="mp-progress-track"
      role="progressbar"
      aria-label="Profile completion"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={completionPercentage}
    >
      <div
        className="mp-progress-fill"
        style={{ width: `${completionPercentage}%` }}
      />
    </div>

    <div className="mp-completion-summary">
      <span>
        {completedItems} of {completionItems.length} details completed
      </span>

      <span>
        {missingItems.length === 0
          ? "Profile complete"
          : `${missingItems.length} remaining`}
      </span>
    </div>

    {missingItems.length > 0 ? (
      <div className="mp-missing-list">
        <strong>Still to add:</strong>

        <div>
          {missingItems.map((item) => (
            <span key={item.label}>
              {item.label}
            </span>
          ))}
        </div>
      </div>
    ) : (
      <p className="mp-completion-done">
        Great! Your student profile is complete.
      </p>
    )}
  </section>
)}

                </div>

                <form className="mp-form" onSubmit={handleSaveProfile}>
                  <h3>Personal information</h3>
                  <div className="mp-grid">
                    <ProfileField
                      label="Full name"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleFormChange}
                      maxLength={120}
                      required
                    />
                    <label className="mp-field">
                      <span>Email address (cannot be changed here)</span>
                      <input value={profile?.email || ""} disabled readOnly />
                    </label>
                    <ProfileField
                      label="Phone number"
                      name="phone"
                      value={form.phone}
                      onChange={handleFormChange}
                      type="tel"
                      maxLength={30}
                    />
                  </div>

                  {isStudent && (
                    <>
                      <h3 className="mp-section-gap">Academic information</h3>
                      <div className="mp-grid">
                        <ProfileField label="College" name="college" value={form.college} onChange={handleFormChange} maxLength={255} />
                        <ProfileField label="Branch" name="branch" value={form.branch} onChange={handleFormChange} maxLength={100} />
                        <ProfileField label="Semester" name="semester" value={form.semester} onChange={handleFormChange} type="number" min="1" max="8" step="1" />
                        <ProfileField label="CGPA" name="cgpa" value={form.cgpa} onChange={handleFormChange} type="number" min="0" max="10" step="0.01" />
                        <ProfileField label="Graduation year" name="graduationYear" value={form.graduationYear} onChange={handleFormChange} type="number" min="2000" max="2100" step="1" />
                        <ProfileField label="GitHub URL" name="githubUrl" value={form.githubUrl} onChange={handleFormChange} type="url" maxLength={255} />
                        <ProfileField label="LinkedIn URL" name="linkedinUrl" value={form.linkedinUrl} onChange={handleFormChange} type="url" maxLength={255} />
                      </div>
                      <label className="mp-field mp-full-field">
                        <span>Bio</span>
                        <textarea
                          name="bio"
                          value={form.bio}
                          onChange={handleFormChange}
                          rows={3}
                          maxLength={1000}
                          placeholder="Write a short introduction about yourself"
                        />
                      </label>
                    </>
                  )}

                  {isRecruiter && (
                    <>
                      <h3 className="mp-section-gap">Recruiter information</h3>
                      <div className="mp-grid">
                        <ProfileField label="Designation" name="designation" value={form.designation} onChange={handleFormChange} maxLength={120} />
                      </div>
                      {company && (
                        <div className="mp-company-card">
                          <h4>Associated company (view only)</h4>
                          <div><span>Company</span><strong>{company.name || "—"}</strong></div>
                          <div><span>Industry</span><strong>{company.industry || "—"}</strong></div>
                          <div><span>Website</span><strong>{company.website || "—"}</strong></div>
                          <div><span>Location</span><strong>{company.location || "—"}</strong></div>
                        </div>
                      )}
                    </>
                  )}

                  {profileError && (
                    <div className="mp-feedback mp-error" role="alert">{profileError}</div>
                  )}
                  {profileMessage && (
                    <div className="mp-feedback mp-success" role="status">{profileMessage}</div>
                  )}

                  <div className="mp-form-actions">
                    <button type="button" className="mp-secondary" onClick={loadProfile} disabled={savingProfile}>
                      Reload
                    </button>
                    <button type="submit" className="mp-primary" disabled={savingProfile}>
                      {savingProfile ? "Saving…" : "Save profile"}
                    </button>
                  </div>
                </form>

                {isStudent && (
                  <section className="mp-skills-section">
                    <div className="mp-section-heading">
                      <div>
                        <h3>My Skills</h3>
                        <p>Add skills and keep your proficiency up to date.</p>
                      </div>
                      <span>{skills.length} skills</span>
                    </div>

                    <form className="mp-add-skill" onSubmit={handleAddSkill}>
                      <label className="mp-field">
                        <span>Choose skill</span>
                        <select name="skillId" value={newSkill.skillId} onChange={handleNewSkillChange} required>
                          <option value="">Select a skill</option>
                          {skillCatalog.map((skill) => (
                            <option key={skill.id} value={skill.id}>
                              {skill.name} {skill.category ? `(${skill.category})` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mp-field">
                        <span>Proficiency</span>
                        <select name="proficiency" value={newSkill.proficiency} onChange={handleNewSkillChange} required>
                          {PROFICIENCY_OPTIONS.map((level) => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                      </label>
                      <label className="mp-field">
                        <span>Years of experience</span>
                        <input type="number" name="yearsOfExperience" min="0" max="60" step="1" value={newSkill.yearsOfExperience} onChange={handleNewSkillChange} required />
                      </label>
                      <button type="submit" className="mp-primary" disabled={savingSkill || skillCatalog.length === 0}>
                        {savingSkill ? "Saving…" : "Add skill"}
                      </button>
                    </form>

                    {skillError && <div className="mp-feedback mp-error" role="alert">{skillError}</div>}
                    {skillMessage && <div className="mp-feedback mp-success" role="status">{skillMessage}</div>}

                    {skills.length === 0 ? (
                      <div className="mp-empty-skills">
                        No skills added yet. Choose a skill above to build your skill profile.
                      </div>
                    ) : (
                      <div className="mp-skill-list">
                        {skills.map((skill) => {
                          const draft = skillDrafts[skill.id] || {
                            proficiency: skill.proficiency || "BEGINNER",
                            yearsOfExperience: skill.yearsOfExperience ?? 0,
                          };

                          return (
                            <article className="mp-skill-row" key={skill.id}>
                              <div className="mp-skill-name">
                                <strong>{skill.skillName || "Skill"}</strong>
                                <small>{skill.category || "Skill"}</small>
                              </div>
                              <label className="mp-field">
                                <span>Proficiency</span>
                                <select value={draft.proficiency} onChange={(event) => handleSkillDraftChange(skill.id, "proficiency", event.target.value)}>
                                  {PROFICIENCY_OPTIONS.map((level) => (
                                    <option key={level} value={level}>{level}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="mp-field">
                                <span>Years</span>
                                <input type="number" min="0" max="60" step="1" value={draft.yearsOfExperience} onChange={(event) => handleSkillDraftChange(skill.id, "yearsOfExperience", event.target.value)} />
                              </label>
                              <div className="mp-skill-actions">
                                <button type="button" className="mp-small-save" disabled={savingSkill} onClick={() => handleUpdateSkill(skill)}>Save</button>
                                <button type="button" className="mp-small-delete" disabled={savingSkill} onClick={() => handleDeleteSkill(skill)}>Remove</button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
