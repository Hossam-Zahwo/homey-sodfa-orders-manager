import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(r:Request){const blocked=await requireAccess(r);if(blocked)return blocked;return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}})}
