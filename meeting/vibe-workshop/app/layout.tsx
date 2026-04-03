import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 바이브 코딩 마스터클래스 | 사내 강의 신청",
  description: "코딩 없이 AI로 업무 도구를 만드는 법 — 4월 2일 본사 대회의실",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  );
}
