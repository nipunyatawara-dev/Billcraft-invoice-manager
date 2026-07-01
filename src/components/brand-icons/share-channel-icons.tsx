type ShareChannelIconProps = {
  src: string;
  alt: string;
  className?: string;
};

/** Brand logos sourced from https://thesvg.org/ */
export function ShareChannelIcon({ src, alt, className = "size-5 shrink-0" }: ShareChannelIconProps) {
  return <img src={src} alt={alt} className={className} draggable={false} />;
}

export const SHARE_CHANNEL_ICONS = {
  messages: "/brand/google-messages.svg",
  whatsapp: "/brand/whatsapp.svg",
  gmail: "/brand/gmail.svg",
} as const;
