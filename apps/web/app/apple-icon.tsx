import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#f8fafc",
        borderRadius: 36,
        color: "#0f172a",
        display: "flex",
        fontSize: 58,
        fontWeight: 700,
        height: "100%",
        justifyContent: "center",
        letterSpacing: -3,
        width: "100%"
      }}
    >
      HC
    </div>,
    size
  );
}
