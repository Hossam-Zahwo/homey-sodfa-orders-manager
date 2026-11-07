import {NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// Netlify Edge guard validates Identity and ALLOWED_EMAILS on /api/* before this route.
export async function GET(){return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}})}
