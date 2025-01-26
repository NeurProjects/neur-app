import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../middleware';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ headers: new Map() })),
    redirect: jest.fn((url) => ({ url, headers: new Map() }))
  }
}));

describe('Middleware Authentication', () => {
  let mockRequest: Partial<NextRequest>;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup basic mock request
    mockRequest = {
      nextUrl: new URL('http://localhost:3000/dashboard'),
      cookies: {
        get: jest.fn()
      }
    };
  });

  // Test public paths
  test('should allow access to public paths without authentication', async () => {
    mockRequest.nextUrl = new URL('http://localhost:3000/');
    const response = await middleware(mockRequest as NextRequest);
    expect(NextResponse.next).toHaveBeenCalled();
  });

  // Test OAuth flow
  test('should allow OAuth flow without authentication', async () => {
    mockRequest.nextUrl = new URL('http://localhost:3000/callback?privy_oauth_code=123');
    const response = await middleware(mockRequest as NextRequest);
    expect(NextResponse.next).toHaveBeenCalled();
  });

  // Test authenticated requests
  test('should allow access when properly authenticated', async () => {
    mockRequest.cookies.get = jest.fn((name) => ({
      value: name === 'privy-token' ? 'valid-token' : null
    }));
    const response = await middleware(mockRequest as NextRequest);
    expect(NextResponse.next).toHaveBeenCalled();
  });

  // Test token refresh flow
  test('should redirect to refresh when session exists but no auth token', async () => {
    mockRequest.cookies.get = jest.fn((name) => ({
      value: name === 'privy-session' ? 'valid-session' : null
    }));
    const response = await middleware(mockRequest as NextRequest);
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/refresh'),
      expect.any(Object)
    );
  });

  // Test unauthenticated requests
  test('should redirect to login when no authentication present', async () => {
    mockRequest.cookies.get = jest.fn(() => null);
    const response = await middleware(mockRequest as NextRequest);
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/'),
      expect.any(Object)
    );
  });

  // Test error handling
  test('should redirect to error page on unexpected errors', async () => {
    mockRequest.cookies.get = jest.fn(() => {
      throw new Error('Unexpected error');
    });
    const response = await middleware(mockRequest as NextRequest);
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/error'),
      expect.any(Object)
    );
  });

  // Test security headers
  test('should add security headers to successful responses', async () => {
    mockRequest.cookies.get = jest.fn((name) => ({
      value: name === 'privy-token' ? 'valid-token' : null
    }));
    const response = await middleware(mockRequest as NextRequest);
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('Permissions-Policy')).toBeTruthy();
  });
});