export default function AppLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading page"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
        padding: "1.25rem"
      }}
    >
      <div
        style={{
          width: "min(28rem, 100%)",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "1rem"
        }}
      >
        <div
          style={{
            height: "0.95rem",
            width: "40%",
            borderRadius: "999px",
            background: "#cbd5e1",
            marginBottom: "0.85rem"
          }}
        />
        <div
          style={{
            height: "2.75rem",
            borderRadius: "10px",
            background: "#e2e8f0",
            marginBottom: "0.7rem"
          }}
        />
        <div
          style={{
            height: "2.75rem",
            borderRadius: "10px",
            background: "#e2e8f0",
            marginBottom: "0.7rem"
          }}
        />
        <div
          style={{
            height: "2.75rem",
            borderRadius: "10px",
            background: "#e2e8f0"
          }}
        />
      </div>
    </main>
  );
}
