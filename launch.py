"""Launch the Knowledge Bowl quiz on this machine.

Usage:  python launch.py
Keep this file in the same folder as knowledge-bowl-quiz.html.
Press Ctrl+C in the terminal to stop the server.
"""
import functools
import http.server
import os
import socketserver
import threading
import webbrowser

PORT = 8000
FOLDER = os.path.dirname(os.path.abspath(__file__))
PAGE = "knowledge-bowl-quiz.html"

if not os.path.exists(os.path.join(FOLDER, PAGE)):
    raise SystemExit(f"Can't find {PAGE} next to launch.py. Put both files in the same folder.")

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=FOLDER)
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("127.0.0.1", PORT), handler) as server:
    url = f"http://localhost:{PORT}/{PAGE}"
    print(f"Quiz running at {url}  (Ctrl+C to stop)")
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
