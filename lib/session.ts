import {createHmac, timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
const COOKIE='orders_session';
function signature(payload:string){return createHmac('sha256',process.env.SESSION_SECRET || 'not-configured').update(payload).digest('base64url')}
export function ready(){return Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length>=32 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)}
export function issueSession(email:string){const payload=Buffer.from(JSON.stringify({email,exp:Date.now()+7*86400000})).toString('base64url'); return payload+'.'+signature(payload)}
export function validate(token?:string){if(!token||!ready())return false; const [payload,mac]=token.split('.');if(!payload||!mac)return false;const actual=Buffer.from(signature(payload)), supplied=Buffer.from(mac);if(actual.length!==supplied.length||!timingSafeEqual(actual,supplied))return false;try{const value=JSON.parse(Buffer.from(payload,'base64url').toString());return value.exp>Date.now()&&value.email===process.env.ADMIN_EMAIL}catch{return false}}
export async function authed(){return validate((await cookies()).get(COOKIE)?.value)}
export const cookieName=COOKIE;
