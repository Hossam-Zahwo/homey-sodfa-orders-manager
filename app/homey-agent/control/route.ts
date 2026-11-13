import { requireAccess } from '@/lib/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function control(request: Request) {
  const blocked = await requireAccess(request);
  if (blocked) return blocked;
  const headers = { 'Cache-Control': 'private, no-store' };
  const base = process.env.HOMEY_AGENT_SERVICE_URL;
  const token = process.env.HOMEY_AGENT_CONTROL_TOKEN;
  if (!base || !token || token.length < 32) {
    return Response.json({ error: 'خدمة البوت لسه مش متوصلة.' }, { status: 503, headers });
  }

  let enabled: unknown;
  if (request.method === 'PUT') {
    const input = await request.json().catch(() => null);
    enabled = input?.enabled;
    if (typeof enabled !== 'boolean') {
      return Response.json({ error: 'حالة التشغيل غير صالحة.' }, { status: 400, headers });
    }
  }

  try {
    const url = new URL('/control', base);
    if (url.protocol !== 'https:') throw new Error('HTTPS is required');
    const upstream = await fetch(url, {
      method: request.method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: typeof enabled === 'boolean' ? JSON.stringify({ enabled }) : undefined,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (upstream.status === 409) {
      return Response.json({ error: 'الخدمة في وضع الاختبار.' }, { status: 409, headers });
    }
    if (!upstream.ok) throw new Error('Control service unavailable');
    const state = await upstream.json();
    if (!['live', 'shadow'].includes(state.mode) || typeof state.enabled !== 'boolean') {
      throw new Error('Invalid control response');
    }
    return Response.json({ mode: state.mode, enabled: state.enabled }, { headers });
  } catch {
    return Response.json({ error: 'تعذر التحقق من حالة البوت.' }, { status: 503, headers });
  }
}

export { control as GET, control as PUT };
