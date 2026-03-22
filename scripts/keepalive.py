import os
import time
import urllib.request
import urllib.error

TARGETS = [
    os.getenv('KEEPALIVE_DJANGO_URL', ''),
    os.getenv('KEEPALIVE_FASTAPI_URL', ''),
]


def ping(url: str) -> None:
    started = time.time()
    try:
        with urllib.request.urlopen(url, timeout=20) as response:
            elapsed_ms = int((time.time() - started) * 1000)
            print(f'OK {url} status={response.status} time_ms={elapsed_ms}')
    except urllib.error.HTTPError as exc:
        elapsed_ms = int((time.time() - started) * 1000)
        print(f'HTTP_ERROR {url} status={exc.code} time_ms={elapsed_ms}')
    except Exception as exc:
        elapsed_ms = int((time.time() - started) * 1000)
        print(f'ERROR {url} error={exc} time_ms={elapsed_ms}')


def main() -> None:
    configured = 0
    for target in TARGETS:
        if target and target.strip():
            configured += 1
            ping(target.strip())

    if configured == 0:
        print('No keepalive URLs configured. Set KEEPALIVE_DJANGO_URL and/or KEEPALIVE_FASTAPI_URL.')


if __name__ == '__main__':
    main()
