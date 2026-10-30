import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";
import "./AiMockInterview.css";

function getError(error, fallback) {
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

function getList(data, keys = []) {
  if (Array.isArray(data)) return data;

  if (!data || typeof data !== "object") {
    return [];
  }

  for (const key of [
    ...keys,
    "content",
    "items",
    "results",
    "data",
  ]) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  return [];
}

function getSessionId(session) {
  return session?.id ?? session?.sessionId ?? null;
}

function getQuestionId(question) {
  return question?.id ?? question?.questionId ?? null;
}

function getAnswer(question) {
  return typeof question?.answer === "string"
    ? question.answer
    : "";
}

function isAnswered(question) {
  return getAnswer(question).trim().length > 0;
}

function isCompleted(session, questions) {
  const status = String(session?.status || "").toUpperCase();

  return (
    ["COMPLETED", "COMPLETE", "FINISHED", "SUBMITTED"].includes(status) ||
    (questions.length > 0 && questions.every(isAnswered))
  );
}

function formatDate(value) {
  if (!value) return "Date unavailable";

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

function scoreText(value) {
  if (value === null || value === undefined || value === "") {
    return "Pending";
  }

  const score = Number(value);

  return Number.isFinite(score)
    ? score.toFixed(1)
    : String(value);
}

function AiMockInterview({ role }) {
  const normalizedRole = String(role || "").toUpperCase();

  const [isOpen, setIsOpen] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [interviewType, setInterviewType] = useState("TECHNICAL");
  const [targetRole, setTargetRole] = useState("Java Backend Developer");
  const [totalQuestions, setTotalQuestions] = useState(5);

  const [starting, setStarting] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  const [activeSession, setActiveSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answerDraft, setAnswerDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await api.get(
        "/api/students/me/ai-interviews"
      );

      const list = getList(response.data, [
        "interviews",
        "sessions",
      ]);

      setSessions(
        [...list].sort((a, b) => {
          const dateA =
            Date.parse(a.startedAt || a.createdAt || "") || 0;
          const dateB =
            Date.parse(b.startedAt || b.createdAt || "") || 0;

          return dateB - dateA;
        })
      );
    } catch (error) {
      setHistoryError(
        getError(error, "Unable to load interview history.")
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (normalizedRole !== "STUDENT" || !isOpen) {
      return;
    }

    loadHistory();
  }, [normalizedRole, isOpen, loadHistory]);

  const answeredCount = useMemo(
    () => questions.filter(isAnswered).length,
    [questions]
  );

  const completed = isCompleted(activeSession, questions);

  const currentQuestion = questions[currentIndex] || null;

  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  async function openSession(sessionId) {
    if (sessionId === null || sessionId === undefined) {
      setPageError("Interview session ID is missing.");
      return;
    }

    setSessionLoading(true);
    setPageError("");
    setSuccessMessage("");
    setAnswerDraft("");

    try {
      const [sessionResult, questionsResult] =
        await Promise.allSettled([
          api.get(`/api/students/me/ai-interviews/${sessionId}`),
          api.get(
            `/api/students/me/ai-interviews/${sessionId}/questions`
          ),
        ]);

      if (sessionResult.status === "rejected") {
        throw sessionResult.reason;
      }

      const sessionData = sessionResult.value.data;

      setActiveSession(sessionData);

      if (questionsResult.status === "fulfilled") {
        const questionList = getList(
          questionsResult.value.data,
          ["questions"]
        ).sort(
          (a, b) =>
            Number(a.questionNumber || 0) -
            Number(b.questionNumber || 0)
        );

        setQuestions(questionList);

        const firstUnanswered = questionList.findIndex(
          (question) => !isAnswered(question)
        );

        setCurrentIndex(
          firstUnanswered === -1
            ? questionList.length
            : firstUnanswered
        );
      } else {
        setQuestions([]);
        setPageError(
          getError(
            questionsResult.reason,
            "Interview details loaded, but questions could not be fetched."
          )
        );
      }
    } catch (error) {
      setPageError(
        getError(error, "Unable to open this interview.")
      );
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleStartInterview(event) {
    event.preventDefault();

    const roleName = targetRole.trim();

    if (!roleName) {
      setPageError("Please enter your target role.");
      return;
    }

    setStarting(true);
    setPageError("");
    setSuccessMessage("");
    setActiveSession(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswerDraft("");

    try {
      const response = await api.post(
        "/api/students/me/ai-interviews",
        {
          interviewType,
          targetRole: roleName,
          totalQuestions: Number(totalQuestions),
        }
      );

      const createdSession = response.data;
      const sessionId = getSessionId(createdSession);

      if (sessionId === null || sessionId === undefined) {
        setSuccessMessage(
          "Interview request submitted. Refresh interview history to find the new session."
        );

        await loadHistory();
        return;
      }

      setActiveSession(createdSession);

      await openSession(sessionId);
      await loadHistory();
    } catch (error) {
      setPageError(
        getError(
          error,
          "Unable to start the AI mock interview."
        )
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmitAnswer(event) {
    event.preventDefault();

    if (!activeSession || !currentQuestion) {
      return;
    }

    const sessionId = getSessionId(activeSession);
    const questionId = getQuestionId(currentQuestion);
    const answer = answerDraft.trim();

    if (questionId === null || questionId === undefined) {
      setPageError(
        "Question ID is missing. Refresh this interview and try again."
      );
      return;
    }

    if (!answer) {
      setPageError("Please write your answer before submitting.");
      return;
    }

    setSubmitting(true);
    setPageError("");
    setSuccessMessage("");

    try {
      await api.post(
        `/api/students/me/ai-interviews/${sessionId}/questions/${questionId}/answer`,
        { answer }
      );

      setSuccessMessage(
        "Answer submitted. The backend has processed the evaluation."
      );

      setAnswerDraft("");

      // Reload from the backend so the latest score, feedback,
      // progress, and session status are displayed.
      await openSession(sessionId);
      await loadHistory();
    } catch (error) {
      setPageError(
        getError(
          error,
          "Unable to submit this answer."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  function closeInterview() {
    setActiveSession(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswerDraft("");
    setPageError("");
    setSuccessMessage("");
  }

  if (normalizedRole !== "STUDENT") {
    return null;
  }

  return (
    <div className="aim-root">
      {!isOpen && (
        <button
          type="button"
          className="aim-launcher"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Mock Interview"
        >
          <span className="aim-launcher-icon">✦</span>

          <span className="aim-launcher-text">
            <strong>AI Mock Interview</strong>
            <small>Practice with AI</small>
          </span>

          <span className="aim-launcher-arrow">↗</span>
        </button>
      )}

      {isOpen && (
        <div className="aim-overlay">
          <button
            type="button"
            className="aim-overlay-backdrop"
            aria-label="Close AI Mock Interview"
            onClick={() => setIsOpen(false)}
          />

          <section
            className="aim-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aim-title"
          >
            <header className="aim-header">
              <div className="aim-brand">
                <div className="aim-brand-icon">✦</div>

                <div>
                  <span className="aim-eyebrow">
                    PLACEMENTPRO AI
                  </span>

                  <h2 id="aim-title">Mock Interview Studio</h2>

                  <p>Practice, evaluate and improve.</p>
                </div>
              </div>

              <button
                type="button"
                className="aim-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <div className="aim-body">
              {pageError && (
                <div className="aim-alert" role="alert">
                  <strong>Something needs attention</strong>
                  <p>{pageError}</p>

                  <button
                    type="button"
                    onClick={() => setPageError("")}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {successMessage && (
                <div className="aim-success" role="status">
                  {successMessage}
                </div>
              )}

              {!activeSession ? (
                <div className="aim-home">
                  <section className="aim-hero">
                    <div className="aim-hero-copy">
                      <span className="aim-pill">
                        <span />
                        AI-POWERED PRACTICE
                      </span>

                      <h3>
                        Get interview-ready,
                        <br />
                        one question at a time.
                      </h3>

                      <p>
                        Start a personalized mock interview. Answer
                        questions and review the score and feedback
                        returned by your backend.
                      </p>
                    </div>

                    <div className="aim-hero-art" aria-hidden="true">
                      <div className="aim-art-orbit aim-art-orbit-one" />
                      <div className="aim-art-orbit aim-art-orbit-two" />
                      <div className="aim-art-center">AI</div>
                      <span className="aim-art-star">✦</span>
                      <span className="aim-art-dot" />
                    </div>
                  </section>

                  <section className="aim-setup">
                    <div className="aim-section-heading">
                      <div>
                        <h3>Configure your interview</h3>
                        <p>
                          Choose the interview type and target role.
                        </p>
                      </div>

                      <span className="aim-step-label">
                        STEP 01
                      </span>
                    </div>

                    <form
                      className="aim-form"
                      onSubmit={handleStartInterview}
                    >
                      <div className="aim-field">
                        <label htmlFor="aim-interview-type">
                          Interview type
                        </label>

                        <select
                          id="aim-interview-type"
                          value={interviewType}
                          onChange={(event) =>
                            setInterviewType(event.target.value)
                          }
                        >
                          <option value="TECHNICAL">
                            Technical interview
                          </option>

                          <option value="HR">
                            HR interview
                          </option>

                          <option value="MIXED">
                            Mixed interview
                          </option>
                        </select>
                      </div>

                      <div className="aim-field">
                        <label htmlFor="aim-target-role">
                          Target job role
                        </label>

                        <input
                          id="aim-target-role"
                          value={targetRole}
                          onChange={(event) =>
                            setTargetRole(event.target.value)
                          }
                          placeholder="e.g. Java Backend Developer"
                          maxLength={120}
                          required
                        />
                      </div>

                      <div className="aim-field">
                        <label htmlFor="aim-total-questions">
                          Number of questions
                        </label>

                        <select
                          id="aim-total-questions"
                          value={totalQuestions}
                          onChange={(event) =>
                            setTotalQuestions(Number(event.target.value))
                          }
                        >
                          <option value={3}>3 questions</option>
                          <option value={5}>5 questions</option>
                          <option value={8}>8 questions</option>
                          <option value={10}>10 questions</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="aim-primary-button"
                        disabled={starting}
                      >
                        {starting
                          ? "Preparing interview…"
                          : "Start mock interview"}
                        <span>→</span>
                      </button>
                    </form>
                  </section>

                  <section className="aim-history">
                    <div className="aim-section-heading">
                      <div>
                        <h3>Previous interviews</h3>
                        <p>
                          Continue an in-progress session or review a
                          previous attempt.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="aim-inline-button"
                        onClick={loadHistory}
                        disabled={historyLoading}
                      >
                        {historyLoading ? "Loading…" : "↻ Refresh"}
                      </button>
                    </div>

                    {historyError && (
                      <div className="aim-history-error" role="alert">
                        {historyError}
                      </div>
                    )}

                    {historyLoading ? (
                      <div className="aim-history-empty">
                        <span className="aim-spinner" />
                        <p>Loading your interview history…</p>
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="aim-history-empty">
                        <span className="aim-history-empty-icon">
                          ◷
                        </span>

                        <strong>No interviews yet</strong>

                        <p>
                          Your completed and in-progress interviews
                          will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="aim-session-list">
                        {sessions.map((session, index) => {
                          const id = getSessionId(session);

                          return (
                            <article
                              className="aim-session-card"
                              key={id ?? index}
                            >
                              <div className="aim-session-type-icon">
                                {String(
                                  session.interviewType || ""
                                ).toUpperCase() === "HR"
                                  ? "☷"
                                  : "⌘"}
                              </div>

                              <div className="aim-session-info">
                                <strong>
                                  {session.targetRole ||
                                    "Mock interview"}
                                </strong>

                                <p>
                                  {String(
                                    session.interviewType ||
                                      "INTERVIEW"
                                  ).replaceAll("_", " ")}
                                  {" · "}
                                  {session.answeredQuestions ?? 0}
                                  /
                                  {session.totalQuestions ?? 0}
                                  {" answered"}
                                </p>

                                <small>
                                  {formatDate(session.startedAt)}
                                </small>
                              </div>

                              <div className="aim-session-end">
                                <span
                                  className={`aim-session-status ${
                                    String(session.status).toUpperCase() ===
                                    "COMPLETED"
                                      ? "aim-status-completed"
                                      : "aim-status-progress"
                                  }`}
                                >
                                  {String(
                                    session.status || "UNKNOWN"
                                  ).replaceAll("_", " ")}
                                </span>

                                <strong>
                                  {session.overallScore !== null &&
                                  session.overallScore !== undefined
                                    ? scoreText(session.overallScore)
                                    : "—"}
                                </strong>

                                <button
                                  type="button"
                                  onClick={() => openSession(id)}
                                  disabled={
                                    sessionLoading ||
                                    id === null ||
                                    id === undefined
                                  }
                                >
                                  Open →
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              ) : sessionLoading ? (
                <div className="aim-loading-state">
                  <span className="aim-spinner" />
                  <h3>Loading your interview</h3>
                  <p>Fetching questions and latest evaluation results.</p>
                </div>
              ) : (
                <div className="aim-practice">
                  <div className="aim-practice-top">
                    <button
                      type="button"
                      className="aim-back-button"
                      onClick={closeInterview}
                    >
                      ← Interview home
                    </button>

                    <span
                      className={`aim-session-status ${
                        completed
                          ? "aim-status-completed"
                          : "aim-status-progress"
                      }`}
                    >
                      {completed
                        ? "COMPLETED"
                        : String(
                            activeSession.status || "IN PROGRESS"
                          ).replaceAll("_", " ")}
                    </span>
                  </div>

                  <section className="aim-session-banner">
                    <div>
                      <span className="aim-eyebrow">
                        {activeSession.interviewType || "MOCK INTERVIEW"}
                      </span>

                      <h3>
                        {activeSession.targetRole ||
                          "Interview practice"}
                      </h3>

                      <p>
                        Answer carefully. Your response is evaluated
                        by the backend when you submit it.
                      </p>
                    </div>

                    <div className="aim-session-score">
                      <span>OVERALL SCORE</span>

                      <strong>
                        {activeSession.overallScore !== null &&
                        activeSession.overallScore !== undefined
                          ? scoreText(activeSession.overallScore)
                          : "—"}
                      </strong>
                    </div>
                  </section>

                  <div className="aim-progress-info">
                    <span>
                      {completed
                        ? "Interview complete"
                        : `Question ${Math.min(
                            currentIndex + 1,
                            questions.length
                          )} of ${questions.length}`}
                    </span>

                    <strong>{progress}% complete</strong>
                  </div>

                  <div
                    className="aim-progress-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    aria-label="Interview progress"
                  >
                    <div
                      className="aim-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {completed ? (
                    <section className="aim-results">
                      <div className="aim-results-heading">
                        <span>✦</span>

                        <div>
                          <h3>Interview completed</h3>

                          <p>
                            Review the score and feedback produced
                            by your backend.
                          </p>
                        </div>
                      </div>

                      <div className="aim-result-metrics">
                        <article>
                          <span>Questions</span>
                          <strong>{questions.length}</strong>
                        </article>

                        <article>
                          <span>Answered</span>
                          <strong>{answeredCount}</strong>
                        </article>

                        <article>
                          <span>Overall score</span>
                          <strong>
                            {scoreText(activeSession.overallScore)}
                          </strong>
                        </article>
                      </div>

                      <div className="aim-feedback-panel">
                        <h4>Overall AI feedback</h4>

                        <p>
                          {activeSession.overallFeedback ||
                            "No overall feedback was returned for this session."}
                        </p>
                      </div>

                      <div className="aim-review-list">
                        <h4>Question-by-question review</h4>

                        {questions.map((question, index) => (
                          <article
                            className="aim-review-card"
                            key={
                              getQuestionId(question) ??
                              question.questionNumber ??
                              index
                            }
                          >
                            <div className="aim-review-top">
                              <span>
                                QUESTION{" "}
                                {question.questionNumber ?? index + 1}
                              </span>

                              <strong>
                                Score: {scoreText(question.score)}
                              </strong>
                            </div>

                            <h5>{question.question}</h5>

                            <p className="aim-review-answer">
                              <strong>Your answer:</strong>{" "}
                              {getAnswer(question) || "No answer recorded."}
                            </p>

                            {question.topic && (
                              <span className="aim-topic">
                                {question.topic}
                              </span>
                            )}

                            {question.feedback && (
                              <p className="aim-review-feedback">
                                <strong>Feedback:</strong>{" "}
                                {question.feedback}
                              </p>
                            )}
                          </article>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="aim-primary-button"
                        onClick={closeInterview}
                      >
                        Back to interview home
                        <span>→</span>
                      </button>
                    </section>
                  ) : questions.length === 0 ? (
                    <div className="aim-loading-state">
                      <h3>No questions were returned</h3>

                      <p>
                        Refresh the session or go back and start
                        another interview.
                      </p>

                      <button
                        type="button"
                        className="aim-primary-button"
                        onClick={() =>
                          openSession(getSessionId(activeSession))
                        }
                      >
                        Reload interview
                      </button>
                    </div>
                  ) : !currentQuestion ? (
                    <div className="aim-loading-state">
                      <h3>No unanswered question found</h3>

                      <p>
                        Reload this session to check the latest status.
                      </p>

                      <button
                        type="button"
                        className="aim-primary-button"
                        onClick={() =>
                          openSession(getSessionId(activeSession))
                        }
                      >
                        Refresh session
                      </button>
                    </div>
                  ) : (
                    <section className="aim-question-panel">
                      <div className="aim-question-meta">
                        <span>
                          QUESTION{" "}
                          {currentQuestion.questionNumber ??
                            currentIndex + 1}
                        </span>

                        <div>
                          {currentQuestion.topic && (
                            <span className="aim-topic">
                              {currentQuestion.topic}
                            </span>
                          )}

                          {currentQuestion.difficulty && (
                            <span className="aim-difficulty">
                              {currentQuestion.difficulty}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3>{currentQuestion.question}</h3>

                      <p className="aim-answer-guidance">
                        Explain your thinking clearly and use examples
                        where relevant.
                      </p>

                      <form
                        className="aim-answer-form"
                        onSubmit={handleSubmitAnswer}
                      >
                        <label htmlFor="aim-answer">
                          Your answer
                        </label>

                        <textarea
                          id="aim-answer"
                          value={answerDraft}
                          onChange={(event) =>
                            setAnswerDraft(event.target.value)
                          }
                          placeholder="Write your answer here..."
                          rows={7}
                          maxLength={12000}
                          required
                        />

                        <div className="aim-answer-footer">
                          <span>
                            {answerDraft.length} / 12000 characters
                          </span>

                          <button
                            type="submit"
                            className="aim-primary-button"
                            disabled={
                              submitting ||
                              !answerDraft.trim()
                            }
                          >
                            {submitting
                              ? "Evaluating answer…"
                              : "Submit answer"}
                            <span>→</span>
                          </button>
                        </div>
                      </form>

                      <div className="aim-practice-note">
                        <span>✦</span>

                        <p>
                          After submission, the latest score and
                          feedback will be loaded from the backend.
                        </p>
                      </div>
                    </section>
                  )}

                  <footer className="aim-practice-footer">
                    <span>
                      {answeredCount} of {questions.length} answered
                    </span>

                    <span>
                      Session ID: {getSessionId(activeSession) ?? "—"}
                    </span>
                  </footer>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AiMockInterview;