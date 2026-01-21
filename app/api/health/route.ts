/**
 * Health Check API Endpoint
 *
 * Simple health check endpoint for monitoring application status.
 * Used by useHealthCheck hook for 24/7 display reliability.
 *
 * REQ-3-015: Automatic recovery from errors for always-on displays
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime?: number;
}

/**
 * GET /api/health
 *
 * Returns application health status.
 * Returns 200 for healthy, 503 for unhealthy.
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const response: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
