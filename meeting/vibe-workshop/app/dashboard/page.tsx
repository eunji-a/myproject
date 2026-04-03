"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Signup {
  id: number;
  created_at: string;
  name: string;
  email: string;
  department: string;
  position: string;
  ai_experience: string;
  learning_goal: string;
  dietary_restrictions?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORANGE = "#ff6b35";
const NAVY = "#0f1a35";
const BORDER = "#1e2d52";
const BG = "#0b1225";

const CHART_COLORS = [
  "#ff6b35", "#4e8ef7", "#a78bfa", "#34d399", "#fbbf24",
  "#f472b6", "#60a5fa", "#fb923c",
];

function countBy(items: Signup[], key: keyof Signup): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const val = String(item[key] ?? "기타");
    acc[val] = (acc[val] ?? 0) + 1;
    return acc;
  }, {});
}

function makeDonut(counts: Record<string, number>) {
  const labels = Object.keys(counts);
  return {
    labels,
    datasets: [
      {
        data: labels.map((l) => counts[l]),
        backgroundColor: CHART_COLORS.slice(0, labels.length),
        borderColor: NAVY,
        borderWidth: 3,
      },
    ],
  };
}

function makeBar(counts: Record<string, number>) {
  const labels = Object.keys(counts);
  return {
    labels,
    datasets: [
      {
        data: labels.map((l) => counts[l]),
        backgroundColor: ORANGE,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };
}

const donutOptions = {
  plugins: { legend: { labels: { color: "#94a3b8", font: { size: 12 } } } },
  cutout: "65%",
};

const barOptions = {
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e2d52" } },
    y: {
      ticks: { color: "#94a3b8", stepSize: 1 },
      grid: { color: "#1e2d52" },
      beginAtZero: true,
    },
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-xl p-5 border flex flex-col gap-1"
      style={{ backgroundColor: NAVY, borderColor: BORDER }}
    >
      <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-white text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: NAVY, borderColor: BORDER }}
    >
      <p className="text-white font-semibold mb-4">{title}</p>
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("signups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setSignups(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = signups.filter(
    (s) =>
      s.name.includes(search) ||
      s.email.includes(search) ||
      s.department.includes(search)
  );

  const deptCounts = countBy(signups, "department");
  const expCounts = countBy(signups, "ai_experience");
  const goalCounts = countBy(signups, "learning_goal");
  const posCounts = countBy(signups, "position");

  // ── Loading / Error ──
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <p className="text-slate-400 animate-pulse">데이터 불러오는 중...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <p className="text-red-400">오류: {error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16 px-4" style={{ backgroundColor: BG }}>
      {/* ── Header ── */}
      <div className="max-w-6xl mx-auto pt-10 mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#ff6b35]/10 border border-[#ff6b35]/30 rounded-full px-4 py-1.5 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#ff6b35] animate-pulse" />
            <span className="text-[#ff6b35] text-sm font-medium">관리자 전용</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">신청자 대시보드</h1>
          <p className="text-slate-400 text-sm mt-1">AI 바이브 코딩 마스터클래스 · 4월 2일</p>
        </div>
        <a
          href="/"
          className="text-slate-400 text-sm border border-slate-700 rounded-lg px-4 py-2 hover:border-slate-500 transition-colors"
        >
          ← 신청 페이지
        </a>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="총 신청자" value={signups.length} />
          <StatCard label="부서 수" value={Object.keys(deptCounts).length} />
          <StatCard
            label="가장 많은 부서"
            value={
              Object.keys(deptCounts).sort((a, b) => deptCounts[b] - deptCounts[a])[0] ?? "-"
            }
          />
          <StatCard
            label="식이 제한 있음"
            value={signups.filter((s) => s.dietary_restrictions).length}
          />
        </div>

        {/* ── Charts Row 1 ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ChartCard title="부서별 신청 현황">
            <div className="flex justify-center">
              <div style={{ width: 260, height: 260 }}>
                <Doughnut data={makeDonut(deptCounts)} options={donutOptions} />
              </div>
            </div>
          </ChartCard>

          <ChartCard title="AI 도구 사용 경험">
            <Bar data={makeBar(expCounts)} options={barOptions} />
          </ChartCard>
        </div>

        {/* ── Charts Row 2 ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ChartCard title="배우고 싶은 것">
            <Bar data={makeBar(goalCounts)} options={barOptions} />
          </ChartCard>

          <ChartCard title="직급별 분포">
            <div className="flex justify-center">
              <div style={{ width: 240, height: 240 }}>
                <Doughnut data={makeDonut(posCounts)} options={donutOptions} />
              </div>
            </div>
          </ChartCard>
        </div>

        {/* ── Table ── */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: NAVY, borderColor: BORDER }}
        >
          <div className="p-5 flex items-center justify-between flex-wrap gap-3 border-b" style={{ borderColor: BORDER }}>
            <p className="text-white font-semibold">신청자 목록</p>
            <input
              type="text"
              placeholder="이름 · 이메일 · 부서 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
              style={{ backgroundColor: BG }}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b" style={{ borderColor: BORDER }}>
                  {["이름", "이메일", "부서", "직급", "AI 경험", "학습 목표", "식이 제한", "신청일"].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 whitespace-nowrap font-medium">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-slate-500 py-10">
                      신청자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, i) => (
                    <tr
                      key={s.id}
                      className="border-b transition-colors hover:bg-white/5"
                      style={{ borderColor: BORDER, backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}
                    >
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{s.name}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{s.email}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{s.department}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{s.position}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{s.ai_experience}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{s.learning_goal}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {s.dietary_restrictions || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString("ko-KR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="mt-16 text-center">
        <p className="text-slate-600 text-xs">Powered by Listeningmind ☕</p>
      </footer>
    </main>
  );
}
