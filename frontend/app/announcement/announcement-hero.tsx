"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import type { ReactNode } from "react";
import { useReducedMotion } from "../lib/motion-preference";
import styles from "./announcement.module.css";

export function AnnouncementHero({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const photoY = useTransform(scrollY, [0, 440], ["0%", "17%"]);
  const frameY = useTransform(scrollY, [0, 440], [0, -46]);

  return (
    <section className={styles.hero} aria-labelledby="announcement-title">
      <motion.div aria-hidden="true" className={styles.photo} style={reduced ? undefined : { y: photoY }}>
        <Image src="/announcement-camera.webp" alt="" fill sizes="(max-width: 639px) 100vw, (max-width: 1280px) 78vw, 980px" preload />
      </motion.div>
      <div className={styles.wash} aria-hidden="true" />
      <motion.div aria-hidden="true" className={styles.viewfinder} style={reduced ? undefined : { y: frameY }}>
        <i /><i /><i /><i />
      </motion.div>
      <div className={styles.heroContent}>{children}</div>
    </section>
  );
}
