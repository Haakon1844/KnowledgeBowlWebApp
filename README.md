# Knowledge Bowl Practice Quiz

A free, static web app for practicing Knowledge Bowl written-round questions. No accounts, no server.

## Run it
- **Online:** enable GitHub Pages (below) and share the link.
- **On your computer:** `python launch.py` (needs Python 3). It opens http://localhost:8000/index.html.
  Opening `index.html` by double-click will not work, because the browser blocks loading `questions.json` from a file.

## Host it free with GitHub Pages
Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save.**
After a minute the site is at `https://<your-username>.github.io/KnowledgeBowlWebApp/`.

## Files
| File | Purpose |
|---|---|
| `index.html`, `style.css`, `app.js` | The app |
| `questions.json` | All questions. First option is always the correct one; the app shuffles options |
| `generate_questions.py` | Generates new questions with Claude into a review queue |
| `launch.py` | Local server |

## Features
Pick question sets and count, timed mode, drill weak spots, flag bad questions, graded review with retake-missed. Stats and flags are saved in your browser only.

## Add questions
**By hand:** add an entry to `questions.json`: `{"id": "art-026", "group": "Art", "category": "Art", "question": "...", "options": ["correct", "wrong", "wrong", "wrong"]}`. A new `group` name automatically becomes a new set on the start screen.

**With AI:** the API key stays on your machine, never in the website.
```
export ANTHROPIC_API_KEY=your-key
python generate_questions.py --group Science --count 10 --topic "chemistry and physics"
python generate_questions.py --review
python generate_questions.py --approve
```
Always read them in `--review` first. AI-written questions can have wrong answers. Then commit and push.

## Roadmap
- Add answer choices for the remaining open-answer packet questions
- Multiplayer (needs a backend such as Supabase)
