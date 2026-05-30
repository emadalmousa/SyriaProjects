interface CardProps {
  children: React.ReactNode;
  className?: string;
  shadow?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className = "", shadow = true, style }: CardProps) {
  return (
    <div
      className={`rounded-card border border-line bg-surface ${className}`}
      style={style ?? (shadow ? { boxShadow: "var(--sh-sm)" } : undefined)}
    >
      {children}
    </div>
  );
}
