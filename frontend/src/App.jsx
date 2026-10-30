import { useState } from "react";
import api from "./api";
import "./App.css";
import Dashboard from "./components/Dashboard";
import { getUserRole } from "./utils/auth";
import NotificationCenter from "./components/NotificationCenter";
import AiMockInterview from "./components/AiMockInterview";
import ResumeAnalysis from "./components/ResumeAnalysis";
import ResumeAnalysisHistory from "./components/ResumeAnalysisHistory";

function App() {
  const [step, setStep] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState(
    localStorage.getItem("userRole") || ""
  );

  function getErrorMessage(err) {
    return (
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Something went wrong. Please try again."
    );
  }

  // STEP 1: Login with email and password
  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/api/auth/login", {
        email: email.trim(),
        password,
      });

      const data = response.data;

      if (!data.challengeId) {
        throw new Error(
          "Login response mein challengeId nahi mila. API response check karo."
        );
      }

      setChallengeId(data.challengeId);
      setMaskedEmail(data.maskedEmail || email);
      setMessage(
        data.message || "OTP sent to your registered email."
      );
      setStep("otp");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // STEP 2: Verify email OTP and identify user role
  async function handleVerifyOtp(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post(
        "/api/auth/login/verify-otp",
        {
          challengeId,
          otp: otp.trim(),
        }
      );

      const data = response.data;

      const token =
        data.token ||
        data.accessToken ||
        data.access_token ||
        data.jwt ||
        data.jwtToken;

      if (!token) {
        throw new Error(
          "OTP verification response mein JWT field nahi mili. AuthResponse ka format check karo."
        );
      }

      // Save JWT token
      localStorage.setItem("accessToken", token);

      // Detect role from backend response or JWT
      const detectedRole = getUserRole(data, token);

      if (!detectedRole) {
        localStorage.removeItem("accessToken");

        setError(
          "Login response ya JWT mein user role nahi mila. Backend AuthResponse aur JWT claims check karo."
        );

        return;
      }

      // Save detected role
      localStorage.setItem("userRole", detectedRole);
      setRole(detectedRole);

      setPassword("");
      setOtp("");
      setMessage("Email verified. Login successful!");
      setStep("success");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // STEP 3: Resend OTP
  async function handleResendOtp() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post(
        "/api/auth/login/resend-otp",
        null,
        {
          params: { challengeId },
        }
      );

      const data = response.data;

      if (data.challengeId) {
        setChallengeId(data.challengeId);
      }

      setOtp("");
      setMessage(
        data.message || "A new OTP has been sent."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // STEP 4: Logout
  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");

    setRole("");
    setStep("login");
    setEmail("");
    setPassword("");
    setOtp("");
    setChallengeId("");
    setMaskedEmail("");
    setError("");
    setMessage("");
  }

  // STEP 5: Render role-based dashboard separately
 if (step === "success" && role) {
  return (
    <>
      <Dashboard
        role={role}
        onLogout={handleLogout}
      />

      <NotificationCenter />

      <AiMockInterview role={role} />

      <ResumeAnalysis role={role} />

      <ResumeAnalysisHistory role={role} />
    </>
  );
  
}
  // Login and OTP verification screens
  return (
    <main className="page">
      <header className="brand">
        <div className="brand-icon">P</div>

        <div>
          <h2>PlacementPro</h2>
          <p>CAREER MANAGEMENT SYSTEM</p>
        </div>
      </header>

      <section className="login-layout">
        <div className="welcome-panel">
          <span className="eyebrow">
            YOUR CAREER. YOUR FUTURE.
          </span>

          <h1>
            Turn your
            <br />
            potential into
            <br />
            <span>opportunity.</span>
          </h1>

          <p className="welcome-text">
            Discover opportunities, track applications, prepare for
            interviews, and move closer to your dream career.
          </p>

          <div className="feature-list">
            <div className="feature">
              <span className="feature-icon">✓</span>

              <div>
                <strong>Discover opportunities</strong>
                <p>Find jobs matched to your skills.</p>
              </div>
            </div>

            <div className="feature">
              <span className="feature-icon">✦</span>

              <div>
                <strong>Prepare with AI</strong>
                <p>Improve your interview readiness.</p>
              </div>
            </div>

            <div className="feature">
              <span className="feature-icon">↗</span>

              <div>
                <strong>Track your progress</strong>
                <p>Manage your placement journey.</p>
              </div>
            </div>
          </div>

          <div className="welcome-footer">
            Built for students. Designed for success.
          </div>
        </div>

        <div className="form-panel">
          {/* LOGIN FORM */}
          {step === "login" && (
            <>
              <div className="form-heading">
                <span className="form-tag">
                  WELCOME BACK
                </span>

                <h2>Sign in to your account</h2>

                <p>
                  Enter your registered email and password.
                </p>
              </div>

              <form onSubmit={handleLogin}>
                <label htmlFor="email">
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />

                <label htmlFor="password">
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  className="login-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Sending OTP..." : "Sign in"}

                  {!loading && <span>→</span>}
                </button>
              </form>
            </>
          )}

          {/* OTP VERIFICATION FORM */}
          {step === "otp" && (
            <>
              <div className="form-heading">
                <span className="form-tag">
                  EMAIL VERIFICATION
                </span>

                <h2>Verify your OTP</h2>

                <p>
                  Enter the six-digit code sent to{" "}
                  {maskedEmail}.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp}>
                <label htmlFor="otp">
                  One-time password
                </label>

                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder="Enter 6-digit OTP"
                  autoComplete="one-time-code"
                  required
                />

                <button
                  className="login-button"
                  type="submit"
                  disabled={loading || otp.length !== 6}
                >
                  {loading
                    ? "Verifying..."
                    : "Verify and sign in"}
                </button>
              </form>

              <button
                type="button"
                className="text-button resend-button"
                onClick={handleResendOtp}
                disabled={loading}
              >
                Resend OTP
              </button>

              <button
                type="button"
                className="text-button back-button"
                onClick={() => {
                  setStep("login");
                  setOtp("");
                  setError("");
                  setMessage("");
                }}
              >
                ← Back to login
              </button>
            </>
          )}

          {/* ERROR MESSAGE */}
          {error && (
            <div
              className="error-message"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* SUCCESS OR INFORMATION MESSAGE */}
          {message && (
            <div
              className="success-message"
              role="status"
            >
              {message}
            </div>
          )}

          <div className="security-note">
            <span>🔒</span>

            <p>
              Secure, role-based access for students,
              recruiters, placement officers, and administrators.
            </p>
          </div>

          <p className="form-footer">
            AI-Powered Placement &amp; Career Management System
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;