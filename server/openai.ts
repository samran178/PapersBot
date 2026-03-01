import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateExamQuestions(text: string, options: { 
  difficulty: string, 
  shortQuestions: number, 
  longQuestions: number 
}) {
  const prompt = `You are an expert exam generator. Given the provided educational material, generate a high-quality exam.
Material: ${text.substring(0, 15000)}

Requirements:
- Difficulty Level: ${options.difficulty}
- Number of Multiple Choice Questions (Short): ${options.shortQuestions}
- Number of Detailed Questions (Long): ${options.longQuestions}

Return ONLY a JSON object with this structure:
{
  "title": "A professional title for the exam",
  "questions": [
    {
      "text": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact string of the correct option"
    }
  ]
}
Note: For long questions, provide 4 potential 'answer points' as options and set the 'correctAnswer' to the most comprehensive one.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // Use a high-capability model for better accuracy
    messages: [
      { role: "system", content: "You are a professional academic examination assistant." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No content from AI");
  return JSON.parse(content);
}
