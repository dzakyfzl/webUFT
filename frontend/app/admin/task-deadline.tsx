"use client";

import { useEffect, useState } from "react";
import { dateLabel } from "./ui";

const jakartaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });

export function useJakartaDay() {
  const readDay = () => jakartaDate.format(new Date());
  const [day, setDay] = useState(readDay);
  useEffect(() => {
    const update = () => setDay(readDay());
    const timer = setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  return day;
}

export function TaskDeadline({ deadline, today, done = false }: { deadline: string; today: string; done?: boolean }) {
  const days = (Date.parse(deadline) - Date.parse(today)) / 86_400_000;
  const tone = done || days > 7 ? "" : days < 0 ? "overdue" : days === 0 ? "today" : days <= 2 ? "soon" : "week";
  const label = tone === "overdue" ? `Terlambat ${-days} hari` : tone === "today" ? "Hari ini" : tone ? days === 1 ? "Besok" : `${days} hari lagi` : dateLabel(deadline);
  return <time dateTime={deadline} className="erp-deadline" data-urgency={tone || undefined} title={dateLabel(deadline)}>{label}</time>;
}
