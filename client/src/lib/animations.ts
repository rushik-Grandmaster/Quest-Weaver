import type { Variants, Transition } from "framer-motion";

/* ─── Easing curves ─────────────────────────────────────── */
export const EASE_OUT_EXPO   = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT     = [0.45, 0, 0.55, 1] as const;
export const EASE_SPRING     = { type: "spring", stiffness: 320, damping: 28 } as const;
export const EASE_SPRING_SOFT = { type: "spring", stiffness: 240, damping: 22 } as const;

/* ─── Page transition (blur + slide) ────────────────────── */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0,  filter: "blur(0px)" },
  exit:    { opacity: 0, y: -8, filter: "blur(10px)" },
};

export const pageTransition: Transition = {
  duration: 0.38,
  ease: EASE_OUT_EXPO,
};

/* ─── Fade-in with blur (cards, panels) ─────────────────── */
export const fadeUpBlur: Variants = {
  hidden:  { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0,  filter: "blur(0px)" },
};

export const fadeTransition: Transition = {
  duration: 0.42,
  ease: EASE_OUT_EXPO,
};

/* ─── Stagger container ─────────────────────────────────── */
export const staggerContainer: Variants = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

/* ─── Stagger child (for use inside staggerContainer) ────── */
export const staggerChild: Variants = {
  hidden:  { opacity: 0, y: 16, filter: "blur(5px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: EASE_OUT_EXPO },
  },
};

/* ─── Card hover (scale + glow) ─────────────────────────── */
export const cardHoverTap = {
  whileHover: { scale: 1.015, transition: EASE_SPRING },
  whileTap:   { scale: 0.975, transition: { duration: 0.1 } },
};

/* ─── Slide in from left (sidebar / drawer) ─────────────── */
export const slideInLeft: Variants = {
  hidden:  { opacity: 0, x: -24, filter: "blur(4px)" },
  visible: { opacity: 1, x: 0,   filter: "blur(0px)" },
};

/* ─── Slide in from bottom ───────────────────────────────── */
export const slideInBottom: Variants = {
  hidden:  { opacity: 0, y: 28, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0,  filter: "blur(0px)" },
};

/* ─── Pop (scale from 0.85) ─────────────────────────────── */
export const popIn: Variants = {
  hidden:  { opacity: 0, scale: 0.88, filter: "blur(6px)" },
  visible: { opacity: 1, scale: 1,    filter: "blur(0px)" },
};

/* ─── XP bar fill ────────────────────────────────────────── */
export const xpBarTransition: Transition = {
  duration: 1.0,
  ease: EASE_OUT_EXPO,
  delay: 0.25,
};
