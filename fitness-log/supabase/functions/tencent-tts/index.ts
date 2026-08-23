const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (value: string) => crypto.subtle.digest("SHA-256", encoder.encode(value));
const hmac = async (key: ArrayBuffer | Uint8Array, value: string) => {
  const imported = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", imported, encoder.encode(value));
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { text, accountKey } = await request.json();
    const accessKey = Deno.env.get("FITNESS_ACCESS_KEY") || "";
    if (!accessKey || accountKey !== accessKey) return json({ error: "无权访问" }, 401);
    const cleanText = String(text || "").replace(/\s+/g, " ").trim().slice(0, 500);
    if (!cleanText) return json({ error: "反馈内容为空" }, 400);

    const secretId = Deno.env.get("TENCENT_SECRET_ID") || "";
    const secretKey = Deno.env.get("TENCENT_SECRET_KEY") || "";
    if (!secretId || !secretKey) return json({ error: "腾讯云语音尚未配置" }, 503);

    const host = "tts.tencentcloudapi.com";
    const service = "tts";
    const action = "TextToVoice";
    const version = "2019-08-23";
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const payload = JSON.stringify({
      Text: cleanText,
      SessionId: crypto.randomUUID().replaceAll("-", ""),
      ModelType: 1,
      VoiceType: Number(Deno.env.get("TENCENT_TTS_VOICE_TYPE") || "101001"),
      Speed: -0.15,
      Volume: 1,
      Codec: "mp3",
      SampleRate: 16000,
    });

    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
    const signedHeaders = "content-type;host;x-tc-action";
    const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hex(await sha256(payload))}`;
    const credentialScope = `${date}/${service}/tc3_request`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hex(await sha256(canonicalRequest))}`;
    const secretDate = await hmac(encoder.encode(`TC3${secretKey}`), date);
    const secretService = await hmac(secretDate, service);
    const secretSigning = await hmac(secretService, "tc3_request");
    const signature = hex(await hmac(secretSigning, stringToSign));
    const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(`https://${host}`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json; charset=utf-8",
        Host: host,
        "X-TC-Action": action,
        "X-TC-Version": version,
        "X-TC-Timestamp": String(timestamp),
        "X-TC-Region": "ap-beijing",
      },
      body: payload,
    });
    const result = await response.json();
    if (!response.ok || result.Response?.Error) {
      return json({ error: result.Response?.Error?.Message || "腾讯云语音生成失败" }, 502);
    }
    const base64 = result.Response?.Audio;
    if (!base64) return json({ error: "腾讯云未返回音频" }, 502);
    const binary = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    return new Response(binary, {
      headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600" },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "语音生成失败" }, 500);
  }
});
