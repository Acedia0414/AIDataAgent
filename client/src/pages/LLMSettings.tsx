/**
 * LLM Settings Page
 * Standalone page for LLM configuration management
 */

import { PageHeader } from "@/components/PageHeader";
import { LLMSettingsSection } from "@/components/LLMSettingsSection";

export default function LLMSettings() {
  return (
    <>
      <PageHeader title="LLM Configuration" />
      <LLMSettingsSection isEmbedded={false} />
    </>
  );
}
