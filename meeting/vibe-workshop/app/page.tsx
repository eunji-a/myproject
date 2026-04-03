"use client";

import { useState } from "react";
import { insertSignup } from "@/lib/supabase";

// ─── Icon Components ──────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LaptopIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  email: string;
  department: string;
  position: string;
  aiExperience: string;
  learningGoal: string;
  dietary: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = ["프로덕트", "마케팅", "세일즈", "컨설팅", "개발", "디자인", "경영지원", "기타"];
const POSITIONS = ["사원", "대리", "과장", "차장", "부장", "임원"];
const AI_EXPERIENCES = [
  "처음이에요",
  "ChatGPT 정도 써봤어요",
  "Claude도 써봤어요",
  "Claude Code까지 써봤어요",
];
const LEARNING_GOALS = ["업무 자동화", "데이터 분석", "웹서비스 만들기", "AI 도구 전반", "기타"];

const EVENT_INFO = [
  {
    icon: <CalendarIcon />,
    label: "일시",
    value: "2026년 4월 2일 (목) 오후 1시 – 5시 (4시간)",
  },
  {
    icon: <LocationIcon />,
    label: "장소",
    value: "본사 대회의실",
  },
  {
    icon: <UsersIcon />,
    label: "대상",
    value: "전 직원 (개발/비개발 무관)",
  },
  {
    icon: <LaptopIcon />,
    label: "준비물",
    value: "개인 노트북",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSubmittedEmails(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem("vibe-workshop-emails");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveEmail(email: string) {
  const emails = getSubmittedEmails();
  emails.add(email.toLowerCase());
  localStorage.setItem("vibe-workshop-emails", JSON.stringify([...emails]));
}

function isCompanyEmail(email: string): boolean {
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1];
  // 도메인이 있고 TLD가 포함된 유효한 이메일 형식
  return /^[^\s@]+\.[^\s@]{2,}$/.test(domain);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SelectField({
  label,
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  required,
}: {
  label: string;
  id: keyof FormData;
  value: string;
  onChange: (id: keyof FormData, value: string) => void;
  options: string[];
  placeholder: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-[#ff6b35] ml-1">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        className={`w-full px-4 py-3 rounded-xl bg-navy-800 border text-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent transition-all appearance-none cursor-pointer ${
          error ? "border-red-500" : "border-slate-600 hover:border-slate-400"
        }`}
        style={{ backgroundColor: "#0f1a35" }}
      >
        <option value="" disabled className="text-slate-500">
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    department: "",
    position: "",
    aiExperience: "",
    learningGoal: "",
    dietary: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = (id: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) newErrors.name = "이름을 입력해주세요.";

    if (!formData.email.trim()) {
      newErrors.email = "이메일을 입력해주세요.";
    } else if (!isCompanyEmail(formData.email)) {
      newErrors.email = "올바른 이메일 형식을 입력해주세요.";
    } else if (getSubmittedEmails().has(formData.email.toLowerCase())) {
      newErrors.email = "이미 신청된 이메일입니다.";
    }

    if (!formData.department) newErrors.department = "소속 팀/부서를 선택해주세요.";
    if (!formData.position) newErrors.position = "직급을 선택해주세요.";
    if (!formData.aiExperience) newErrors.aiExperience = "AI 도구 사용 경험을 선택해주세요.";
    if (!formData.learningGoal) newErrors.learningGoal = "배우고 싶은 것을 선택해주세요.";

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // 첫 번째 에러 필드로 스크롤
      const firstErrorKey = Object.keys(validationErrors)[0];
      document.getElementById(firstErrorKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
    await insertSignup({
      name: formData.name,
      email: formData.email,
      department: formData.department,
      position: formData.position,
      ai_experience: formData.aiExperience,
      learning_goal: formData.learningGoal,
      dietary_restrictions: formData.dietary || undefined,
    });

    saveEmail(formData.email);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setSubmitError(
        message.includes("duplicate") || message.includes("unique")
          ? "이미 신청된 이메일입니다."
          : "신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success Screen ──
  if (submitted) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
        style={{ backgroundColor: "#0b1225" }}
      >
        <div className="max-w-md w-full">
          <div className="text-[#ff6b35] mb-6">
            <CheckCircleIcon />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">신청이 완료되었습니다! 🎉</h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-2">
            당일 노트북 꼭 챙겨오세요.
          </p>
          <p className="text-slate-400 text-sm mt-6">
            4월 2일 오후 1시, 본사 대회의실에서 만나요.
          </p>
          <div className="mt-10 pt-6 border-t border-slate-700">
            <p className="text-slate-600 text-xs">Powered by Listeningmind ☕</p>
          </div>
        </div>
      </main>
    );
  }

  // ── Main Page ──
  return (
    <main className="min-h-screen pb-16" style={{ backgroundColor: "#0b1225" }}>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden pt-16 pb-14 px-4 text-center">
        {/* 배경 그라디언트 장식 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,107,53,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto">
          {/* 배지 */}
          <div className="inline-flex items-center gap-2 bg-[#ff6b35]/10 border border-[#ff6b35]/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#ff6b35] animate-pulse" />
            <span className="text-[#ff6b35] text-sm font-medium">사내 강의 신청</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-4">
            AI 바이브 코딩
            <br />
            <span style={{ color: "#ff6b35" }}>마스터클래스</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 font-medium mt-4">
            코딩 없이 AI로 업무 도구를 만드는 법
          </p>

          <div className="mt-3 text-slate-400 text-sm">
            강사: <span className="text-white font-medium">AI커피챗</span> (외부 초청 강사)
          </div>
        </div>
      </section>

      {/* ── Intro Text ── */}
      <section className="max-w-2xl mx-auto px-4 mb-12 text-center">
        <div
          className="rounded-2xl p-8 border"
          style={{ backgroundColor: "#0f1a35", borderColor: "#1e2d52" }}
        >
          <p className="text-slate-200 text-lg leading-relaxed">
            AI에게 말로 지시하면 앱이 만들어집니다.
            <br className="hidden sm:block" />
            코딩 경험이 전혀 없어도 괜찮아요.
          </p>
          <p className="text-[#ff6b35] font-semibold text-xl mt-4">
            4시간이면 여러분만의 업무 도구를 직접 만들 수 있습니다.
          </p>
        </div>
      </section>

      {/* ── Event Info ── */}
      <section className="max-w-2xl mx-auto px-4 mb-14">
        <h2 className="text-white font-bold text-xl mb-5">행사 안내</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EVENT_INFO.map(({ icon, label, value }) => (
            <div
              key={label}
              className="flex items-start gap-4 rounded-xl p-5 border"
              style={{ backgroundColor: "#0f1a35", borderColor: "#1e2d52" }}
            >
              <span className="text-[#ff6b35] mt-0.5 shrink-0">{icon}</span>
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">
                  {label}
                </p>
                <p className="text-white text-sm font-medium leading-snug">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Registration Form ── */}
      <section className="max-w-2xl mx-auto px-4">
        <h2 className="text-white font-bold text-xl mb-5">강의 신청</h2>
        <div
          className="rounded-2xl p-6 sm:p-8 border shadow-2xl"
          style={{
            backgroundColor: "#0f1a35",
            borderColor: "#1e2d52",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          }}
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* 이름 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">
                이름 <span className="text-[#ff6b35]">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="홍길동"
                className={`w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent border transition-all ${
                  errors.name ? "border-red-500" : "border-slate-600 hover:border-slate-400"
                }`}
                style={{ backgroundColor: "#0b1225" }}
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                이메일 <span className="text-[#ff6b35]">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="name@company.com"
                className={`w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent border transition-all ${
                  errors.email ? "border-red-500" : "border-slate-600 hover:border-slate-400"
                }`}
                style={{ backgroundColor: "#0b1225" }}
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* 소속 팀/부서 + 직급 (2열) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <SelectField
                label="소속 팀/부서"
                id="department"
                value={formData.department}
                onChange={handleChange}
                options={DEPARTMENTS}
                placeholder="선택해주세요"
                error={errors.department}
                required
              />
              <SelectField
                label="직급"
                id="position"
                value={formData.position}
                onChange={handleChange}
                options={POSITIONS}
                placeholder="선택해주세요"
                error={errors.position}
                required
              />
            </div>

            {/* AI 도구 사용 경험 */}
            <SelectField
              label="AI 도구 사용 경험"
              id="aiExperience"
              value={formData.aiExperience}
              onChange={handleChange}
              options={AI_EXPERIENCES}
              placeholder="현재 사용 수준을 선택해주세요"
              error={errors.aiExperience}
              required
            />

            {/* 배우고 싶은 것 */}
            <SelectField
              label="강의에서 가장 배우고 싶은 것"
              id="learningGoal"
              value={formData.learningGoal}
              onChange={handleChange}
              options={LEARNING_GOALS}
              placeholder="선택해주세요"
              error={errors.learningGoal}
              required
            />

            {/* 식이 제한/알레르기 (선택) */}
            <div>
              <label
                htmlFor="dietary"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                식이 제한이나 알레르기
                <span className="text-slate-500 font-normal ml-2">(선택)</span>
              </label>
              <input
                id="dietary"
                type="text"
                value={formData.dietary}
                onChange={(e) => handleChange("dietary", e.target.value)}
                placeholder="간식 준비 참고용"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent border border-slate-600 hover:border-slate-400 transition-all"
                style={{ backgroundColor: "#0b1225" }}
              />
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isSubmitting ? "#cc5528" : "#ff6b35",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e85a25";
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ff6b35";
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  처리 중...
                </span>
              ) : (
                "신청하기"
              )}
            </button>

            {submitError && (
              <p className="text-center text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                {submitError}
              </p>
            )}

            <p className="text-center text-slate-500 text-xs">
              <span className="text-[#ff6b35]">*</span> 표시는 필수 입력 항목입니다.
            </p>
          </form>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-16 text-center">
        <p className="text-slate-600 text-xs">Powered by Listeningmind ☕</p>
      </footer>
    </main>
  );
}
