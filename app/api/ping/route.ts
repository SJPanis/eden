```typescript
import { NextRequest, NextResponse } from 'next/server';

interface PingResponse {
  ok: boolean;
  timestamp: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<PingResponse>> {
  const pingResponse: PingResponse = {
    ok: true,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(pingResponse, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse<PingResponse>> {
  const pingResponse: PingResponse = {
    ok: true,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(pingResponse, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
```