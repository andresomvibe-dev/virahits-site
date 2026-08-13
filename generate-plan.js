// Netlify Function — gera o plano de marketing via API da Anthropic.
// A chave (ANTHROPIC_API_KEY) fica só aqui no servidor, nunca no site.
// Configure em: Netlify → Site settings → Environment variables

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Método não permitido" }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Chave de API não configurada no servidor (ANTHROPIC_API_KEY).",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Corpo da requisição inválido." }),
    };
  }

  const { artist, track, genre, goal, budget, refs, link, musicaReal } = payload;

  if (!artist || !track || !genre || !goal || !budget) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Faltam dados obrigatórios do formulário." }),
    };
  }

  const systemPrompt = `Você é o motor de estratégia do ViraHits, uma plataforma que gera planos de marketing musical para artistas independentes brasileiros. Responda SEMPRE e SOMENTE com um JSON válido, compacto, sem markdown, sem crases, sem texto antes ou depois, sem quebras de linha desnecessárias, seguindo exatamente este formato:
{"score":<0-100>,"score_label":"<curto>","clima":"<clima/tema provável da música em poucas palavras, baseado no título e gênero>","publico":{"idade":"<curto>","localizacao":"<curto>","interesses":"<curto>","comportamento":"<curto>"},"estrategia_geral":"<1 frase, até 20 palavras>","midia":{"meta_pct":<número>,"tiktok_pct":<número>,"meta":{"objetivo":"<curto>","orcamento":"<ex R$20/dia>","duracao":"<ex 7 dias>","estrategia":"<curto>"},"tiktok":{"objetivo":"<curto>","orcamento":"<ex R$10/dia>","duracao":"<ex 7 dias>","estrategia":"<curto>"}},"videos":[{"ideia":"<título curto da ideia>","roteiro":"<1 frase de roteiro/gancho>"},{"ideia":"<curto>","roteiro":"<curto>"},{"ideia":"<curto>","roteiro":"<curto>"}],"artistas_parecidos":["<nome de artista real e conhecido do mesmo estilo>","<nome>","<nome>"],"taticas_virais":["<tática curta e específica>","<tática>","<tática>"],"copies":["<curto>","<curto>"],"headlines":["<curto>","<curto>"],"checklist":["<curto>","<curto>","<curto>"]}
Regras: português do Brasil, MUITO conciso em cada campo (frases curtas, direto ao ponto), específico ao gênero, título da música e orçamento informados. Em "artistas_parecidos": se o usuário informou artistas de referência, cite 2-3 nomes de artistas reais e conhecidos com som PARECIDO a essas referências (não repita os mesmos nomes informados, sugira similares a eles); se não informou nenhuma referência, baseie-se só no gênero e diga que são sugestões genéricas do estilo. Não copie nem reproduza letras de música. Não adicione campos além dos listados.`;

  const userMsg = `Gere um plano de marketing completo para:
Artista: ${artist}
Música: ${track}
Link: ${link || "não informado"}
${musicaReal || ""}
Gênero: ${genre}
Objetivo principal: ${goal}
Orçamento disponível: ${budget}
Artistas de referência informados pelo próprio artista: ${refs || "não informado"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: "Erro na API da Anthropic: " + errText.slice(0, 300) }),
      };
    }

    const data = await response.json();
    const textBlocks = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    let cleaned = textBlocks.replace(/```json|```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    let plan;
    try {
      plan = JSON.parse(cleaned);
    } catch (e) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Resposta da IA veio em formato inesperado.",
          raw: textBlocks.slice(0, 300),
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ plan }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erro interno: " + err.message }),
    };
  }
};
