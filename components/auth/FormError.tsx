/**
 * The prototype only ever drew the happy path. A real backend fails, so
 * every auth form needs a visible error; styled with the caution tokens so
 * it belongs to the same system rather than looking bolted on.
 */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      style={{
        margin: "2px 0 0",
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        background: "var(--caution-tint)",
        color: "var(--caution)",
        fontSize: "var(--fs-small)",
        lineHeight: "var(--lh-normal)",
      }}
    >
      {message}
    </p>
  );
}
