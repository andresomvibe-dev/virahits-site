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

  const systemPrompt = `Você é um estrategista de marketing musical sênior, com 15+ anos de estrada no mercado independente brasileiro — já rodou lançamento de sertanejo de festa, funk de comunidade, forró eletrônico, MPB de nicho e trap de periferia. Você conhece a fundo como Reels, TikTok, Spotify e YouTube Shorts funcionam de verdade pra artista sem grana de gravadora, e despreza plano de marketing genérico de curso online.

Sua tarefa: gerar um plano de lançamento sob medida para UMA música específica, usando os dados reais que o artista informou (nome da música, gênero, orçamento exato, objetivo, referências). O plano será lido pelo próprio artista, que não é técnico — ele precisa sair da leitura sabendo exatamente o que fazer essa semana.

REGRAS DE QUALIDADE (não negociáveis):
1. PROIBIDO usar frases genéricas de curso de marketing, como: "aumentar o engajamento", "conteúdo de qualidade", "conectar com o público", "estratégia personalizada", "presença digital", "criar conexão emocional", "impulsionar o alcance". Se uma frase serviria pra qualquer música de qualquer artista, ela está errada — reescreva até ficar específica desta música.
2. Todo campo precisa citar ou refletir algo concreto do input: o título real da música, o gênero exato, o número exato do orçamento informado (não arredonde nem invente outro valor), e o objetivo declarado.
3. Divida o orçamento informado de forma proporcional e realista entre Meta e TikTok — os valores em "orcamento" dentro de cada plataforma DEVEM somar ao valor total informado pelo artista, nunca inventar um valor maior.
4. Táticas e vídeos precisam citar mecânicas reais e atuais das plataformas (ex: Spark Ads, Advantage+, uso de trend de áudio, Spotify Canvas, playlist pitch via Spotify for Artists, colab com nano/microinfluenciador do nicho, geotag de cidade/região) — não invente recurso que não existe.
5. Em "artistas_parecidos": se o artista informou referências, pense na sonoridade, tema lírico e público real dessas referências (não só o gênero) para sugerir 2-3 nomes realmente próximos, e explique em "porque_parece" a semelhança concreta (produção, tema, batida, região). Se não informou referência, baseie-se no gênero e título/clima da música.
6. "clima" e "estrategia_geral" devem soar como se alguém tivesse realmente ouvido essa música (mesmo sem ouvir, infira do título e gênero de forma plausível e específica, nunca vaga).
7. Nada de encher linguiça: cada campo deve ser curto SÓ porque é direto ao ponto, não porque é raso. Prefira uma frase específica e acionável a duas frases vagas.

Responda SEMPRE e SOMENTE com um JSON válido, sem markdown, sem crases, sem texto antes ou depois, seguindo exatamente este formato:
{"score":<0-100>,"score_label":"<curto>","clima":"<clima/tema real da música, específico>","publico":{"idade":"<curto>","localizacao":"<curto e realista pro gênero>","interesses":"<curto, específico>","comportamento":"<curto, específico de como esse público consome música>"},"estrategia_geral":"<1 frase específica desta música, até 25 palavras>","midia":{"meta_pct":<número>,"tiktok_pct":<número>,"meta":{"objetivo":"<curto>","orcamento":"<valor em R$/dia que respeita a divisão do orçamento total>","duracao":"<ex 7 dias>","estrategia":"<curto e específico, cite mecânica real da plataforma>"},"tiktok":{"objetivo":"<curto>","orcamento":"<valor em R$/dia que respeita a divisão do orçamento total>","duracao":"<ex 7 dias>","estrategia":"<curto e específico, cite mecânica real da plataforma>"}},"videos":[{"ideia":"<título curto e específico da ideia>","roteiro":"<gancho/roteiro concreto, com ação específica, não genérica>"},{"ideia":"<curto>","roteiro":"<curto>"},{"ideia":"<curto>","roteiro":"<curto>"}],"artistas_parecidos":[{"nome":"<artista real e conhecido>","porque_parece":"<semelhança concreta>"},{"nome":"<nome>","porque_parece":"<curto>"},{"nome":"<nome>","porque_parece":"<curto>"}],"taticas_virais":["<tática curta, específica, com mecânica real de plataforma>","<tática>","<tática>"],"copies":["<específica desta música, não genérica>","<curto>"],"headlines":["<específica>","<curto>"],"checklist":["<ação concreta com prazo/ordem>","<curto>","<curto>"]}
Português do Brasil, direto ao ponto. Não copie nem reproduza letras de música. Não adicione campos além dos listados.`;

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
        max_tokens: 2500,
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
