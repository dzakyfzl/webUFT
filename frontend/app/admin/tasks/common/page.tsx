"use client";

import TaskBoard from "../task-board";
import { PageHeading } from "../../ui";

export default function CommonBoardPage() {
  return <><PageHeading title="Umum UKM" description="Tugas bersama yang dapat dikerjakan seluruh pengurus aktif."/><TaskBoard initialView="ORGANIZATION"/></>;
}
