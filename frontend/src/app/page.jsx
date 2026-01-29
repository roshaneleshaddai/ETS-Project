"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import HomePage from "../app/home/page";

export default function Home() {
  const { user, loading, login, signup, logout, requestOtp, verifyOtp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [useOtp, setUseOtp] = useState(true); // default to OTP
  const [otpStep, setOtpStep] = useState("email"); // "email" | "verify"
  const [otpSentAt, setOtpSentAt] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    otp: "",
    role: "CUSTOMER",
  });
  const [error, setError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address";
    }

    if (!isLogin) {
      if (!formData.name.trim()) {
        return "Name is required";
      }
      if (formData.phone && !phoneRegex.test(formData.phone)) {
        return "Phone number must be exactly 10 digits";
      }
      if (formData.password.length < 6) {
        return "Password must be at least 6 characters long";
      }
      if (formData.password !== formData.confirmPassword) {
        return "Passwords do not match";
      }
    } else {
      if (!formData.password) {
        return "Password is required";
      }
    }
    return null;
  };

  const handlePasswordSubmit = async () => {
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    let res;
    if (isLogin) {
      res = await login(formData.email, formData.password, formData.rememberMe);
    } else {
      const { confirmPassword, ...signupData } = formData;
      res = await signup(signupData);
    }
    if (!res.success) setError(res.error);
  };

  const handleSendOtp = async () => {
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!isLogin && !formData.name.trim()) {
      setError("Enter your name to sign up");
      return;
    }

    // Validate phone for OTP signup just in case user filled it
    const phoneRegex = /^\d{10}$/;
    if (!isLogin && formData.phone && !phoneRegex.test(formData.phone)) {
      setError("Phone number must be exactly 10 digits");
      return;
    }

    setOtpLoading(true);
    const res = await requestOtp(formData.email);
    setOtpLoading(false);
    if (res.success) {
      setOtpStep("verify");
      setOtpSentAt(Date.now());
      setFormData((prev) => ({ ...prev, otp: "" }));
    } else {
      setError(res.error);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (!formData.otp.trim()) {
      setError("Enter the code from your email");
      return;
    }
    setOtpLoading(true);
    const res = await verifyOtp(
      formData.email,
      formData.otp,
      formData.name,
      formData.phone,
      formData.role
    );
    setOtpLoading(false);
    if (!res.success) setError(res.error);
  };

  const switchToEmailStep = () => {
    setOtpStep("email");
    setError("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <HomePage user={user} logout={logout} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <main className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">
          {isLogin ? "Login to ETS" : "Create Account"}
        </h1>

        {/* Toggle: Password vs Email OTP */}
        <div className="flex rounded-lg border border-gray-200 p-1 mb-6 bg-gray-50">
          <button
            type="button"
            onClick={() => {
              setUseOtp(true);
              setOtpStep("email");
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md ${useOtp ? "bg-white shadow text-slate-800" : "text-gray-600"
              }`}
          >
            Email OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setUseOtp(false);
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md ${!useOtp ? "bg-white shadow text-slate-800" : "text-gray-600"
              }`}
          >
            Password
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {useOtp ? (
          /* --- OTP flow --- */
          <div className="space-y-4">
            {otpStep === "email" ? (
              <>
                {!isLogin && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-800 focus:ring-slate-800 sm:text-sm p-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Phone <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Phone number"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-800 focus:ring-slate-800 sm:text-sm p-2 border"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-800 focus:ring-slate-800 sm:text-sm p-2 border"
                  />
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800 disabled:opacity-50"
                >
                  {otpLoading ? "Sending..." : "Send code to email"}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  We sent a 6-digit code to <strong>{formData.email}</strong>. Enter it below.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Verification code</label>
                  <input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    onChange={handleChange}
                    placeholder="000000"
                    maxLength={6}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-800 focus:ring-slate-800 sm:text-sm p-2 border text-center tracking-widest"
                  />
                </div>
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || formData.otp.length < 6}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800 disabled:opacity-50"
                >
                  {otpLoading ? "Verifying..." : "Verify & sign in"}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                    className="text-sm text-slate-600 hover:text-slate-800 disabled:opacity-50"
                  >
                    Resend code
                  </button>
                  <span className="mx-2 text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={switchToEmailStep}
                    className="text-sm text-slate-600 hover:text-slate-800"
                  >
                    Use different email
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* --- Password flow --- */
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-800 focus:ring-slate-800 sm:text-sm p-2 border"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-800 focus:ring-slate-800 sm:text-sm p-2 border"
              />
            </div>
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-800 focus:ring-slate-800 sm:text-sm p-2 border"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-800 focus:ring-slate-800 sm:text-sm p-2 border"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-800 focus:ring-slate-800 sm:text-sm p-2 border"
                />
              </div>
            )}

            <button
              onClick={handlePasswordSubmit}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800"
            >
              {isLogin ? "Sign In" : "Sign Up"}
            </button>

            {isLogin && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={formData.rememberMe || false}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                    className="h-4 w-4 text-slate-800 focus:ring-slate-800 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="/auth/forgot-password" className="font-medium text-slate-600 hover:text-slate-500">
                    Forgot your password?
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setOtpStep("email");
              setError("");
            }}
            className="text-sm text-red-600 hover:text-red-700"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </main>
    </div>
  );
}
