/**
 * Display Registration Page
 * REQ-3-003: Register and manage display devices
 * REQ-3-030: QR code for easy setup
 */

export const dynamic = 'force-dynamic';

import DisplaysClient from './DisplaysClient';

export default function DisplaysPage() {
  return <DisplaysClient />;
}
