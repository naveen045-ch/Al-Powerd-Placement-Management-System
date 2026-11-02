
import { useCallback, useEffect, useState } from "react";
import api from "../api";
import "./StudentInterviews.css";

function extractList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

function formatDate(value) {
  if (!value) return "Date not available";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function isWebLink(value) {
  return /^https?:\/\//i.test(value || "");
}

export default function StudentInterviews({ role }) {
  const isStudent = String(role || "").toUpperCase() === "STUDENT";

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/interviews/me");
      setInterviews(extractList(response.data));
    } catch (err) {
      setInterviews([]);
      setError(
        err.response?.data?.message ||
        "Unable to load your scheduled interviews."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStudent) {
      loadInterviews();
    } else {
      setLoading(false);
    }
  }, [isStudent, loadInterviews]);

  if (!isStudent) return null;

  return (
    <section className="student-interviews">
      <div className="student-interviews-heading">
        <div>
          <span className="student-interviews-label">
            PLACEMENT UPDATES
          </span>
          <h2>My Scheduled Interviews</h2>
          <p>View your upcoming company interviews and instructions.</p>
        </div>

        <button
          type="button"
          onClick={loadInterviews}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <p className="student-interviews-info">
          Loading your interviews...
        </p>
      )}

      {error && (
        <p className="student-interviews-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && interviews.length === 0 && (
        <div className="student-interviews-empty">
          <h3>No interviews scheduled yet</h3>
          <p>
            When a recruiter schedules an interview for your application,
            it will appear here.
          </p>
        </div>
      )}

      {!loading && interviews.length > 0 && (
        <div className="student-interviews-grid">
          {interviews.map((item) => (
            <article
              className="student-interview-card"
              key={item.id ?? item.applicationId}
            >
              <div className="student-interview-top">
                <div>
                  <h3>{item.jobTitle || "Interview"}</h3>
                  <p>{item.companyName || "Company not available"}</p>
                </div>

                <span className="student-interview-mode">
                  {item.mode || "MODE NOT SET"}
                </span>
              </div>

              <div className="student-interview-detail">
                <strong>Date & Time</strong>
                <span>{formatDate(item.interviewDateTime)}</span>
              </div>

              {item.locationOrLink && (
                <div className="student-interview-detail">
                  <strong>
                    {String(item.mode).toUpperCase() === "ONLINE"
                      ? "Meeting Link"
                      : "Interview Location"}
                  </strong>

                  {isWebLink(item.locationOrLink) ? (
                    <a
                      href={item.locationOrLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Join Interview
                    </a>
                  ) : (
                    <span>{item.locationOrLink}</span>
                  )}
                </div>
              )}

              {item.notes && (
                <div className="student-interview-notes">
                  <strong>Recruiter Notes</strong>
                  <p>{item.notes}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
