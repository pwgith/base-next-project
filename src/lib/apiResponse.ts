/**
 * Shared HTTP response helpers.
 * Keeps route handlers thin — no inline NextResponse.json() calls.
 */

import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, code?: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status: 400 });
}

export function unauthorized(message = "Authentication required.", headers?: Record<string, string>): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 401, headers });
}

export function forbidden(message = "Access denied."): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 403 });
}

export function notFound(message = "Resource not found."): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 404 });
}

export function conflict(message: string): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 409 });
}

export function unprocessableEntity(message: string): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 422 });
}

export function internalError(
  message = "An unexpected error occurred.",
): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 500 });
}

export function badGateway(
  message: string,
  code?: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status: 502 });
}
