import os
import json
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get('AI_INTEGRATIONS_OPENAI_API_KEY'),
    base_url=os.environ.get('AI_INTEGRATIONS_OPENAI_BASE_URL'),
)


def generate_exam_questions(text, options):
    difficulty = options.get('difficulty', 'medium')
    short_questions = options.get('shortQuestions', 5)
    long_questions = options.get('longQuestions', 0)

    prompt = f"""You are an expert exam generator. Given the provided educational material, generate a high-quality exam.
Material: {text[:15000]}

Requirements:
- Difficulty Level: {difficulty}
- Number of Multiple Choice Questions (Short): {short_questions}
- Number of Detailed Questions (Long): {long_questions}

Return ONLY a JSON object with this structure:
{{
  "title": "A professional title for the exam",
  "questions": [
    {{
      "text": "The question text",
      "type": "mcq",
      "partition": 1,
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact string of the correct option"
    }},
    {{
      "text": "The question text",
      "type": "long",
      "partition": 2,
      "options": [],
      "correctAnswer": "A brief summary of what the correct answer should contain"
    }},
    {{
      "text": "The question text",
      "type": "short",
      "partition": 1,
      "options": [],
      "correctAnswer": "A concise answer guideline"
    }}
  ]
}}
Note: For long and short questions (non-MCQ), set type to 'long' or 'short' and set options to an empty array []."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a professional academic examination assistant."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    if not content:
        raise Exception("No content from AI")
    return json.loads(content)
