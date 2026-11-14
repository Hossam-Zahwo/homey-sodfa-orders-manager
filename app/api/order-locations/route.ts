import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
import {getOrderLocations} from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
 const blocked = await requireAccess(request);
 if (blocked) return blocked;
 try {
  return NextResponse.json({data: await getOrderLocations()});
 } catch {
  return NextResponse.json({error: 'تعذر تحميل المحافظات والمدن. حاول تاني.'}, {status: 503});
 }
}
