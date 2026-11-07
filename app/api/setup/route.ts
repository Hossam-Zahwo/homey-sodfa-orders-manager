import {NextResponse} from 'next/server';
export async function POST(){return NextResponse.json({error:'Google Sheets integration was removed; run supabase/schema.sql on the new Supabase project.'},{status:410})}
