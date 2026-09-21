export default function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex flex-none items-center justify-center rounded-full bg-gold-100 text-gold-600"
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3.5C12 3.5 5.5 10.5 5.5 15a6.5 6.5 0 0013 0C18.5 10.5 12 3.5 12 3.5z" />
        <path d="M9 15a3 3 0 002.2 2.9" />
      </svg>
    </span>
  );
}
