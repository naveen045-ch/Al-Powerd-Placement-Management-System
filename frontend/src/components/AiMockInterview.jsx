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


// GATE CSE practice catalogue. The selected section/topic is sent through
// the existing targetRole field so the existing backend request contract stays intact.
const GATE_SECTIONS = [
  {
    id: "GENERAL_APTITUDE",
    label: "General Aptitude",
    topics: [
      { id: "VERBAL_ABILITY", label: "Verbal Ability" },
      { id: "QUANTITATIVE_APTITUDE", label: "Quantitative Aptitude" },
      { id: "ANALYTICAL_REASONING", label: "Analytical Reasoning" },
    ],
  },
  {
    id: "ENGINEERING_MATHEMATICS",
    label: "Engineering Mathematics",
    topics: [
      { id: "DISCRETE_MATHEMATICS", label: "Discrete Mathematics" },
      { id: "LINEAR_ALGEBRA", label: "Linear Algebra" },
      { id: "CALCULUS", label: "Calculus" },
      { id: "PROBABILITY_STATISTICS", label: "Probability & Statistics" },
      { id: "NUMERICAL_METHODS", label: "Numerical Methods" },
    ],
  },
  {
    id: "CORE_COMPUTER_SCIENCE",
    label: "Core Computer Science",
    topics: [
      { id: "PROGRAMMING_DSA", label: "Programming & Data Structures" },
      { id: "ALGORITHMS", label: "Algorithms" },
      { id: "DBMS", label: "Database Management Systems" },
      { id: "OPERATING_SYSTEMS", label: "Operating Systems" },
      { id: "COMPUTER_NETWORKS", label: "Computer Networks" },
      { id: "THEORY_OF_COMPUTATION", label: "Theory of Computation" },
      { id: "COMPILER_DESIGN", label: "Compiler Design" },
      { id: "COA", label: "Computer Organization & Architecture" },
      { id: "DIGITAL_LOGIC", label: "Digital Logic" },
    ],
  },
];

function isGateSession(session) {
  return String(session?.targetRole || "").toUpperCase().includes("GATE CSE");
}

function getSessionDisplayTitle(session) {
  const target = String(session?.targetRole || "Mock interview");
  if (!isGateSession(session)) return target;

  return target
    .replace(/^GATE CSE\s*\|\s*/i, "")
    .replace(/\s*\|\s*/g, " · ")
    .replace(/^FULL MOCK\b/i, "Full GATE CSE Mock Test");
}

function normalizeQuestionOptions(question) {
  let raw =
    question?.options ??
    question?.choices ??
    question?.answerOptions ??
    question?.optionList;

  if (raw == null && question) {
    const optionKeys = [
      ["A", "optionA"], ["B", "optionB"],
      ["C", "optionC"], ["D", "optionD"],
      ["A", "option1"], ["B", "option2"],
      ["C", "option3"], ["D", "option4"],
    ];
    const detected = optionKeys
      .filter(([, key]) => question[key] !== null && question[key] !== undefined && String(question[key]).trim())
      .map(([code, key]) => ({ code, value: code, label: String(question[key]) }));
    if (detected.length) raw = detected;
  }

  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = raw.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    }
  }

  if (raw && !Array.isArray(raw) && typeof raw === "object") {
    raw = Object.entries(raw).map(([key, value]) => ({ key, value }));
  }

  if (!Array.isArray(raw)) return [];

  return raw.map((item, index) => {
    const code = String(
      item && typeof item === "object"
        ? item.code ?? item.key ?? item.id ?? String.fromCharCode(65 + index)
        : String.fromCharCode(65 + index)
    );
    const value = String(
      item && typeof item === "object"
        ? item.value ?? item.id ?? item.key ?? code
        : item
    );
    const label = String(
      item && typeof item === "object"
        ? item.label ?? item.text ?? item.optionText ?? item.content ?? item.value ?? ""
        : item
    );

    return { code, value, label };
  }).filter((option) => option.label.trim());
}

function isMultiSelectQuestion(question) {
  const type = String(
    question?.questionType ?? question?.answerType ?? question?.type ?? ""
  ).toUpperCase();
  return (
    question?.multiSelect === true ||
    question?.multipleSelect === true ||
    type.includes("MULTI") ||
    type === "MSQ"
  );
}

