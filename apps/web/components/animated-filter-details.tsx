"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import styles from "@/components/filter-sort-section.module.css";

export function AnimatedFilterDetails({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => () => animationRef.current?.cancel(), []);

  function toggle(event: MouseEvent<HTMLElement>) {
    const details = detailsRef.current;
    if (!details) return;

    event.preventDefault();
    const opening = details.dataset.expanded === undefined ? !details.open : details.dataset.expanded !== "true";
    const startHeight = details.getBoundingClientRect().height;
    animationRef.current?.cancel();
    animationRef.current = null;
    details.dataset.expanded = String(opening);

    if (matchMedia("(prefers-reduced-motion: reduce)").matches || typeof details.animate !== "function") {
      details.open = opening;
      details.style.overflow = "";
      return;
    }

    details.open = true;
    const computedStyle = getComputedStyle(details);
    const endHeight = opening
      ? details.getBoundingClientRect().height
      : event.currentTarget.getBoundingClientRect().height +
        parseFloat(computedStyle.paddingTop) +
        parseFloat(computedStyle.paddingBottom) +
        parseFloat(computedStyle.borderTopWidth) +
        parseFloat(computedStyle.borderBottomWidth);

    details.style.overflow = "hidden";
    const animation = details.animate({ height: [`${startHeight}px`, `${endHeight}px`] }, { duration: 240, easing: "ease-in-out", fill: "both" });
    animationRef.current = animation;
    animation.onfinish = () => {
      details.open = opening;
      animation.cancel();
      animationRef.current = null;
      details.style.overflow = "";
    };
  }

  return (
    <details ref={detailsRef} className={styles.card}>
      <summary className={styles.filtersSummary} onClick={toggle}>
        {summary}
      </summary>
      {children}
    </details>
  );
}
