import OpenAI from "openai";

function latin1Safe(s) {
  return s
    .normalize("NFKC")
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-")
    .replace(/[^\x00-\xff]/g, "?");
}

class LLMExporterService {
  static async generateMarkdownFromHtml({ htmlContent }) {
    console.log("[LLM Exporter] Converting frontend-generated HTML to Markdown for table");

    const prompt = `
You are an expert technical documentation builder and a precise markup converter.
Your task is to convert the following input HTML Schema Report into an elegant, clean, and professional Markdown (.md) file.

Conversion Instructions:
1. Replicate the exact content, layout structure, and section hierarchy of the HTML.
2. Convert HTML headers (h1, h2, h4) to their corresponding Markdown headers (#, ##, ####).
3. Convert lists (ul, li) and bold tags (strong) into proper Markdown lists (*) and bold markers (**).
4. Inside the "Schema Graph Visualization" section, if you find an img tag with src="#GRAPH_IMAGE_PLACEHOLDER#", convert it exactly to: ![Schema Graph](#GRAPH_IMAGE_PLACEHOLDER#)
5. For sections containing collapsible contents (like columns types or properties), output their inner text fully expanded and clearly visible in the final Markdown document.
6. CRITICAL: Return ONLY the raw markdown syntax string. Do NOT wrap your entire response inside markdown code fences like \`\`\`markdown ... \`\`\`.

Input HTML Document to convert:
${htmlContent}
`;

    const openai = new OpenAI({
      apiKey: latin1Safe(process.env.LLM_KEY || process.env.OPENAI_API_KEY || "sk-localapikey"),
      baseURL: process.env.LLM_ADDRESS || "",
    });

    const model = process.env.LLM_MODEL || "gpt-4";

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a professional HTML-to-Markdown document converter. You output raw markdown syntax directly, without markdown code fences." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1
    });

    return completion.choices[0]?.message?.content || "# Error generating report";
  }
}

export default LLMExporterService;
