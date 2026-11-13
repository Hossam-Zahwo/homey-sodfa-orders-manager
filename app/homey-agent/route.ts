import { requireAccess } from '@/lib/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const blocked = await requireAccess(request);
  if (blocked) {
    if (blocked.status === 401) return Response.redirect(new URL('/', request.url), 303);
    return blocked;
  }

  return new Response(pilotPage, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; connect-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}

const pilotPage = String.raw`<!doctype html>
<html lang="ar" dir="rtl">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>هومي | تجربة مساعد الطلبات</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f7f7ef;color:#222c20;font:16px/1.6 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:36px 20px}h1{font-size:clamp(26px,5vw,42px);margin:8px 0}h2{margin:0 0 12px;font-size:20px}p{margin:0 0 16px}small{color:#525c4e}.layout{display:grid;grid-template-columns:1.65fr 1fr;gap:16px}.panel{background:white;border:1px solid #dce1d1;border-radius:18px;padding:18px}.chat{height:300px;overflow:auto;background:#f6f8f2;padding:12px;border-radius:12px;margin:12px 0}.bubble{margin:8px 0;padding:8px 12px;border-radius:12px;background:#e4ebda;width:fit-content;max-width:91%;white-space:pre-wrap;overflow-wrap:anywhere}.customer{margin-inline-start:auto;background:#fff;border:1px solid #dce1d1}button,input,select{font:inherit;border-radius:9px;border:1px solid #a6b29b;padding:7px 10px}button{cursor:pointer;background:#e8eddf;color:#222c20}button.primary{background:#344d2e;color:white}button:disabled{opacity:.55;cursor:default}form{display:flex;gap:8px}input{min-width:0;flex:1}.row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}dl{display:grid;grid-template-columns:auto 1fr;gap:5px 12px}dd{margin:0;overflow-wrap:anywhere}.badge{display:inline-block;border-radius:20px;background:#e4ebda;padding:3px 10px}.muted{color:#525c4e}@media(max-width:650px){.layout{grid-template-columns:1fr}main{padding:18px 12px}}
</style>
<main>
<header><a href="/">الرجوع لمدير الأوردرات</a><br><small>HOMEY · تجربة محلية</small><h1>مساعد محادثات وطلبات هومي</h1><p>جرّب الرد بالسعر والمخزون، وتجميع طلب للمراجعة. المنتجات والأسعار هنا تجريبية. استخدم بيانات وهمية.</p></header>
<section class="panel" style="margin-bottom:16px">
<h2>الردود التلقائية على العملاء</h2>
<p id="live-status" role="status">بنتحقق من حالة الخدمة…</p>
<button class="primary" id="live-toggle" disabled>تفعيل الردود</button>
<button id="live-refresh">تحديث الحالة</button>
</section>
<div class="layout">
<section class="panel" aria-labelledby="chat-title">
<h2 id="chat-title">محادثة العميل</h2>
<label for="channel">قناة المحاكاة</label>
<select id="channel"><option>WhatsApp</option><option>Messenger</option><option>Instagram</option></select>
<div id="chat" class="chat" role="log" aria-label="رسائل المحادثة"></div>
<form id="form"><input id="message" aria-label="رسالة العميل" placeholder="اكتب رسالة العميل" maxlength="250" required><button class="primary">إرسال</button></form>
<div class="row"><button id="sample">تشغيل محادثة كاملة</button><button id="reset">ابدأ من جديد</button></div>
</section>
<section class="panel" aria-labelledby="order-title">
<h2 id="order-title">مدير أوردرات هومي وصدفة</h2><span id="status" class="badge" role="status"></span>
<dl id="details"></dl>
<button id="approve" class="primary" disabled>اعتماد تجريبي بواسطة الفريق</button>
<p class="muted"><small>القنوات والكتالوج ومدير الأوردرات محاكاة. الردود بقواعد تجريبية، والمحادثة محفوظة في ذاكرة الصفحة طول ما هي مفتوحة.</small></p>
</section>
</div>
</main>
<script>

"use strict";

const demoCatalog = [
  {id: "demo-tissues", name: "علبة مناديل", match: /مناديل/u, price: 149, stock: 5},
  {id: "demo-eggs", name: "منظم بيض", match: /بيض/u, price: 99, stock: 0},
];
const fields = [
  ["name", "الاسم", "اسم حضرتك إيه؟", /^[\p{L}][\p{L} .'-]{1,79}$/u],
  ["phone", "رقم الموبايل", "ممكن رقم الموبايل المصري؟", /^01[0125][0-9]{8}$/],
  ["governorate", "المحافظة", "التوصيل في محافظة إيه؟", /^(القاهرة|الجيزة|الإسكندرية|الاسكندرية|الدقهلية|البحر الأحمر|البحيرة|الفيوم|الغربية|الإسماعيلية|الاسماعيلية|المنوفية|المنيا|القليوبية|الوادي الجديد|السويس|أسوان|اسوان|أسيوط|اسيوط|بني سويف|بورسعيد|دمياط|الشرقية|جنوب سيناء|كفر الشيخ|مطروح|الأقصر|الاقصر|قنا|شمال سيناء|سوهاج)$/u],
  ["address", "العنوان", "ابعت العنوان بالتفصيل، الشارع ورقم العمارة أو علامة مميزة.", /^.{10,200}$/u],
];
const humanRequest = /(?:اكلم|أكلم|موظف|خدمة العملاء|بني آدم|شكوى)/u;
const purchase = /(?:اطلب|أطلب|هاخد|هآخد|احجز|أحجز)/u;
const request = /(?:عايز|عاوز|عايزة|عاوزه)/u;
const question = /(?:سعر|بكام|كام جنيه|تفاصيل|أعرف|اعرف|استفسار|متوفر|موجود|لون|ألوان|\?)/u;
const spokenQuantity = new Map([
  ["واحدة", 1], ["واحد", 1], ["قطعة", 1], ["اتنين", 2], ["اثنين", 2],
  ["قطعتين", 2], ["تلاتة", 3], ["ثلاثة", 3], ["أربعة", 4], ["خمسة", 5],
]);

function quantityFrom(message, collecting = false) {
  const plain = message.replace(/\s+(?:لو سمحت|من فضلك)$/u, "").trim();
  const value = collecting && /^\d+$/.test(plain)
    ? plain
    : plain.match(/(?:^|\s)(\d+)\s*(?:قطع(?:ة)?|علب(?:ة)?|حبات|منه|منها)(?=\s|$)/u)?.[1];
  if (value) return Number(value);
  if (collecting && spokenQuantity.has(plain)) return spokenQuantity.get(plain);
  for (const [word, count] of spokenQuantity) {
    if (word === "قطعة") continue;
    if (new RegExp("(?:^|\\s)" + word + "(?=\\s|$)", "u").test(plain)) return count;
  }
  return null;
}
const newSession = channel => ({channel, step: "chat", product: null, quantity: 0, customer: {}});
const normalizeDigits = input => input.replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15));

function receive(session, input, catalog = demoCatalog, selectedId = null) {
  const message = normalizeDigits(input.trim());
  if (session.step === "approved") return "الطلب اتراجع في التجربة.";
  if (session.step === "human") return "المحادثة مع فريق هومي للمراجعة.";
  if (session.step === "pending") return "الطلب عند فريق هومي للمراجعة.";
  if (humanRequest.test(message)) {
    session.step = "human";
    return "حوّلت المحادثة لفريق هومي عشان يكمل معاك.";
  }
  if (/^(إلغاء|الغاء|الغي|ألغي)$/u.test(message)) {
    Object.assign(session, newSession(session.channel));
    return "لغيت المسودة. تحب تسأل عن منتج تاني؟";
  }
  if (session.step === "review") {
    if (message !== "تأكيد") return "لو البيانات صح اكتب «تأكيد»، ولو حابب تبدأ من جديد اكتب «إلغاء».";
    session.step = "pending";
    return "استلمت بيانات طلبك وحوّلته لفريق هومي. الفريق هيراجع الشحن ويأكد معاك.";
  }
  if (session.step === "quantity") {
    const quantity = quantityFrom(message, true);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > session.product.stock) {
      return "اكتب عدد من 1 لحد " + session.product.stock + ".";
    }
    session.quantity = quantity;
    session.step = "name";
    return fields[0][2];
  }
  const fieldIndex = fields.findIndex(([key]) => key === session.step);
  if (fieldIndex >= 0) {
    const [key, label, prompt, format] = fields[fieldIndex];
    const value = key === "phone" ? message.replace(/[ -]/g, "").replace(/^(?:\+20|0020)(?=1)/, "0") : message;
    if (!format.test(value)) return "محتاج أراجع " + label + " معاك. " + prompt;
    session.customer[key] = value;
    const next = fields[fieldIndex + 1];
    if (next) {
      session.step = next[0];
      return next[2];
    }
    session.step = "review";
    return session.product.name + " × " + session.quantity + "\nإجمالي المنتجات " +
      session.product.price * session.quantity + " جنيه. الشحن هيراجعه الفريق.\n" +
      fields.map(([key, label]) => label + " — " + session.customer[key]).join("\n") +
      "\nلو البيانات صح اكتب «تأكيد».";
  }
  if (/^(?:السلام عليكم|سلام|أهلا|اهلا|هاي|مساء الخير|صباح الخير)[! .،]*$/u.test(message)) {
    return "أهلًا بيك في هومي! بتدور على إيه؟";
  }
  if (/^(?:شكرًا|شكرا|تسلم|تمام شكرا)[! .،]*$/u.test(message)) return "العفو، تحت أمرك!";
  const matches = catalog.filter(product => selectedId ? product.id === selectedId : product.match.test(message));
  if (matches.length > 1) return "تقصد أنهي منتج؟ " + matches.slice(0, 5).map(product => product.name).join("، ");
  const quantity = quantityFrom(message);
  const followUp = /^(?:سعره كام|سعرها كام|بكام|عايز أطلب|عاوز أطلب|عايزة أطلب|اطلب)$/u.test(message) ||
    (purchase.test(message) && /(?:منه|منها)(?:\s|$)/u.test(message));
  const product = matches[0] ?? (followUp ? session.product : null);
  if (!product) return "ممكن اسم المنتج أو لينك المنتج من هومي؟";
  session.product = product;
  if (!product.stock) return product.name + " خلص حاليًا. ممكن أساعدك بمنتج تاني.";
  const availability = product.name + " بـ " + product.price + " جنيه للقطعة.";
  if (!purchase.test(message) && !(request.test(message) && !question.test(message) && quantity !== null)) {
    return availability;
  }
  if (quantity !== null && quantity >= 1 && quantity <= product.stock) {
    session.quantity = quantity;
    session.step = "name";
    return availability + " " + fields[0][2];
  }
  if (quantity !== null) {
    session.step = "quantity";
    return "المتاح " + product.stock + " قطعة. تحب كام؟";
  }
  session.step = "quantity";
  return availability + " تحب كام قطعة؟";
}

function orderForReview(session) {
  if (!["pending", "approved"].includes(session.step)) return null;
  return {
    brand: "HOMEY",
    source: session.channel,
    status: session.step === "approved" ? "confirmed" : "pending_review",
    items: [{productId: session.product.id, product: session.product.name, quantity: session.quantity, unitPrice: session.product.price}],
    subtotal: session.product.price * session.quantity,
    shipping: null,
    customer: {...session.customer},
  };
}

function approve(session) {
  if (session.step !== "pending") return false;
  session.step = "approved";
  return true;
}
</script>
<script>
const byId = id => document.getElementById(id);
const chat = byId("chat");
const channel = byId("channel");
const message = byId("message");
let session;
function bubble(text, role) {
  const entry = document.createElement("div");
  entry.className = "bubble " + role;
  entry.textContent = (role === "customer" ? "العميل · " : "هومي · ") + text;
  chat.append(entry);
  chat.scrollTop = chat.scrollHeight;
}
function renderOrder() {
  const order = orderForReview(session);
  byId("status").textContent = ({pending: "بانتظار مراجعة الفريق", approved: "معتمد تجريبيًا", human: "محوّل للفريق"})[session.step] ?? "مفيش طلب جاهز للمراجعة";
  byId("approve").disabled = session.step !== "pending";
  const details = byId("details");
  details.replaceChildren();
  if (!order) return;
  const [item] = order.items;
  const rows = [
    ["المصدر", order.source], ["البراند", order.brand],
    ["المنتج", item.product + " × " + item.quantity],
    ["إجمالي المنتجات", order.subtotal + " جنيه"],
    ["الشحن", "قيد المراجعة"],
    ...fields.map(([key, label]) => [label, order.customer[key]]),
  ];
  for (const [label, value] of rows) {
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    details.append(term, description);
  }
}
function send(value) {
  bubble(value, "customer");
  bubble(receive(session, value), "bot");
  renderOrder();
}
function reset() {
  session = newSession(channel.value);
  chat.replaceChildren();
  message.value = "";
  bubble("أهلًا بيك في هومي! بتدور على إيه؟", "bot");
  renderOrder();
}
byId("form").addEventListener("submit", event => {
  event.preventDefault();
  if (message.value.trim()) send(message.value.trim());
  message.value = "";
});
byId("sample").addEventListener("click", () => {
  reset();
  for (const example of ["سعر علبة المناديل كام؟", "عايز أطلب", "٢", "عميل تجريبي", "01000000000", "القاهرة", "شارع التجربة عمارة 12", "تأكيد"]) send(example);
});
byId("approve").addEventListener("click", () => {
  approve(session);
  renderOrder();
});
const liveToggle = byId("live-toggle");
const liveRefresh = byId("live-refresh");
let liveState = null;
async function syncLive(enabled) {
  liveToggle.disabled = true;
  liveRefresh.disabled = true;
  try {
    const response = await fetch("/homey-agent/control", {
      method: typeof enabled === "boolean" ? "PUT" : "GET",
      headers: {"Content-Type": "application/json"},
      body: typeof enabled === "boolean" ? JSON.stringify({enabled}) : undefined,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "تعذر تحديث حالة البوت.");
    liveState = data;
    byId("live-status").textContent = data.mode === "shadow" ? "الخدمة في وضع الاختبار."
      : data.enabled ? "الردود التلقائية مفعّلة." : "الردود التلقائية متوقفة.";
    liveToggle.textContent = data.enabled ? "إيقاف الردود" : "تفعيل الردود";
  } catch (error) {
    liveState = null;
    byId("live-status").textContent = error.message;
  } finally {
    liveToggle.disabled = liveState?.mode !== "live";
    liveRefresh.disabled = false;
  }
}
liveToggle.addEventListener("click", () => syncLive(!liveState.enabled));
liveRefresh.addEventListener("click", () => syncLive());
syncLive();
channel.addEventListener("change", reset);
byId("reset").addEventListener("click", reset);
reset();
</script>
</html>
`;
