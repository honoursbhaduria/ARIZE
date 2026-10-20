"""Live smoke test for the auth API (signup, login, demo, refresh, protected routes).

Runs real HTTP requests against a running backend and prints PASS/FAIL per check.
Usage: python scripts/check_auth_api.py [base_url]   (default http://localhost:8000/api)
"""
import json
import sys
import uuid
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8000/api').rstrip('/')
results = []


def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{BASE}{path}', data=data, method=method)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            return res.status, json.loads(res.read() or b'{}')
    except urllib.error.HTTPError as err:
        raw = err.read()
        try:
            return err.code, json.loads(raw or b'{}')
        except json.JSONDecodeError:
            return err.code, {'raw': raw[:200].decode(errors='replace')}


def check(name, condition, detail=''):
    results.append(condition)
    print(f"{'PASS' if condition else 'FAIL'}  {name}" + (f'  -> {detail}' if not condition and detail else ''))


def main():
    tag = uuid.uuid4().hex[:8]
    user = {'username': f'check_{tag}', 'email': f'Check_{tag}@Example.com', 'password': 'Sturdy-pass-2026'}

    print(f'Auth API checks against {BASE}\n')

    # ---------- Register ----------
    status, body = call('POST', '/auth/signup/', user)
    check('signup creates the account (201)', status == 201, (status, body))
    check('signup returns access + refresh tokens', bool(body.get('tokens', {}).get('access')) and bool(body.get('tokens', {}).get('refresh')), body)
    check('signup lowercases the email', body.get('user', {}).get('email') == user['email'].lower(), body.get('user'))
    signup_access = body.get('tokens', {}).get('access')

    status, _ = call('POST', '/auth/signup/', {**user, 'email': f'other_{tag}@example.com', 'username': user['username'].upper()})
    check('duplicate username is rejected (any case)', status == 400, status)
    status, _ = call('POST', '/auth/signup/', {**user, 'username': f'other_{tag}', 'email': user['email'].upper()})
    check('duplicate email is rejected (any case)', status == 400, status)
    status, body = call('POST', '/auth/signup/', {'username': f'short_{tag}', 'email': f'short_{tag}@example.com', 'password': '123'})
    check('too-short password is rejected', status == 400, (status, body))
    status, _ = call('POST', '/auth/signup/', {'username': f'bad_{tag}', 'email': 'not-an-email', 'password': 'Sturdy-pass-2026'})
    check('invalid email is rejected', status == 400, status)
    status, _ = call('POST', '/auth/signup/', {'username': '   ', 'email': f'blank_{tag}@example.com', 'password': 'Sturdy-pass-2026'})
    check('blank username is rejected', status == 400, status)
    status, _ = call('POST', '/auth/signup/', {})
    check('empty signup body is rejected', status == 400, status)

    # ---------- Login ----------
    for label, identifier in [('username', user['username']), ('username in caps', user['username'].upper()),
                              ('email', user['email'].lower()), ('email in caps', user['email'].upper()),
                              ('username with spaces around', f"  {user['username']}  ")]:
        status, body = call('POST', '/auth/login/', {'username': identifier, 'password': user['password']})
        check(f'login by {label} works', status == 200 and bool(body.get('tokens', {}).get('access')), (status, body))

    status, body = call('POST', '/auth/login/', {'username': user['username'], 'password': 'wrong-password'})
    check('wrong password is rejected (401) with a clear message', status == 401 and 'invalid' in str(body).lower(), (status, body))
    status, _ = call('POST', '/auth/login/', {'username': f'nobody_{tag}', 'password': 'whatever123'})
    check('unknown user is rejected (401)', status == 401, status)
    status, _ = call('POST', '/auth/login/', {'username': user['username']})
    check('missing password is rejected (400)', status == 400, status)
    status, _ = call('POST', '/auth/login/', {})
    check('empty login body is rejected (400)', status == 400, status)

    status, body = call('POST', '/auth/login/', {'username': user['username'], 'password': user['password']})
    access, refresh = body['tokens']['access'], body['tokens']['refresh']

    # ---------- Tokens actually work ----------
    status, _ = call('GET', '/profile/', token=access)
    check('login token opens a protected route', status == 200, status)
    status, _ = call('GET', '/profile/', token=signup_access)
    check('signup token opens a protected route', status == 200, status)
    status, _ = call('GET', '/profile/')
    check('protected route without a token is refused (401)', status == 401, status)
    status, _ = call('GET', '/profile/', token='garbage.token.value')
    check('protected route with a bad token is refused (401)', status == 401, status)

    status, body = call('POST', '/auth/token/refresh/', {'refresh': refresh})
    check('refresh token returns a new access token', status == 200 and bool(body.get('access')), (status, body))
    if body.get('access'):
        status, _ = call('GET', '/profile/', token=body['access'])
        check('refreshed access token works', status == 200, status)
    status, _ = call('POST', '/auth/token/refresh/', {'refresh': 'garbage'})
    check('bad refresh token is refused (401)', status == 401, status)

    # ---------- Demo ----------
    status, body = call('POST', '/auth/demo/', {})
    check('demo login works', status == 200 and body.get('user', {}).get('username') == 'demo_user', (status, body))
    demo_access = body.get('tokens', {}).get('access')
    status, _ = call('GET', '/profile/', token=demo_access)
    check('demo token opens a protected route', status == 200, status)
    status, _ = call('GET', '/dashboard/summary/', token=demo_access)
    check('demo account can load its dashboard data', status == 200, status)

    ids = set()
    for _ in range(3):
        status, body = call('POST', '/auth/demo/', {})
        ids.add((status, body.get('user', {}).get('id')))
    check('demo login is repeatable and always the same account', len(ids) == 1 and next(iter(ids))[0] == 200, ids)

    with ThreadPoolExecutor(max_workers=6) as pool:
        parallel = list(pool.map(lambda _: call('POST', '/auth/demo/', {}), range(6)))
    check('6 demo logins at once all succeed', all(s == 200 for s, _ in parallel), [s for s, _ in parallel])
    check('parallel demo logins all land on one account', len({b.get('user', {}).get('id') for _, b in parallel}) == 1)

    status, _ = call('POST', '/auth/login/', {'username': 'demo_user', 'password': 'demopassword123'})
    check('old public demo password no longer logs in', status == 401, status)

    passed = sum(results)
    print(f'\n{passed}/{len(results)} checks passed')
    sys.exit(0 if passed == len(results) else 1)


if __name__ == '__main__':
    main()
