'use client';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';
let current:SupabaseClient|null=null;
export function browserAuth(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw new Error('Supabase Auth لم يتم ضبطه على Vercel');
 return current ??=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
}
