"""Startup regressions that can be exercised without a Windows desktop."""
import contextlib
import io
import json
from pathlib import Path
import queue
import re
import socket
import subprocess
import sys
import threading
import time
import urllib.request
from unittest.mock import patch

from backend.content import load_catalogue
from scripts.launch import bind_local_socket, open_when_ready

ROOT = Path(__file__).resolve().parents[1]


def test_catalogue_loads_with_a_legacy_windows_default_encoding():
    original = Path.read_text

    def windows_default(path, *args, **kwargs):
        if path.parent.name == 'content' and kwargs.get('encoding') is None and not args:
            kwargs['encoding'] = 'cp1251'
        return original(path, *args, **kwargs)

    with patch.object(Path, 'read_text', windows_default):
        content = load_catalogue()
    assert content['vocabulary'][0]['ky'] == 'Саламатсызбы!'
    window = next(word for word in content['vocabulary'] if word['id'] == 'home-3')
    assert window['ky'] == 'Терезе'
    assert window['translations']['ru'] == 'Окно'


def test_launcher_avoids_an_occupied_port():
    with socket.socket() as occupied:
        occupied.bind(('127.0.0.1', 0))
        occupied.listen()
        first = occupied.getsockname()[1]
        with bind_local_socket(first) as available:
            assert available.getsockname()[0] == '127.0.0.1'
            assert available.getsockname()[1] != first


def test_port_failure_is_reported_when_all_candidates_are_unavailable():
    with socket.socket() as occupied:
        occupied.bind(('127.0.0.1', 0))
        occupied.listen()
        import pytest
        with pytest.raises(OSError, match='Could not bind'):
            bind_local_socket(occupied.getsockname()[1], attempts=1)


def test_browser_waits_for_health_and_ignores_proxy_environment(monkeypatch):
    class Server:
        started = False

    server = Server()
    stopped = threading.Event()
    opened = []
    proxies = []
    requests = []

    class Response(io.BytesIO):
        status = 200

    class Client:
        def open(self, url, timeout):
            requests.append(url)
            return Response(json.dumps({'status': 'ok'}).encode())

    def build(handler):
        proxies.append(handler.proxies)
        return Client()

    monkeypatch.setattr(urllib.request, 'build_opener', build)
    worker = threading.Thread(target=open_when_ready,
                              args=(server, 'http://127.0.0.1:12345/', stopped),
                              kwargs={'opener': lambda url: opened.append(url) or True, 'timeout': 3})
    worker.start()
    time.sleep(.15)
    assert not opened and not requests
    server.started = True
    worker.join(timeout=3)
    assert not worker.is_alive()
    assert proxies == [{}]
    assert requests == ['http://127.0.0.1:12345/api/health']
    assert opened == ['http://127.0.0.1:12345/']


def test_browser_does_not_open_after_startup_is_cancelled():
    class Server:
        started = False
    stopped = threading.Event()
    stopped.set()
    opened = []
    open_when_ready(Server(), 'http://127.0.0.1:12345/', stopped, opener=opened.append)
    assert opened == []


def test_real_launcher_serves_the_game_from_another_working_directory(tmp_path):
    process = subprocess.Popen(
        [sys.executable, '-X', 'utf8', '-u', str(ROOT / 'scripts/launch.py'), '--port', '0', '--no-browser'],
        cwd=tmp_path, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8')
    lines = queue.Queue()
    captured = []

    def collect():
        for line in process.stdout:
            lines.put(line)

    reader = threading.Thread(target=collect, daemon=True)
    reader.start()
    url = None
    try:
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline:
            if process.poll() is not None:
                break
            try:
                line = lines.get(timeout=.1)
            except queue.Empty:
                continue
            captured.append(line)
            match = re.search(r'http://127\.0\.0\.1:\d+/', line)
            if match:
                url = match[0]
            if url:
                try:
                    with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(url+'api/health', timeout=1) as response:
                        if json.load(response).get('status') == 'ok':
                            break
                except OSError:
                    pass
        assert url is not None, ''.join(captured)
        with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(url, timeout=3) as response:
            assert response.status == 200
            assert 'Kyrgyz City' in response.read().decode('utf-8')
        assert 'Kyrgyz City launcher' in (ROOT/'launch.log').read_text(encoding='utf-8')
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=3)
        reader.join(timeout=2)
        process.stdout.close()


def test_startup_failure_is_saved_to_a_local_log(tmp_path):
    scripts = tmp_path/'scripts'
    scripts.mkdir()
    (scripts/'launch.py').write_text((ROOT/'scripts/launch.py').read_text(encoding='utf-8'), encoding='utf-8')
    (tmp_path/'main.py').write_text("raise RuntimeError('startup diagnostic example')\n", encoding='utf-8')
    result = subprocess.run([sys.executable, str(scripts/'launch.py'), '--no-browser'],
                            cwd=tmp_path, capture_output=True, text=True, encoding='utf-8', timeout=10)
    assert result.returncode == 1
    assert 'startup diagnostic example' in (tmp_path/'launch.log').read_text(encoding='utf-8')
    assert 'launch.log' in result.stdout
