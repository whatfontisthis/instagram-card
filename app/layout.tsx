import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "인스타그램 카드 생성기",
  description: "AI 뉴스 URL을 인스타그램 캐러셀로 변환합니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
