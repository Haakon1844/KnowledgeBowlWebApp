"""Launch the Knowledge Bowl quiz locally.  Usage: python launch.py   (Ctrl+C to stop)"""
import functools, http.server, os, socketserver, threading, webbrowser

PORT = 8000
FOLDER = os.path.dirname(os.path.abspath(__file__))
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=FOLDER)
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("127.0.0.1", PORT), handler) as server:
    url = f"http://localhost:{PORT}/index.html"
    print(f"Quiz running at {url}  (Ctrl+C to stop)")
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
