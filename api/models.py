from django.db import models


class User(models.Model):
    username = models.TextField(unique=True)
    password = models.TextField()
    role = models.TextField(default='student')

    class Meta:
        db_table = 'users'


class Exam(models.Model):
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exams')
    title = models.TextField()
    description = models.TextField(null=True, blank=True)
    duration_minutes = models.IntegerField()
    is_published = models.BooleanField(default=False, null=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    available_days = models.IntegerField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'exams'


class Question(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='questions')
    type = models.TextField(default='mcq')
    partition = models.IntegerField(default=1)
    text = models.TextField()
    options = models.JSONField(null=True, blank=True)
    correct_answer = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'questions'


class Attempt(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attempts')
    current_partition = models.IntegerField(default=1)
    start_time = models.DateTimeField(auto_now_add=True, null=True)
    end_time = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(null=True, blank=True)
    is_completed = models.BooleanField(default=False, null=True)
    is_timeout = models.BooleanField(default=False, null=True)

    class Meta:
        db_table = 'attempts'


class AttemptAnswer(models.Model):
    attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer = models.TextField()
    marks = models.IntegerField(null=True, blank=True)
    ai_suggested_marks = models.IntegerField(null=True, blank=True)
    ai_feedback = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'attempt_answers'
