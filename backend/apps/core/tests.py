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

    def test_profile_stores_height_and_rejects_impossible_values(self):
        ok = self.client.put('/api/profile/', {'weight': 72, 'height': 178}, format='json')
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()['height'], 178)
        self.assertEqual(self.client.put('/api/profile/', {'height': 5}, format='json').status_code, 400)
        self.assertEqual(self.client.put('/api/profile/', {'weight': 2000}, format='json').status_code, 400)

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


class NutritionPortionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_user('eater', 'eater@example.com', 'pw-123456'))
        # Keep tests offline and deterministic: no Groq.
        patcher = mock.patch('apps.core.services.groq_calorie_lookup', return_value=None)
        patcher.start()
        self.addCleanup(patcher.stop)
        patcher2 = mock.patch('apps.core.services.groq_chat_completion', return_value=None)
        patcher2.start()
        self.addCleanup(patcher2.stop)

    def search(self, **body):
        return self.client.post('/api/nutrition/search/', body, format='json')

    def test_parse_food_query(self):
        from .services import parse_food_query
        self.assertEqual(parse_food_query('200g chicken breast'), ('chicken breast', 200.0))
        self.assertEqual(parse_food_query('150 grams of rice'), ('rice', 150.0))
        self.assertEqual(parse_food_query('paneer'), ('paneer', None))

    def test_scales_per_100g_values_to_the_amount_eaten(self):
        result = self.search(query='chicken breast', grams=200).json()['result']
        self.assertEqual(result['per_100g']['calories'], 165)
        self.assertEqual(result['grams'], 200)
        self.assertEqual(result['calories'], 330)
        self.assertEqual(result['protein'], 62)

    def test_amount_written_in_the_query_is_used(self):
        self.assertEqual(self.search(query='200g chicken breast').json()['result']['calories'], 330)

    def test_defaults_to_100g(self):
        self.assertEqual(self.search(query='rice').json()['result']['grams'], 100)

    def test_prefers_the_closest_food_name(self):
        self.assertEqual(self.search(query='chicken').json()['result']['food'], 'Chicken')
        self.assertEqual(self.search(query='grilled chicken breast').json()['result']['food'], 'Chicken Breast')

    def test_unknown_food_is_not_invented(self):
        self.assertEqual(self.search(query='xyzzy food').status_code, 404)

    def test_logs_the_eaten_amount(self):
        from .models import NutritionLog
        self.search(query='egg', grams=50)
        self.assertEqual(NutritionLog.objects.latest('id').calories, 78)

    def test_rejects_impossible_amounts(self):
        self.assertEqual(self.search(query='rice', grams=0).status_code, 400)


class LocationSearchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_user('traveller', 't@example.com', 'pw-123456'))

    def test_returns_labelled_places(self):
        payload = {'results': [{'id': 1, 'name': 'Pune', 'admin1': 'Maharashtra', 'country': 'India', 'country_code': 'IN'}]}
        with mock.patch('httpx.get', return_value=httpx.Response(200, json=payload, request=httpx.Request('GET', 'https://x'))):
            data = self.client.get('/api/locations/search/', {'q': 'pune'}).json()
        self.assertEqual(data['results'][0]['label'], 'Pune, Maharashtra, India')

    def test_short_queries_return_nothing_without_calling_out(self):
        with mock.patch('httpx.get') as get:
            self.assertEqual(self.client.get('/api/locations/search/', {'q': 'p'}).json(), {'results': []})
        get.assert_not_called()

    def test_upstream_failure_is_a_clean_502(self):
        with mock.patch('httpx.get', side_effect=httpx.ConnectError('down')):
            self.assertEqual(self.client.get('/api/locations/search/', {'q': 'nowhere-xyz'}).status_code, 502)

    def test_requires_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/locations/search/', {'q': 'pune'}).status_code, 401)


class MusicTests(TestCase):
    TRACKS = [{'id': 'a1', 'title': 'Lift', 'artist': 'DJ', 'duration': 200, 'artwork': '', 'permalink': 'https://audius.co/x', 'stream_url': 'https://h/v1/tracks/a1/stream?app_name=ARIZE'}]

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('listener', 'l@example.com', 'pw-123456')
        self.client.force_authenticate(self.user)

    def test_returns_a_track_queue_and_logs_it(self):
        from .models import MusicRecommendation
        with mock.patch('apps.core.views.audius_mood_tracks', return_value=list(self.TRACKS)):
            res = self.client.post('/api/music/recommend/', {'mood': 'cardio'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['provider'], 'audius')
        self.assertEqual(res.json()['tracks'][0]['stream_url'], self.TRACKS[0]['stream_url'])
        self.assertEqual(MusicRecommendation.objects.get(user=self.user).provider, 'audius')

    def test_upstream_failure_is_a_clean_502(self):
        with mock.patch('apps.core.views.audius_mood_tracks', side_effect=RuntimeError('down')):
            self.assertEqual(self.client.post('/api/music/recommend/', {'mood': 'yoga'}, format='json').status_code, 502)

    def test_rejects_unknown_moods(self):
        self.assertEqual(self.client.post('/api/music/recommend/', {'mood': 'polka'}, format='json').status_code, 400)


class MusicSearchTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_search_returns_tracks(self):
        tracks = [{'id': 's1', 'title': 'Eye of the Tiger', 'artist': 'X', 'duration': 240, 'artwork': '', 'permalink': '', 'stream_url': 'https://h/s1'}]
        with mock.patch('apps.core.views.audius_search_tracks', return_value=tracks) as search:
            res = self.client.get('/api/music/search/', {'q': 'eye of the tiger'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['tracks'][0]['title'], 'Eye of the Tiger')
        search.assert_called_once_with('eye of the tiger')

    def test_short_query_returns_nothing(self):
        with mock.patch('apps.core.views.audius_search_tracks') as search:
            self.assertEqual(self.client.get('/api/music/search/', {'q': 'a'}).json(), {'tracks': []})
        search.assert_not_called()

    def test_upstream_failure_is_502(self):
        with mock.patch('apps.core.views.audius_search_tracks', side_effect=RuntimeError('down')):
            self.assertEqual(self.client.get('/api/music/search/', {'q': 'rock'}).status_code, 502)
