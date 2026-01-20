/**
 * Display Settings Editor Page
 * REQ-3-012: Customize individual display settings
 */

export const dynamic = 'force-dynamic';

import DisplaySettingsClient from './DisplaySettingsClient';

export default function DisplaySettingsPage({ params }: { params: Promise<{ id: string }> }) {
  return <DisplaySettingsClient params={params} />;
}
