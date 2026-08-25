import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Nicbeautty Lash Designer Specialist";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0c 0%, #18181e 60%, #2a1f18 100%)",
          color: "#d8a37d",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, letterSpacing: 14, color: "#b8825c" }}>
          - - -
        </div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, marginTop: 24 }}>
          nicbeautty
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 10,
            marginTop: 16,
            color: "#a1a1a8",
          }}
        >
          LASH DESIGNER SPECIALIST
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            marginTop: 48,
            padding: "14px 42px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #f0cbb0, #d8a37d, #b8825c)",
            color: "#14100c",
            fontWeight: 700,
          }}
        >
          Agende seu horário online
        </div>
      </div>
    ),
    size
  );
}
