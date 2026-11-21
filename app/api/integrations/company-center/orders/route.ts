import {createHmac,timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
import {z} from "zod";
import {statuses,type Status} from "@/lib/types";

export const runtime="nodejs";
export const dynamic="force-dynamic";

/**
 * Integration endpoint for COMPANY CENTER in an isolated OMS preview.
 * MUST NOT be configured with the production DATABASE_URL or a shipping key
 * until cross-service authorization, full restore rehearsal, and staged
 * end-to-end tests pass.
 *
 * Never dispatches Tala shipments. Existing OMS /api/shipping-integrations/tala
 * remains the only source of carrier side effects.
 */
const allowed:Partial<Record<Status,Status[]>>={
  new:["contacted","confirmed","cancelled"],
  contacted:["confirmed","postponed","cancelled"],
  confirmed:["preparing","cancelled","postponed"],
  preparing:["shipped","cancelled","postponed"],
  shipped:["delivered","refused","returned","postponed"],
  postponed:["contacted","confirmed","preparing"],
  refused:["returned"],
};
const Input=z.object({
  requestId:z.string().uuid(),
  orderId:z.string().uuid(),
  brand:z.enum(["homey","sodfa"]),
  expectedVersion:z.number().int().min(0),
  status:z.enum(statuses as [Status,...Status[]]),
  actorId:z.string().uuid(),
});
const noStore={"Cache-Control":"no-store"};
function deny(msg:string,status=403){return NextResponse.json({error:msg},{status,headers:noStore})}
export async function POST(request:Request){
  const secret=process.env.COMPANY_CENTER_API_SECRET;
  if(!secret||secret.length<32)return deny("INTEGRATION_NOT_CONFIGURED",503);
  const ts=request.headers.get("x-company-timestamp")??"";
  const signature=request.headers.get("x-company-signature")??"";
  if(!/^\d{13}$/.test(ts)||Math.abs(Date.now()-Number(ts))>120000)return deny("STALE_SIGNATURE",401);
  const raw=await request.text();
  if(raw.length>16000||!/^v1\.[a-f0-9]{64}$/.test(signature))return deny("INVALID_SIGNATURE",401);
  const expected="v1."+createHmac("sha256",secret).update(ts+"."+raw).digest("hex");
  const a=Buffer.from(signature),b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b))return deny("INVALID_SIGNATURE",401);
  const parsed=Input.safeParse(JSON.parse(raw));
  if(!parsed.success)return deny("INVALID_PAYLOAD",400);
  const data=parsed.data;
  const dbUrl=process.env.DATABASE_URL;
  if(!dbUrl)return deny("DATABASE_NOT_CONFIGURED",503);
  const db=neon(dbUrl);
  // Use a single transaction-equivalent SQL CTE to change status AND audit
  // only when optimistic version and brand match.
  const existing=await db`SELECT id::text,status,version,brand,deleted_at
    FROM orders WHERE id=${data.orderId}::uuid AND brand=${data.brand} LIMIT 1`;
  if(!existing.length||existing[0].deleted_at)return deny("NOT_FOUND",404);
  const before=String(existing[0].status) as Status;
  if(before===data.status&&Number(existing[0].version)===data.expectedVersion){
    return NextResponse.json({ok:true,unchanged:true,status:before,version:data.expectedVersion},{headers:noStore});
  }
  if(!allowed[before]?.includes(data.status))return deny("STATUS_TRANSITION_NOT_ALLOWED",409);
  const result=await db`
    WITH updated AS (
      UPDATE orders SET status=${data.status},version=version+1,updated_at=now()
      WHERE id=${data.orderId}::uuid AND brand=${data.brand}
        AND status=${before} AND version=${data.expectedVersion} AND deleted_at IS NULL
      RETURNING id,brand,status,version
    ), inserted_audit AS (
      INSERT INTO audit_log(actor,action,entity,entity_id,brand,details)
      SELECT ${data.actorId},'central_status_update','order',id::text,brand,
        json_build_object('from',${before}::text,'to',status,'requestId',${data.requestId})::text
      FROM updated RETURNING entity_id
    )
    SELECT u.id::text,u.status,u.version FROM updated u INNER JOIN inserted_audit a ON a.entity_id=u.id::text
  `;
  if(!result.length)return deny("STALE_ORDER_VERSION",409);
  return NextResponse.json({ok:true,id:result[0].id,status:result[0].status,version:result[0].version},{headers:noStore});
}
