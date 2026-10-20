from unittest import mock

import httpx
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class AuthFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def signup(self, username='alice', email='Alice@Example.com', password='password123'):
        return self.client.post('/api/auth/signup/', {'username': username, 'email': email, 'password': password}, format='json')

    def test_signup_returns_tokens_and_normalises_email(self):
        response = self.signup()
        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.json()['tokens'])
        self.assertEqual(User.objects.get(username='alice').email, 'alice@example.com')

    def test_signup_rejects_duplicate_username_and_email_case_insensitively(self):
        self.signup()
        self.assertEqual(self.signup(username='ALICE', email='other@example.com').status_code, 400)
        self.assertEqual(self.signup(username='bob', email='alice@EXAMPLE.com').status_code, 400)

    def test_login_with_username_or_email(self):
        self.signup()
        for identifier in ('alice', 'ALICE', 'alice@example.com'):
            response = self.client.post('/api/auth/login/', {'username': identifier, 'password': 'password123'}, format='json')
            self.assertEqual(response.status_code, 200, identifier)

    def test_login_rejects_wrong_password(self):
        self.signup()
        response = self.client.post('/api/auth/login/', {'username': 'alice', 'password': 'nope'}, format='json')
        self.assertEqual(response.status_code, 401)

    def test_unverified_google_email_login_is_gone(self):
        response = self.client.post('/api/auth/google/', {'email': 'victim@example.com'}, format='json')
        self.assertEqual(response.status_code, 404)

    def test_demo_login_works_but_demo_has_no_password(self):
        self.assertEqual(self.client.post('/api/auth/demo/', {}, format='json').status_code, 200)
        self.assertFalse(User.objects.get(username='demo_user').has_usable_password())


class SupabaseExchangeTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_returns_503_when_not_configured(self):
        with override_settings(SUPABASE_URL='', SUPABASE_ANON_KEY=''):
            response = self.client.post('/api/auth/supabase/', {'access_token': 't'}, format='json')
        self.assertEqual(response.status_code, 503)

    @override_settings(SUPABASE_URL='https://x.supabase.co', SUPABASE_ANON_KEY='key')
    def test_valid_session_creates_user_and_returns_backend_tokens(self):
        sb_user = httpx.Response(200, json={'email': 'New@Example.com', 'user_metadata': {'username': 'newbie'}})
        with mock.patch('httpx.get', return_value=sb_user) as get:
            response = self.client.post('/api/auth/supabase/', {'access_token': 'sb-token'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['user']['username'], 'newbie')
        self.assertEqual(get.call_args.kwargs['headers']['Authorization'], 'Bearer sb-token')

        token = response.json()['tokens']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(self.client.get('/api/profile/').status_code, 200)

    @override_settings(SUPABASE_URL='https://x.supabase.co', SUPABASE_ANON_KEY='key')
    def test_invalid_session_is_rejected(self):
        with mock.patch('httpx.get', return_value=httpx.Response(401, json={})):
            response = self.client.post('/api/auth/supabase/', {'access_token': 'bad'}, format='json')
        self.assertEqual(response.status_code, 401)


class ChangePasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('carol', 'carol@example.com', 'old-password-1')
        self.client.force_authenticate(self.user)

    def change(self, current, new):
        return self.client.post('/api/auth/change-password/', {'current_password': current, 'new_password': new}, format='json')

    def test_changes_password_with_correct_current_password(self):
        self.assertEqual(self.change('old-password-1', 'Brand-new-pass-77').status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Brand-new-pass-77'))

    def test_rejects_wrong_current_password(self):
        response = self.change('wrong', 'Brand-new-pass-77')
        self.assertEqual(response.status_code, 400)
        self.assertIn('incorrect', response.json()['detail'])

    def test_rejects_weak_new_password(self):
        self.assertEqual(self.change('old-password-1', '123').status_code, 400)

    def test_social_accounts_can_set_a_first_password(self):
        self.user.set_unusable_password()
        self.user.save()
        self.assertEqual(self.change('', 'Brand-new-pass-77').status_code, 200)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.change('old-password-1', 'Brand-new-pass-77').status_code, 401)


class ProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_user('dave', 'dave@example.com', 'pw-123456'))

    def test_profile_accepts_null_age_and_weight(self):
        response = self.client.put('/api/profile/', {'age': None, 'weight': None, 'goal': 'fat_loss'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()['age'])


class RaceConditionTests(TestCase):
    """Simulate the 'another request created it first' race deterministically."""

    def setUp(self):
        self.client = APIClient()

    def test_get_or_create_safely_returns_existing_row_after_integrity_error(self):
        from django.db import IntegrityError
        from .views import get_or_create_safely

        user = User.objects.create_user('race', 'race@example.com', 'pw-123456')
        with mock.patch.object(User.objects, 'get_or_create', side_effect=IntegrityError('duplicate')):
            found, created = get_or_create_safely(User, username='race')
        self.assertEqual(found, user)
        self.assertFalse(created)

    def test_signup_collision_returns_400_not_500(self):
        from django.db import IntegrityError

        with mock.patch('apps.core.serializers.SignupSerializer.save', side_effect=IntegrityError('duplicate')):
            response = self.client.post('/api/auth/signup/', {'username': 'twin', 'email': 'twin@example.com', 'password': 'Sturdy-pass-2026'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_demo_login_is_idempotent_and_keeps_one_account(self):
        ids = {self.client.post('/api/auth/demo/', {}, format='json').json()['user']['id'] for _ in range(3)}
        self.assertEqual(len(ids), 1)
        self.assertEqual(User.objects.filter(username='demo_user').count(), 1)
