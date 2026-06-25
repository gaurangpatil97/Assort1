import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  const isProduction = process.env.NODE_ENV === 'production';
  response.headers.set('Set-Cookie', `token=; HttpOnly; Path=/; SameSite=Strict${isProduction ? '; Secure' : ''}; Max-Age=0`);
  return response;
}
