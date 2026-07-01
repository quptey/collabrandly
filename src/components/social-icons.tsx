import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { className?: string };

export function InstagramIcon({ className, ...props }: IconProps) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <defs>
        <linearGradient
          id={`ig-${id}`}
          x1="0"
          y1="0"
          x2="24"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#833AB4" />
          <stop offset="25%" stopColor="#C13584" />
          <stop offset="50%" stopColor="#E1306C" />
          <stop offset="75%" stopColor="#F77737" />
          <stop offset="100%" stopColor="#FCAF45" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" fill={`url(#ig-${id})`} />
      <rect
        x="3.5"
        y="5"
        width="17"
        height="14"
        rx="3"
        stroke="white"
        strokeWidth="1.6"
        fill="none"
      />
      <circle cx="12" cy="12" r="4.2" stroke="white" strokeWidth="1.6" fill="none" />
      <circle cx="18.5" cy="7.5" r="1.3" fill="white" />
    </svg>
  );
}

export function TikTokIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" fill="#010101" />
      <path
        d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
        fill="white"
      />
    </svg>
  );
}

export function YouTubeIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" fill="#FF0000" />
      <polygon points="9.5,7 18,12 9.5,17" fill="white" />
    </svg>
  );
}

export function TelegramIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="12" r="11.5" fill="#0088CC" />
      <path d="M5.5 12.5l4 1.5 2 4.5 7-10z" fill="white" />
      <path
        d="M5.5 12.5l4 1.5 7-4"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function XIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        fill="#000000"
      />
    </svg>
  );
}

export function FacebookIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" fill="#1877F2" />
      <path
        d="M16 8.5h-2.5a1 1 0 00-1 1V12h3.5l-.5 3H12.5v7.5H9V15H6.5v-3H9v-2.5a4 4 0 014-4H16v3z"
        fill="white"
      />
    </svg>
  );
}

export function LinkedInIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" fill="#0A66C2" />
      <path
        d="M6.5 10.5h2.5v7H6.5v-7zm1.25-1.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM11 10.5h2.4v1.1h.03c.34-.64 1.16-1.1 2.2-1.1 2.35 0 2.78 1.55 2.78 3.57v4.23h-2.6v-3.76c0-.9-.02-2.05-1.25-2.05s-1.44.98-1.44 1.99v3.82H11v-6.8z"
        fill="white"
      />
    </svg>
  );
}

export function PinterestIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="12" r="11.5" fill="#E60023" />
      <path
        d="M12 4a8 8 0 00-2.8 15.5c-.1-.6-.2-1.6 0-2.3l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2.8.4 1.5 1.2 1.5 1.5 0 2.6-1.9 2.6-4.2 0-1.7-1.1-3-3.2-3-2.3 0-3.8 1.8-3.8 3.8 0 .7.2 1.2.6 1.6.2.2.2.3.1.5l-.4 1.4c-.1.3-.3.4-.6.3-1-.4-1.5-1.5-1.5-2.8 0-2.1 1.8-4.6 5.2-4.6 2.8 0 4.6 2 4.6 4.2 0 2.9-1.6 5-4 5-.8 0-1.5-.4-1.8-1l-.5 2c-.2.7-.7 1.5-1.1 2A8 8 0 1020 12a8 8 0 00-8-8z"
        fill="white"
      />
    </svg>
  );
}
