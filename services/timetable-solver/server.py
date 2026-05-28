#!/usr/bin/env python3
"""HTTP wrapper for solve.py — POST /solve with JSON body."""
import json
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

SOLVE = Path(__file__).resolve().parent / "solve.py"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path.rstrip("/") != "/solve":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            proc = subprocess.run(
                [sys.executable, str(SOLVE)],
                input=body,
                capture_output=True,
                text=True,
                timeout=120,
            )
            out = proc.stdout.strip() or json.dumps({"assignments": [], "status": "error"})
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(out.encode("utf-8"))
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e), "assignments": []}).encode())

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    print(f"OR-Tools solver listening on http://0.0.0.0:{PORT}/solve")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
