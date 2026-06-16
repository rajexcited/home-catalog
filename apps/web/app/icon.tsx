import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
        color: "#f8fafc",
        display: "flex",
        fontSize: 120,
        fontWeight: 700,
        height: "100%",
        justifyContent: "center",
        letterSpacing: -8,
        width: "100%"
      }}
    >
      HC
    </div>,
    size
  );
}
