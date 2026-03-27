```typescript
import { GET, POST } from '@/app/api/ping/route';
import { NextRequest, NextResponse } from 'next/server';

describe('Ping Endpoint', () => {
  describe('GET /api/ping', () => {
    it('should return correct response format with ok and timestamp fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/ping', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('ok');
      expect(data).toHaveProperty('timestamp');
    });

    it('should return ok as true', async () => {
      const request = new NextRequest('http://localhost:3000/api/ping', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.ok).toBe(true);
    });

    it('should return valid ISO 8601 timestamp', async () => {
      const request = new NextRequest('http://localhost:3000/api/ping', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(typeof data.timestamp).toBe('string');
      expect(() => new Date(data.timestamp)).not.toThrow();
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return Content-Type application/json header', async () => {
      const request = new NextRequest('http://localhost:3000/api/ping', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should return HTTP 200 status code', async () => {
      const request = new NextRequest('http://localhost:3000/api/ping', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/ping', () => {
    it('should return correct response format with ok and timestamp fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/ping', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('ok');
      expect(data).toHaveProperty('timestamp');
    });

    it('should return ok as true', async () => {
      const request = new NextRequest('http://localhost:3000/api/ping', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.ok).toBe(true);
    });

    it('should return valid ISO 8601 timestamp', async () => {
      const request = new NextRequest