function getSelectedOptionValues(answer, options) {
  const tokens = String(answer || "")
    .split(/\|\||;|\n/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  return options
    .filter((option) => {
      const code = option.code.toLowerCase();
      const value = option.value.toLowerCase();
      const label = option.label.toLowerCase();
      return tokens.some((token) =>
        token === value ||
        token === code ||
        token === label ||
        token === `${code}. ${label}` ||
        token === `${code}) ${label}`
      );
    })
    .map((option) => option.value);
}

function getQuestionSection(question) {
  return (
    question?.section ||
    question?.sectionName ||
    question?.subject ||
    question?.category ||
    question?.topic ||
    "General"
  );
}

function AiMockInterview({ role }) {
  const normalizedRole = String(role || "").toUpperCase();

  const [isOpen, setIsOpen] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [examMode, setExamMode] = useState("INTERVIEW");
  const [interviewType, setInterviewType] = useState("TECHNICAL");
  const [targetRole, setTargetRole] = useState("Java Backend Developer");
  const [gateScope, setGateScope] = useState("SECTION");
  const [gateSection, setGateSection] = useState("GENERAL_APTITUDE");
  const [gateTopic, setGateTopic] = useState("VERBAL_ABILITY");
  const [totalQuestions, setTotalQuestions] = useState(5);

  const [starting, setStarting] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  const [activeSession, setActiveSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answerDraft, setAnswerDraft] = useState("");
  const [markedForReview, setMarkedForReview] = useState({});
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

  const selectedGateSection = GATE_SECTIONS.find(
    (section) => section.id === gateSection
  ) || GATE_SECTIONS[0];

  const selectedGateTopic = selectedGateSection.topics.find(
    (topic) => topic.id === gateTopic
  ) || selectedGateSection.topics[0];

  const currentQuestionOptions = normalizeQuestionOptions(currentQuestion);
  const currentQuestionIsMultiSelect = isMultiSelectQuestion(currentQuestion);
  const currentQuestionSection = currentQuestion
    ? getQuestionSection(currentQuestion)
    : "";

  const gateSectionCounts = useMemo(() => {
    const counts = new Map();
    questions.forEach((question) => {
      const section = getQuestionSection(question);
      counts.set(section, (counts.get(section) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [questions]);

  function goToQuestion(index) {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
    setAnswerDraft(getAnswer(questions[index]));
    setPageError("");
  }

  function toggleMarkForReview(index = currentIndex) {
    setMarkedForReview((previous) => ({
      ...previous,
      [index]: !previous[index],
    }));
  }

  function handleOptionSelect(option, isMulti) {
    if (!isMulti) {
      setAnswerDraft(option.value);
      return;
    }

    const selected = new Set(
      getSelectedOptionValues(answerDraft, currentQuestionOptions)
    );

    if (selected.has(option.value)) selected.delete(option.value);
    else selected.add(option.value);

    setAnswerDraft(Array.from(selected).join("||"));
  }

  function getAnswerForSubmission(question, draft) {
    const options = normalizeQuestionOptions(question);
    if (!options.length) return draft.trim();

    const selectedValues = getSelectedOptionValues(draft, options);
    return selectedValues
      .map((value) => {
        const option = options.find((item) => item.value === value);
        return option ? `${option.code}. ${option.label}` : value;
      })
      .join("; ");
  }

  useEffect(() => {
    if (currentQuestion) {
      setAnswerDraft(getAnswer(currentQuestion));
    }
  }, [currentIndex, questions]);

  async function openSession(sessionId) {
    if (sessionId === null || sessionId === undefined) {
      setPageError("Interview session ID is missing.");
      return;
    }

    setSessionLoading(true);
    setPageError("");
    setSuccessMessage("");
    setAnswerDraft("");
    setMarkedForReview({});

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
    const isGateRequest = examMode === "GATE_CSE";

    if (!isGateRequest && !roleName) {
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
    setMarkedForReview({});

    const requestedTargetRole = isGateRequest
      ? gateScope === "FULL"
        ? "GATE CSE | FULL MOCK | GA+ENG MATH+CORE CS | VERBAL ABILITY | CBT MCQ/MSQ/NAT"
        : `GATE CSE | ${selectedGateSection.label} | ${selectedGateTopic.label} | CBT MCQ/MSQ/NAT`
      : roleName;
    const requestedInterviewType = isGateRequest
      ? gateScope === "FULL" || gateSection === "GENERAL_APTITUDE"
        ? "MIXED"
        : "TECHNICAL"
      : interviewType;

    try {
      const response = await api.post(
        "/api/students/me/ai-interviews",
        {
          interviewType: requestedInterviewType,
          targetRole: requestedTargetRole,
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
    const answer = getAnswerForSubmission(currentQuestion, answerDraft);

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
    setMarkedForReview({});
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
            className={`aim-modal ${isGateSession(activeSession) ? "aim-gate-modal" : ""}`}
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

                  <h2 id="aim-title">
                    {isGateSession(activeSession) ? "GATE Exam Simulator" : "Mock Interview Studio"}
                  </h2>

                  <p>
                    {isGateSession(activeSession)
                      ? "Computer-based practice for GATE Computer Science."
                      : "Practice, evaluate and improve."}
                  </p>
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
                        AI-POWERED PRACTICE · INTERVIEW + GATE
                      </span>

                      <h3>
                        Prepare smarter,
                        <br />
                        perform with confidence.
                      </h3>

                      <p>
                        Practice placement interviews or switch to a GATE-style
                        Computer Science exam with section-wise questions,
                        question navigation and answer review.
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
                      className="aim-form aim-setup-form"
                      onSubmit={handleStartInterview}
                    >
                      <div className="aim-field aim-mode-field">
                        <label htmlFor="aim-exam-mode">Preparation mode</label>
                        <select
                          id="aim-exam-mode"
                          value={examMode}
                          onChange={(event) => setExamMode(event.target.value)}
                        >
                          <option value="INTERVIEW">AI Placement Mock Interview</option>
                          <option value="GATE_CSE">GATE Computer Science Exam</option>
                        </select>
                      </div>

                      {examMode === "INTERVIEW" ? (
                        <>
                          <div className="aim-field">
                            <label htmlFor="aim-interview-type">Interview type</label>
                            <select
                              id="aim-interview-type"
                              value={interviewType}
                              onChange={(event) => setInterviewType(event.target.value)}
                            >
                              <option value="TECHNICAL">Technical interview</option>
                              <option value="HR">HR interview</option>
                              <option value="MIXED">Mixed interview</option>
                            </select>
                          </div>

                          <div className="aim-field">
                            <label htmlFor="aim-target-role">Target job role</label>
                            <input
                              id="aim-target-role"
                              value={targetRole}
                              onChange={(event) => setTargetRole(event.target.value)}
                              placeholder="e.g. Java Backend Developer"
                              maxLength={120}
                              required
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="aim-gate-intro">
                            <span className="aim-gate-intro-mark">GATE</span>
                            <div>
                              <strong>Computer Science & Information Technology</strong>
                              <p>Choose a full practice paper or prepare one section at a time.</p>
                            </div>
                          </div>

                          <div className="aim-field">
                            <label htmlFor="aim-gate-scope">Practice scope</label>
                            <select
                              id="aim-gate-scope"
                              value={gateScope}
                              onChange={(event) => setGateScope(event.target.value)}
                            >
                              <option value="SECTION">Section-wise practice</option>
                              <option value="FULL">Full GATE CSE mock (all sections)</option>
                            </select>
                          </div>

                          {gateScope === "SECTION" && (
                            <>
                              <div className="aim-field">
                                <label htmlFor="aim-gate-section">GATE section</label>
                                <select
                                  id="aim-gate-section"
                                  value={gateSection}
                                  onChange={(event) => {
                                    const nextSection = GATE_SECTIONS.find(
                                      (section) => section.id === event.target.value
                                    ) || GATE_SECTIONS[0];
                                    setGateSection(nextSection.id);
                                    setGateTopic(nextSection.topics[0].id);
                                  }}
                                >
                                  {GATE_SECTIONS.map((section) => (
                                    <option key={section.id} value={section.id}>
                                      {section.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="aim-field">
                                <label htmlFor="aim-gate-topic">Topic / question module</label>
                                <select
                                  id="aim-gate-topic"
                                  value={gateTopic}
                                  onChange={(event) => setGateTopic(event.target.value)}
                                >
                                  {selectedGateSection.topics.map((topic) => (
                                    <option key={topic.id} value={topic.id}>
                                      {topic.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </>
                          )}

                          {gateScope === "FULL" && (
                            <div className="aim-gate-full-summary">
                              <strong>Paper sections included</strong>
                              <span>General Aptitude · Engineering Mathematics · Core Computer Science</span>
                              <small>Verbal Ability is included under General Aptitude.</small>
                            </div>
                          )}
                        </>
                      )}

                      <div className="aim-field">
                        <label htmlFor="aim-total-questions">Number of questions</label>
                        <select
                          id="aim-total-questions"
                          value={totalQuestions}
                          onChange={(event) => setTotalQuestions(Number(event.target.value))}
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
                          ? "Preparing questions…"
                          : examMode === "GATE_CSE"
                            ? "Start GATE practice"
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
                                  {getSessionDisplayTitle(session)}
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

                  {isGateSession(activeSession) && (
                    <section className="aim-gate-exam-strip">
                      <div>
                        <span className="aim-gate-exam-label">GATE CSE · COMPUTER-BASED PRACTICE</span>
                        <strong>{getSessionDisplayTitle(activeSession)}</strong>
                      </div>
                      <div className="aim-gate-exam-stats">
                        <span><strong>{questions.length}</strong> Questions</span>
                        <span><strong>{answeredCount}</strong> Answered</span>
                        <span><strong>{questions.length - answeredCount}</strong> Remaining</span>
                      </div>
                    </section>
                  )}

                  <section className="aim-session-banner">
                    <div>
                      <span className="aim-eyebrow">
                        {activeSession.interviewType || "MOCK INTERVIEW"}
                      </span>

                      <h3>
                        {getSessionDisplayTitle(activeSession)}
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

                  <div className={isGateSession(activeSession) ? "aim-gate-exam-layout" : "aim-standard-question-layout"}>
                    <div className="aim-gate-question-column">
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
                          {(currentQuestion.section || currentQuestion.subject || currentQuestion.category || currentQuestion.topic) && (
                            <span className="aim-topic">
                              {currentQuestion.section || currentQuestion.subject || currentQuestion.category || currentQuestion.topic}
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

                      {isGateSession(activeSession) && (
                        <div className="aim-gate-question-context">
                          <span>{currentQuestionSection}</span>
                          <span>{currentQuestionOptions.length ? (currentQuestionIsMultiSelect ? "MSQ · Multiple Select" : "MCQ · Single Select") : "Answer type from AI question"}</span>
                        </div>
                      )}

                      <p className="aim-answer-guidance">
                        {currentQuestionOptions.length
                          ? currentQuestionIsMultiSelect
                            ? "Select all options that apply, then submit your answer."
                            : "Select the best answer, then submit your answer."
                          : isGateSession(activeSession)
                            ? "Work out the answer and enter it below. The AI evaluator will review your response."
                            : "Explain your thinking clearly and use examples where relevant."}
                      </p>

                      <form
                        className="aim-answer-form"
                        onSubmit={handleSubmitAnswer}
                      >
                        {currentQuestionOptions.length > 0 ? (
                          <>
                            <label>
                              {currentQuestionIsMultiSelect ? "Select all correct options" : "Choose one option"}
                            </label>
                            <div className="aim-answer-options">
                              {currentQuestionOptions.map((option) => {
                                const selectedValues = getSelectedOptionValues(
                                  answerDraft,
                                  currentQuestionOptions
                                );
                                const selected = selectedValues.includes(option.value);
                                return (
                                  <label
                                    className={`aim-option-card ${selected ? "is-selected" : ""}`}
                                    key={`${option.code}-${option.value}`}
                                  >
                                    <input
                                      type={currentQuestionIsMultiSelect ? "checkbox" : "radio"}
                                      name={`aim-question-${getQuestionId(currentQuestion)}`}
                                      checked={selected}
                                      onChange={() => handleOptionSelect(option, currentQuestionIsMultiSelect)}
                                    />
                                    <span className="aim-option-code">{option.code}</span>
                                    <span className="aim-option-label">{option.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <>
                            <label htmlFor="aim-answer">
                              {isGateSession(activeSession) ? "Enter your answer" : "Your answer"}
                            </label>
                            <textarea
                              id="aim-answer"
                              value={answerDraft}
                              onChange={(event) => setAnswerDraft(event.target.value)}
                              placeholder={isGateSession(activeSession) ? "Enter your numerical or written answer..." : "Write your answer here..."}
                              rows={isGateSession(activeSession) ? 4 : 7}
                              maxLength={12000}
                              required
                            />
                          </>
                        )}

                        <div className="aim-answer-footer">
                          <span>
                            {currentQuestionOptions.length
                              ? currentQuestionIsMultiSelect
                                ? `${getSelectedOptionValues(answerDraft, currentQuestionOptions).length} options selected`
                                : answerDraft ? "1 option selected" : "No option selected"
                              : `${answerDraft.length} / 12000 characters`}
                          </span>

                          <div className="aim-answer-actions">
                            {isGateSession(activeSession) && (
                              <button
                                type="button"
                                className={`aim-review-toggle ${markedForReview[currentIndex] ? "is-marked" : ""}`}
                                onClick={() => toggleMarkForReview(currentIndex)}
                              >
                                {markedForReview[currentIndex] ? "★ Marked for Review" : "☆ Mark for Review"}
                              </button>
                            )}
                            <button
                              type="submit"
                              className="aim-primary-button"
                              disabled={submitting || !answerDraft.trim()}
                            >
                              {submitting
                                ? "Evaluating answer…"
                                : isGateSession(activeSession)
                                  ? "Save Answer"
                                  : "Submit answer"}
                              <span>→</span>
                            </button>
                          </div>
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
                    </div>

                    {isGateSession(activeSession) && questions.length > 0 && (
                      <aside className="aim-question-palette">
                        <div className="aim-palette-heading">
                          <div>
                            <span>GATE CSE</span>
                            <h4>Question Palette</h4>
                          </div>
                          <strong>{answeredCount}/{questions.length}</strong>
                        </div>

                        {gateSectionCounts.length > 0 && (
                          <div className="aim-palette-sections">
                            <span className="aim-palette-subtitle">Question topics</span>
                            {gateSectionCounts.map((section) => (
                              <div key={section.label}>
                                <span>{section.label}</span>
                                <strong>{section.count}</strong>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="aim-palette-grid">
                          {questions.map((question, index) => {
                            const answered = isAnswered(question);
                            const marked = Boolean(markedForReview[index]);
                            const current = index === currentIndex;
                            const classNames = [
                              "aim-palette-button",
                              answered ? "is-answered" : "is-unanswered",
                              marked ? "is-marked" : "",
                              current ? "is-current" : "",
                            ].filter(Boolean).join(" ");

                            return (
                              <button
                                type="button"
                                key={getQuestionId(question) ?? index}
                                className={classNames}
                                onClick={() => goToQuestion(index)}
                                aria-label={`Go to question ${index + 1}${answered ? ", answered" : ", not answered"}${marked ? ", marked for review" : ""}`}
                                aria-current={current ? "step" : undefined}
                              >
                                {question.questionNumber ?? index + 1}
                              </button>
                            );
                          })}
                        </div>

                        <div className="aim-palette-legend">
                          <span><i className="legend-answered" /> Answered</span>
                          <span><i className="legend-unanswered" /> Not answered</span>
                          <span><i className="legend-review" /> Marked for review</span>
                        </div>

                        {!completed && (
                          <div className="aim-palette-navigation">
                            <button
                              type="button"
                              className="aim-palette-prev"
                              disabled={currentIndex <= 0}
                              onClick={() => goToQuestion(currentIndex - 1)}
                            >
                              ← Previous
                            </button>
                            <button
                              type="button"
                              className="aim-palette-next"
                              disabled={currentIndex >= questions.length - 1}
                              onClick={() => goToQuestion(currentIndex + 1)}
                            >
                              Next →
                            </button>
                          </div>
                        )}
                      </aside>
                    )}
                  </div>

                  <footer className="aim-practice-footer">
                    <span>
                      {answeredCount} of {questions.length} answered
                    </span>

                    <span>
                      {isGateSession(activeSession) ? "GATE CSE CBT Practice" : `Session ID: ${getSessionId(activeSession) ?? "—"}`}
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