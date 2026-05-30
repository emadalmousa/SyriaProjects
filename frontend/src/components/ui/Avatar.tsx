import type { User } from "@/types";

const COLORS = [
  "bg-emerald-600","bg-violet-600","bg-amber-600",
  "bg-rose-600","bg-sky-600","bg-teal-600",
];

interface AvatarProps {
  user: Pick<User, "id" | "first_name" | "last_name" | "email" | "avatar_url">;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-16 w-16 text-xl" };

export function Avatar({ user, size = "md", className = "" }: AvatarProps) {
  const initials =
    [user.first_name, user.last_name]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || user.email[0].toUpperCase();

  const color = COLORS[user.id % COLORS.length];
  const sizeClass = SIZES[size];

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={initials}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${sizeClass} ${className}`}
    >
      {initials}
    </div>
  );
}
