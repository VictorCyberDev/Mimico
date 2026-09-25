"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * The prototype's `.reveal` scroll animation, driven by Motion's whileInView
 * rather than a hand-rolled IntersectionObserver. Same values as the CSS it
 * replaces: 24px rise, --dur-large (700ms), --ease-soft.
 *
 * The hidden initial state is applied only after mount. Server-rendered
 * markup therefore ships visible, so the page still reads if JS never
 * arrives or hydration fails, instead of leaving opacity:0 baked into the
 * HTML with nothing around to animate it back.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
