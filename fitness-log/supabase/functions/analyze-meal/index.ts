const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          portion: { type: "string" },
          calories: { type: "number" },
        },
        required: ["name", "portion", "calories"],
      },
    },
    estimated_calories: { type: "number" },
    calorie_min: { type: "number" },
    calorie_max: { type: "number" },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    assumptions: { type: "string" },
  },
  required: ["items", "estimated_calories", "calorie_min", "calorie_max", "protein_g", "carbs_g", "fat_g", "confidence", "assumptions"],
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY") || "";
    if (!apiKey) return json({ error: "食物识别服务尚未配置 OPENAI_API_KEY" }, 503);
    const { image, meal_type, context } = await request.json();
    const imageData = String(image || "");
    const description = String(context || "").trim().slice(0, 500);
    const hasImage = Boolean(imageData);
    if (!hasImage && !description) return json({ error: "请拍摄食物照片或填写文字描述" }, 400);
    if (hasImage && !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(imageData)) return json({ error: "图片格式不支持" }, 400);
    if (imageData.length > 2_800_000) return json({ error: "图片过大，请重新拍摄" }, 413);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4o-mini",
        store: false,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: `你是谨慎的注册营养师助理。根据用户提供的${hasImage ? "食物照片" : "文字描述"}${hasImage && description ? "与补充文字" : ""}，识别${String(meal_type || "一餐")}中的食物，先估算每项可食重量或常见份量，再估算总热量和三大营养素。文字描述：${description || "无"}。需要把烹调油、酱汁、饮料等容易漏算的来源纳入合理区间；无法判断的份量必须写入 assumptions，并降低 confidence。不要把结果说成精确测量，不提供诊断。` },
            ...(hasImage ? [{ type: "input_image", image_url: imageData, detail: "high" }] : []),
          ],
        }],
        text: { format: { type: "json_schema", name: "meal_nutrition", strict: true, schema } },
      }),
    });
    const result = await response.json();
    if (!response.ok) return json({ error: result?.error?.message || "营养识别服务请求失败" }, 502);
    const outputText = result.output_text || result.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === "output_text")?.text;
    if (!outputText) return json({ error: "营养识别服务未返回结果" }, 502);
    const nutrition = JSON.parse(outputText);
    return json({ ...nutrition, photo_stored: false, model_generated: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "食物识别失败" }, 500);
  }
});
