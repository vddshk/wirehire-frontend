export default function ReferenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "#fff",
        overflowY: "auto",
      }}
    >
      {children}
    </div>
  );
}
