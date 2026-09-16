import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'codedrop-default-dev-secret-key-change-in-prod';
  return secret;
};

export const AUTH_COOKIE_NAME = 'codedrop_session';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(getJwtSecretKey()));
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(getJwtSecretKey()));
    return verified.payload as { userId: string };
  } catch (err) {
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export async function getAuthFromRequest(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  
  const verified = await verifyToken(token);
  if (!verified) return null;
  
  return verified.userId;
}
