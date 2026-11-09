import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const roofSvgB64 = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 4" preserveAspectRatio="none"><polygon points="5,0 10,4 0,4" fill="#f1f5f9"/></svg>'
).toString("base64");

export default function AppleIcon() {
  const w = 180;
  const s = (n: number) => Math.round((n * w) / 512);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(150deg, #1e293b 0%, #0f172a 100%)"
      }}
    >
      <img src={`data:image/svg+xml;base64,${roofSvgB64}`} width={s(280)} height={s(108)} alt="" style={{ display: "block" }} />
      <div
        style={{
          width: s(250),
          height: s(200),
          background: "#f1f5f9",
          borderRadius: `0 0 ${s(16)}px ${s(16)}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: s(22),
          paddingBottom: s(22),
          paddingLeft: s(34),
          paddingRight: s(34),
          gap: s(18)
        }}
      >
        <div style={{ height: s(15), width: "90%", background: "#1d4ed8", borderRadius: s(8), flexShrink: 0 }} />
        <div style={{ height: s(15), width: "74%", background: "#2563eb", borderRadius: s(8), flexShrink: 0 }} />
        <div style={{ height: s(15), width: "56%", background: "#60a5fa", borderRadius: s(8), flexShrink: 0 }} />
      </div>
    </div>,
    size
  );
}
