import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateExamQuestions(text: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "system",
        content: "You are an exam generator. Given some educational material, generate an exam title and 5 multiple choice questions. Return ONLY a JSON object with this structure: { \"title\": \"...\", \"questions\": [ { \"text\": \"...\", \"options\": [\"opt1\", \"opt2\", \"opt3\", \"opt4\"], \"correctAnswer\": \"the-exact-string-of-correct-option\" } ] }"
      },
      {
        role: "user",
        content: `Generate an exam from this material: ${text}`
      }
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No content from AI");
  return JSON.parse(content);
}
