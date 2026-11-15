"""Start the local game, keep a local log, and open a browser only when ready."""
from __future__ import annotations

import argparse
import contextlib
import io
import json
import os
from pathlib import Path
import socket
import sys
import threading
import traceback
import urllib.error
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
LOG_PATH = ROOT / 'launch.log'


class Tee(io.TextIOBase):
    def __init__(self, console, log):
        self.console = console
        self.log = log

    @property
    def encoding(self):
        return 'utf-8'

    def write(self, text):
        self.console.write(text)
        self.log.write(text)
        self.flush()
        return len(text)

    def flush(self):
        self.console.flush()
        self.log.flush()

    def isatty(self):
        return False


def bind_local_socket(first_port: int, attempts: int = 11) -> socket.socket:
    """Bind the actual listening socket now, avoiding a free-port check race."""
    if not 0 <= first_port <= 65535:
        raise ValueError('Port must be between 0 and 65535')
    ports = [0] if first_port == 0 else range(first_port, min(65536, first_port + attempts))
    last_error = None
    for port in ports:
        connection = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
                connection.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            connection.bind(('127.0.0.1', port))
            connection.listen(128)
            return connection
        except OSError as error:
            last_error = error
            connection.close()
    raise OSError('Could not bind a local port; all candidate ports are occupied or blocked') from last_error


def open_when_ready(server, url: str, stopped: threading.Event, opener=None, timeout=30):
    """Never open an unavailable page or route a loopback health check through a proxy."""
    opener = opener or webbrowser.open
    client = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    remaining = max(1, int(timeout / .1))
    for _ in range(remaining):
        if stopped.is_set():
            return
        if server.started:
            try:
                with client.open(url + 'api/health', timeout=1) as response:
                    healthy = response.status == 200 and json.load(response).get('status') == 'ok'
            except (OSError, ValueError, urllib.error.URLError):
                healthy = False
            if healthy and not stopped.is_set():
                print('\nИгра готова. Открываем браузер: ' + url, flush=True)
                try:
                    opened = opener(url)
                except Exception:
                    opened = False
                if not opened:
                    print('Откройте этот адрес в браузере вручную: ' + url, flush=True)
                return
        stopped.wait(.1)
    if not stopped.is_set():
        print('Сервер ещё не готов. Посмотрите сообщения в этом окне и файл launch.log.', flush=True)


def run(port=8000, open_browser=True):
    sys.path.insert(0, str(ROOT))
    os.chdir(ROOT)
    try:
        import uvicorn
        from main import app
    except Exception:
        print('\nНе удалось загрузить игру. Ошибка сохранена в launch.log.', flush=True)
        traceback.print_exc()
        return 1

    try:
        connection = bind_local_socket(port)
    except (OSError, ValueError):
        print('\nНе удалось открыть локальный порт. Подробности в launch.log.', flush=True)
        traceback.print_exc()
        return 1

    actual_port = connection.getsockname()[1]
    url = f'http://127.0.0.1:{actual_port}/'
    print('\nKyrgyz City — запуск игры', flush=True)
    print('Адрес игры: ' + url, flush=True)
    print('Оставьте это окно открытым. Остановка игры: Ctrl+C.', flush=True)
    print('Подробности запуска сохраняются в launch.log.\n', flush=True)
    server = uvicorn.Server(uvicorn.Config(app, host='127.0.0.1', port=actual_port,
                                           log_level='info', access_log=False))
    stopped = threading.Event()
    browser = None
    if open_browser:
        browser = threading.Thread(target=open_when_ready, args=(server, url, stopped), daemon=True)
        browser.start()
    try:
        server.run(sockets=[connection])
        return 0 if server.started else 1
    except KeyboardInterrupt:
        return 0
    except Exception:
        print('\nЗапуск прерван ошибкой. Подробности в launch.log.', flush=True)
        traceback.print_exc()
        return 1
    finally:
        stopped.set()
        connection.close()
        if browser is not None:
            browser.join(timeout=3)


def main():
    parser = argparse.ArgumentParser(description='Launch Kyrgyz City locally')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    for stream in [sys.stdout, sys.stderr]:
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='replace')
    try:
        log = LOG_PATH.open('a', encoding='utf-8', buffering=1)
    except OSError as error:
        print('Не удалось создать launch.log. Переместите игру в папку с правом записи.\n' + str(error))
        return 1
    with log, contextlib.redirect_stdout(Tee(sys.stdout, log)), contextlib.redirect_stderr(Tee(sys.stderr, log)):
        print('\n' + '=' * 55 + '\nKyrgyz City launcher | Python ' + sys.version.split()[0], flush=True)
        return run(args.port, not args.no_browser)


if __name__ == '__main__':
    raise SystemExit(main())
