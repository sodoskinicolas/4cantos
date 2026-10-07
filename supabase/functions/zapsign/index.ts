// 4Cantos — ponte entre o app e a ZapSign.
// O token da ZapSign fica só aqui, no segredo ZAPSIGN_TOKEN do Supabase (nunca no app).
// Segredos: ZAPSIGN_TOKEN (obrigatório), ZAPSIGN_SANDBOX=1 (opcional, usa o ambiente de testes),
//           ZAPSIGN_EMAILS (opcional, e-mails que podem usar, separados por vírgula).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resp = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp({ erro: "Use POST." }, 405);

  // 1) só quem está logado no app
  const auth = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  const u = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/user", { headers: { Authorization: auth, apikey } });
  if (!u.ok) return resp({ erro: "Entre no app (nuvem) para usar a ZapSign." }, 401);
  const user = await u.json();
  const permitidos = (Deno.env.get("ZAPSIGN_EMAILS") || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  if (permitidos.length && !permitidos.includes(String(user.email || "").toLowerCase()))
    return resp({ erro: "Esta conta não pode usar a ZapSign." }, 403);

  // 2) token da ZapSign
  const token = Deno.env.get("ZAPSIGN_TOKEN");
  if (!token) return resp({ erro: "Falta configurar o token da ZapSign no Supabase (segredo ZAPSIGN_TOKEN)." }, 500);
  const base = Deno.env.get("ZAPSIGN_SANDBOX") === "1"
    ? "https://sandbox.api.zapsign.com.br/api/v1"
    : "https://api.zapsign.com.br/api/v1";
  const zs = async (path: string, init: RequestInit = {}) => {
    const r = await fetch(base + path, {
      ...init,
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    const t = await r.text();
    let d: any = null;
    try { d = JSON.parse(t); } catch (_) { d = { detail: t.slice(0, 300) }; }
    if (r.status === 401 || r.status === 403)
      d = { detail: "o token da ZapSign não foi aceito. Confira o segredo ZAPSIGN_TOKEN (token de teste precisa de ZAPSIGN_SANDBOX=1)." };
    return { ok: r.ok, status: r.ok ? r.status : 502, d };
  };
  const signers = (d: any) =>
    (d.signers || []).map((s: any) => ({
      nome: s.name, papel: s.qualification || "", url: s.sign_url, status: s.status, token: s.token,
      assinado_em: s.signed_at || null,
    }));

  let b: any = {};
  try { b = await req.json(); } catch (_) { return resp({ erro: "Pedido inválido." }, 400); }

  // 3) criar documento
  if (b.acao === "criar") {
    if (!b.pdf || !b.nome || !Array.isArray(b.signatarios) || !b.signatarios.length)
      return resp({ erro: "Faltam dados do contrato." }, 400);
    const r = await zs("/docs/", {
      method: "POST",
      body: JSON.stringify({
        name: String(b.nome).slice(0, 255),
        base64_pdf: b.pdf,
        lang: "pt-br",
        disable_signer_emails: true,
        signature_order_active: false,
        signers: b.signatarios.map((s: any) => ({
          name: s.nome,
          qualification: s.papel || "",
          auth_mode: "assinaturaTela",
          lock_name: true,
          send_automatic_email: false,
          send_automatic_whatsapp: false,
          require_selfie_photo: !!s.selfie,
          require_document_photo: !!s.foto_documento,
          require_cpf: !!s.pedir_cpf,
        })),
      }),
    });
    if (!r.ok) return resp({ erro: "ZapSign recusou: " + (r.d.detail || r.d.message || JSON.stringify(r.d).slice(0, 300)) }, r.status);
    return resp({ doc: r.d.token, status: r.d.status, signatarios: signers(r.d), sandbox: base.includes("sandbox") });
  }

  // 4) consultar status (e link do PDF assinado, que vale 60 min)
  if (b.acao === "status") {
    if (!b.doc) return resp({ erro: "Falta o documento." }, 400);
    const r = await zs("/docs/" + encodeURIComponent(b.doc) + "/");
    if (!r.ok) return resp({ erro: "ZapSign: " + (r.d.detail || JSON.stringify(r.d).slice(0, 300)) }, r.status);
    return resp({ doc: r.d.token, status: r.d.status, assinado: r.d.signed_file || null, signatarios: signers(r.d) });
  }

  return resp({ erro: "Ação desconhecida." }, 400);
});
