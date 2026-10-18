type Props = {
  /** Rendered size in px (square). The spec is drawn on a 64×64 box. */
  size?: number;
  /** Set when the robot carries meaning on its own; otherwise it is decorative. */
  label?: string;
  className?: string;
};

/**
 * Future Me robot (handoff §4), drawn as vector shapes on a 64×64 box. Colors are tokens.
 * Antenna, ears, head (stroke inside), face screen, two eyes and a smile.
 */
export function FutureMeRobot({ size = 64, label, className }: Props) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...a11y}>
      {/* antenna */}
      <rect x="30" y="6" width="4" height="10" fill="var(--tt-color-robot-outline)" />
      <rect x="27" y="0" width="10" height="10" rx="5" fill="var(--tt-color-robot-antenna)" />
      {/* ears */}
      <rect x="0" y="32" width="6" height="14" rx="3" fill="var(--tt-color-robot-outline)" />
      <rect x="58" y="32" width="6" height="14" rx="3" fill="var(--tt-color-robot-outline)" />
      {/* head: 56×48, radius 18, 2.5 stroke kept inside the box */}
      <rect
        x="5.25"
        y="15.25"
        width="53.5"
        height="45.5"
        rx="16.75"
        fill="var(--tt-color-robot-body)"
        stroke="var(--tt-color-robot-outline)"
        strokeWidth="2.5"
      />
      {/* face screen */}
      <rect x="11" y="22" width="42" height="30" rx="12" fill="var(--tt-color-robot-screen)" />
      {/* eyes and smile */}
      <rect x="20" y="30" width="7" height="10" rx="3.5" fill="var(--tt-color-robot-face)" />
      <rect x="37" y="30" width="7" height="10" rx="3.5" fill="var(--tt-color-robot-face)" />
      <rect x="26" y="44" width="12" height="3" rx="1.5" fill="var(--tt-color-robot-face)" />
    </svg>
  );
}
