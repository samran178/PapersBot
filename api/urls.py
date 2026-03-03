from django.urls import path
from . import views

urlpatterns = [
    path('auth/register', views.auth_register),
    path('auth/login', views.auth_login),
    path('auth/logout', views.auth_logout),
    path('auth/me', views.auth_me),

    path('exams', views.exams_list_create),
    path('exams/generate', views.exam_generate),
    path('exams/<int:exam_id>/publish', views.exam_publish),
    path('exams/<int:exam_id>', views.exam_detail),

    path('attempts', views.attempts_list),
    path('attempts/start', views.attempt_start),
    path('attempts/<int:attempt_id>/submit', views.attempt_submit),
    path('attempts/<int:attempt_id>/ai-grade', views.attempt_ai_grade),
    path('attempts/<int:attempt_id>/grade', views.attempt_grade),
    path('attempts/<int:attempt_id>', views.attempt_detail),
]
