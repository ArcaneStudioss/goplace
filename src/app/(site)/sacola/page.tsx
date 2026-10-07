import type { Metadata } from "next";
import { lerConfig } from "@/lib/config";
import { TelaSacola } from "./TelaSacola";

export const metadata: Metadata = { title: "Sacola", robots: { index: false } };

export default async function Sacola() {
  const config = await lerConfig();
  return <TelaSacola parcelasMax={config.parcelasMax} />;
}
