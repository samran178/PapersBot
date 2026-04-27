import os
import json
from openai import OpenAI


def _get_client():
    api_key = os.environ.get('AI_INTEGRATIONS_OPENAI_API_KEY')
    base_url = os.environ.get('AI_INTEGRATIONS_OPENAI_BASE_URL')
    if not api_key:
        raise Exception(
            "AI features are not configured. Please set the AI_INTEGRATIONS_OPENAI_API_KEY environment variable."
        )
    return OpenAI(api_key=api_key, base_url=base_url)


def generate_exam_questions(text, options):
    client = _get_client()
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


def grade_subjective_answer(question_text, guideline, student_answer):
    if not student_answer or not student_answer.strip():
        return {'score': 0, 'feedback': 'No answer was provided by the student.'}

    client = _get_client()

    prompt = f"""You are an academic examiner grading a student's answer.

QUESTION:
{question_text}

MARKING GUIDELINE / KEY ANSWER:
{guideline}

STUDENT'S ANSWER:
{student_answer}

Grade the student's answer on a scale of 0 to 100 based on:
1. Presence of key concepts and keywords from the guideline
2. Accuracy and correctness of the content
3. Completeness of the answer

Return a JSON object:
{{
  "score": <integer from 0 to 100>,
  "feedback": "<1-2 sentence explanation mentioning keyword/concept matches and what was missing>"
}}"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a precise and fair academic grader. Be consistent and objective."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    if not content:
        return {'score': 0, 'feedback': 'AI analysis failed.'}

    result = json.loads(content)
    score = max(0, min(100, int(result.get('score', 0))))
    feedback = result.get('feedback', '')
    return {'score': score, 'feedback': feedback}
