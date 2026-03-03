import json
import io
from functools import wraps

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.utils import timezone

from .models import User, Exam, Question, Attempt, AttemptAnswer
from .openai_service import generate_exam_questions


def require_auth(view_func):
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        if not request.session.get('user_id'):
            return JsonResponse({'message': 'Unauthorized'}, status=401)
        return view_func(request, *args, **kwargs)
    wrapped.csrf_exempt = True
    return csrf_exempt(wrapped)


def get_current_user(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return None
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None


def user_to_dict(user):
    return {'id': user.id, 'username': user.username, 'role': user.role}


def question_to_dict(q, include_answer=True):
    d = {
        'id': q.id,
        'examId': q.exam_id,
        'type': q.type,
        'partition': q.partition,
        'text': q.text,
        'options': q.options or [],
    }
    if include_answer:
        d['correctAnswer'] = q.correct_answer
    return d


def exam_to_dict(exam, include_questions=False, student_view=False):
    d = {
        'id': exam.id,
        'teacherId': exam.teacher_id,
        'title': exam.title,
        'description': exam.description,
        'durationMinutes': exam.duration_minutes,
        'isPublished': exam.is_published,
        'createdAt': exam.created_at.isoformat() if exam.created_at else None,
    }
    if include_questions:
        questions = list(exam.questions.all())
        d['questions'] = [question_to_dict(q, include_answer=not student_view) for q in questions]
        d['questionCount'] = len(questions)
    return d


def attempt_to_dict(attempt, include_exam=False, student_view=False):
    d = {
        'id': attempt.id,
        'examId': attempt.exam_id,
        'studentId': attempt.student_id,
        'currentPartition': attempt.current_partition,
        'startTime': attempt.start_time.isoformat() if attempt.start_time else None,
        'endTime': attempt.end_time.isoformat() if attempt.end_time else None,
        'score': attempt.score,
        'isCompleted': attempt.is_completed,
        'isTimeout': attempt.is_timeout,
    }
    if include_exam:
        d['exam'] = exam_to_dict(attempt.exam, include_questions=True, student_view=student_view)
    return d


# ─── Auth Views ───────────────────────────────────────────────────────────────

@csrf_exempt
def auth_register(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        role = data.get('role', 'student')

        if not username or not password:
            return JsonResponse({'message': 'Username and password are required'}, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({'message': 'Username already exists'}, status=400)

        user = User.objects.create(username=username, password=password, role=role)
        request.session['user_id'] = user.id
        return JsonResponse(user_to_dict(user), status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def auth_login(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get('username', '')
        password = data.get('password', '')

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({'message': 'Invalid credentials'}, status=401)

        if user.password != password:
            return JsonResponse({'message': 'Invalid credentials'}, status=401)

        request.session['user_id'] = user.id
        return JsonResponse(user_to_dict(user))
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def auth_logout(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    request.session.flush()
    return JsonResponse({'message': 'Logged out'})


def auth_me(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return JsonResponse({'message': 'Unauthorized'}, status=401)
    try:
        user = User.objects.get(id=user_id)
        return JsonResponse(user_to_dict(user))
    except User.DoesNotExist:
        return JsonResponse({'message': 'Unauthorized'}, status=401)


# ─── Exam Views ───────────────────────────────────────────────────────────────

@require_auth
def exams_list_create(request):
    if request.method == 'GET':
        user = get_current_user(request)
        exams = Exam.objects.prefetch_related('questions').all()
        student_view = user.role == 'student'
        result = [exam_to_dict(e, include_questions=True, student_view=student_view) for e in exams]
        return JsonResponse(result, safe=False)

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            user = get_current_user(request)

            with transaction.atomic():
                exam = Exam.objects.create(
                    teacher=user,
                    title=data['title'],
                    description=data.get('description'),
                    duration_minutes=data['durationMinutes'],
                    is_published=data.get('isPublished', False),
                )
                for q in data.get('questions', []):
                    Question.objects.create(
                        exam=exam,
                        type=q.get('type', 'mcq'),
                        partition=q.get('partition', 1),
                        text=q['text'],
                        options=q.get('options') or [],
                        correct_answer=q.get('correctAnswer', ''),
                    )

            return JsonResponse(exam_to_dict(exam), status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

    return JsonResponse({'message': 'Method not allowed'}, status=405)


@require_auth
def exam_generate(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        text = ''
        if 'file' in request.FILES:
            import pypdf
            file_bytes = request.FILES['file'].read()
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text = ''.join(page.extract_text() or '' for page in reader.pages)
        else:
            text = request.POST.get('text', '')

        difficulty = request.POST.get('difficulty', 'medium')
        short_questions = int(request.POST.get('shortQuestions', 5))
        long_questions = int(request.POST.get('longQuestions', 0))

        result = generate_exam_questions(text, {
            'difficulty': difficulty,
            'shortQuestions': short_questions,
            'longQuestions': long_questions,
        })
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=400)


@require_auth
def exam_detail(request, exam_id):
    try:
        exam = Exam.objects.prefetch_related('questions').get(id=exam_id)
    except Exam.DoesNotExist:
        return JsonResponse({'message': 'Exam not found'}, status=404)

    if request.method == 'GET':
        user = get_current_user(request)
        student_view = user.role == 'student'
        return JsonResponse(exam_to_dict(exam, include_questions=True, student_view=student_view))

    elif request.method == 'PATCH':
        try:
            data = json.loads(request.body)
            if 'title' in data:
                exam.title = data['title']
            if 'description' in data:
                exam.description = data.get('description')
            if 'durationMinutes' in data:
                exam.duration_minutes = data['durationMinutes']
            if 'isPublished' in data:
                exam.is_published = data['isPublished']

            with transaction.atomic():
                exam.save()
                if 'questions' in data:
                    exam.questions.all().delete()
                    for q in data['questions']:
                        Question.objects.create(
                            exam=exam,
                            type=q.get('type', 'mcq'),
                            partition=q.get('partition', 1),
                            text=q['text'],
                            options=q.get('options') or [],
                            correct_answer=q.get('correctAnswer', ''),
                        )

            return JsonResponse(exam_to_dict(exam, include_questions=True))
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

    elif request.method == 'DELETE':
        try:
            with transaction.atomic():
                AttemptAnswer.objects.filter(attempt__exam=exam).delete()
                Attempt.objects.filter(exam=exam).delete()
                exam.questions.all().delete()
                exam.delete()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

    return JsonResponse({'message': 'Method not allowed'}, status=405)


@require_auth
def exam_publish(request, exam_id):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        exam = Exam.objects.get(id=exam_id)
        exam.is_published = True
        exam.save()
        return JsonResponse(exam_to_dict(exam))
    except Exam.DoesNotExist:
        return JsonResponse({'message': 'Exam not found'}, status=404)


# ─── Attempt Views ────────────────────────────────────────────────────────────

@require_auth
def attempts_list(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)

    user = get_current_user(request)

    if user.role == 'teacher':
        teacher_exam_ids = Exam.objects.filter(teacher=user).values_list('id', flat=True)
        attempts = Attempt.objects.filter(exam_id__in=teacher_exam_ids).select_related('exam', 'student')
        result = []
        for a in attempts:
            d = attempt_to_dict(a)
            d['exam'] = exam_to_dict(a.exam)
            d['student'] = {'id': a.student.id, 'username': a.student.username}
            result.append(d)
    else:
        attempts = Attempt.objects.filter(student=user).select_related('exam')
        result = []
        for a in attempts:
            d = attempt_to_dict(a)
            d['exam'] = exam_to_dict(a.exam)
            result.append(d)

    return JsonResponse(result, safe=False)


@require_auth
def attempt_start(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        exam_id = data['examId']
        user = get_current_user(request)

        existing = Attempt.objects.filter(
            exam_id=exam_id,
            student=user,
            is_completed=False,
        ).first()

        if existing:
            return JsonResponse(attempt_to_dict(existing), status=201)

        attempt = Attempt.objects.create(exam_id=exam_id, student=user)
        return JsonResponse(attempt_to_dict(attempt), status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=400)


@require_auth
def attempt_detail(request, attempt_id):
    try:
        attempt = Attempt.objects.select_related('exam', 'student').get(id=attempt_id)
    except Attempt.DoesNotExist:
        return JsonResponse({'message': 'Attempt not found'}, status=404)

    if request.method == 'GET':
        user = get_current_user(request)
        student_view = user.role == 'student'
        return JsonResponse(attempt_to_dict(attempt, include_exam=True, student_view=student_view))

    return JsonResponse({'message': 'Method not allowed'}, status=405)


@require_auth
def attempt_submit(request, attempt_id):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        answers = data.get('answers', [])

        attempt = Attempt.objects.get(id=attempt_id)
        all_questions = list(Question.objects.filter(exam_id=attempt.exam_id))
        mcq_questions = [q for q in all_questions if q.type == 'mcq']
        question_map = {q.id: q for q in all_questions}

        correct_count = 0

        with transaction.atomic():
            for ans in answers:
                question_id = ans['questionId']
                answer_text = ans['answer']
                q = question_map.get(question_id)
                if q:
                    AttemptAnswer.objects.create(
                        attempt=attempt,
                        question_id=question_id,
                        answer=answer_text,
                    )
                    if q.type == 'mcq' and q.correct_answer == answer_text:
                        correct_count += 1

            score = round((correct_count / len(mcq_questions)) * 100) if mcq_questions else 0
            attempt.end_time = timezone.now()
            attempt.is_completed = True
            attempt.score = score
            attempt.save()

        attempt.refresh_from_db()
        return JsonResponse(attempt_to_dict(attempt))
    except Attempt.DoesNotExist:
        return JsonResponse({'message': 'Attempt not found'}, status=404)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=400)
