"""Times every read endpoint (median of 5 calls) with a demo session.
Usage: python scripts/time_api.py [base_url]"""
import json, statistics, sys, time, urllib.error, urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8000/api').rstrip('/')
GETS = ['/health/', '/profile/', '/dashboard/summary/', '/dashboard/progress/', '/workouts/sessions/', '/workouts/summary/',
        '/nutrition/logs/', '/analytics/consistency/', '/analytics/overview/', '/analytics/streak-leaderboard/',
        '/progress/photos/', '/notifications/preferences/', '/shopping/cart/', '/sleep/logs/', '/rag/memory/',
        '/integrations/bands/sync/', '/features/']


def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            payload = res.read()
            status = res.status
    except urllib.error.HTTPError as err:
        payload, status = err.read(), err.code
    return status, (time.perf_counter() - start) * 1000, payload


status, ms, body = call('POST', '/auth/demo/', body={})
token = json.loads(body)['tokens']['access']
print(f'{"endpoint":38} {"status":>6} {"median ms":>10} {"bytes":>9}')
for path in GETS:
    runs = [call('GET', path, token) for _ in range(5)]
    print(f'{path:38} {runs[-1][0]:>6} {statistics.median(r[1] for r in runs):>10.1f} {len(runs[-1][2]):>9}')
for name, (method, path, payload) in {
    'login': ('POST', '/auth/login/', {'username': 'nobody', 'password': 'x'}),
    'demo': ('POST', '/auth/demo/', {}),
}.items():
    runs = [call(method, path, body=payload) for _ in range(5)]
    print(f'{name + " " + path:38} {runs[-1][0]:>6} {statistics.median(r[1] for r in runs):>10.1f}')
