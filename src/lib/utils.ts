import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFollowers(count: number): string {
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(count);
}

export function formatEngagement(
  likes: number,
  comments: number,
  shares: number,
  followers: number,
): string {
  if (!followers) return "—";
  const rate = ((likes + comments + shares) / followers) * 100;
  return rate.toFixed(1) + "%";
}
