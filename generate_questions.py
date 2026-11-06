#!/usr/bin/env python3
"""Generate new Knowledge Bowl questions with Google Gemini (free tier works), review them, then merge them in.

Setup:   1. Get a free key at https://aistudio.google.com/apikey
         2. Set it (never commit your key):
              Mac/Linux:   export GEMINI_API_KEY=your-key
              Windows CMD: set GEMINI_API_KEY=your-key
              PowerShell:  $env:GEMINI_API_KEY="your-key"
Steps:   python generate_questions.py --group Art --count 10      # writes questions_pending.json
         python generate_questions.py --review                    # read them, correct answer marked with *
         python generate_questions.py --approve                   # merge pending into questions.json

Generated questions can be wrong. Always review before approving.
Uses only the Python standard library.
"""
import argparse, json, os, random, re, sys, time, urllib.error, urllib.request

MODEL = os.environ.get("KB_MODEL", "gemini-2.5-flash")   # override with KB_MODEL if Google retires it
API = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"
QFILE, PFILE = "questions.json", "questions_pending.json"


def load(path):
    return json.load(open(path, encoding="utf-8")) if os.path.exists(path) else []


def save(path, data):
    json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def ask_gemini(prompt):
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("Set GEMINI_API_KEY first (see the top of this file).")
    body = json.dumps({"contents": [{"role": "user", "parts": [{"text": prompt}]}],
                       "generationConfig": {"responseMimeType": "application/json", "temperature": 0.8}}).encode()
    req = urllib.request.Request(API.format(MODEL), body, {"content-type": "application/json", "x-goog-api-key": key})
    for attempt in range(4):                      # the free tier is rate limited, so back off and retry
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)["candidates"][0]["content"]["parts"][0]["text"]
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < 3:
                wait = 15 * (attempt + 1)
                print(f"Rate limited or busy ({e.code}), retrying in {wait}s...")
                time.sleep(wait)
                continue
            sys.exit(f"Gemini API error {e.code}: {e.read().decode()[:300]}")


def generate(group, count, topic):
    existing = load(QFILE) + load(PFILE)
    same = [q for q in existing if q["group"].lower() == group.lower()] or existing
    examples = "\n".join(f"- {q['question']} | correct: {q['options'][0]} | wrong: {'; '.join(q['options'][1:])}"
                         for q in random.sample(same, min(6, len(same))))
    avoid = "\n".join("- " + q["question"] for q in existing[-60:])
    prompt = f"""You write practice questions for a U.S. academic Knowledge Bowl written round: specific, factual, high-school level and up.

Style examples:
{examples}

Write {count} NEW multiple-choice questions for the set "{group}"{f', focused on: {topic}' if topic else ''}.
Rules: exactly 4 options; the FIRST option must be the correct one (the app shuffles them); distractors plausible and the same type as the answer; only facts you are certain of; no duplicates of these existing questions:
{avoid}

Reply with ONLY a JSON array, no markdown fences:
[{{"category":"short topic label","question":"...","options":["correct","wrong","wrong","wrong"]}}]"""
    text = ask_gemini(prompt)
    items = json.loads(re.search(r"\[.*\]", text, re.S).group(0))
    seen = {q["question"].strip().lower() for q in existing}
    pending, prefix = load(PFILE), re.sub(r"\W+", "", group.lower())[:8] or "gen"
    n = sum(q["id"].startswith(prefix + "-") for q in existing) + 1
    added = 0
    for it in items:
        opts = [str(o).strip() for o in it.get("options", [])]
        q = str(it.get("question", "")).strip()
        if len(opts) != 4 or len(set(opts)) != 4 or not q or q.lower() in seen:
            continue
        pending.append({"id": f"{prefix}-{n:03d}", "group": group, "category": str(it.get("category", group)).strip(), "question": q, "options": opts})
        seen.add(q.lower()); n += 1; added += 1
    save(PFILE, pending)
    print(f"Added {added} question(s) to {PFILE}. Run with --review, then --approve.")


def review():
    pending = load(PFILE)
    if not pending:
        return print("Nothing pending.")
    for q in pending:
        print(f"\n[{q['id']}] ({q['group']} / {q['category']})\n{q['question']}")
        for i, o in enumerate(q["options"]):
            print(f"   {'*' if i == 0 else ' '} {'ABCD'[i]}) {o}")
    print(f"\n{len(pending)} pending. Edit {PFILE} to fix or delete entries, then run --approve.")


def approve():
    pending = load(PFILE)
    if not pending:
        return print("Nothing pending.")
    save(QFILE, load(QFILE) + pending)
    os.remove(PFILE)
    print(f"Merged {len(pending)} question(s) into {QFILE}. Commit and push to update the site.")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--group", default="Mixed topics (from the practice packet)", help="question set name, e.g. Art, Sports, Science")
    p.add_argument("--count", type=int, default=10)
    p.add_argument("--topic", default="", help="optional focus, e.g. 'Renaissance painters'")
    p.add_argument("--review", action="store_true")
    p.add_argument("--approve", action="store_true")
    a = p.parse_args()
    review() if a.review else approve() if a.approve else generate(a.group, a.count, a.topic)
