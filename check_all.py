from search_engine import SearchEngine
from app import app

print("--- 1. search_engine.py check ---")
engine = SearchEngine.from_json("catalog.json")
print("suggest('') =", engine.suggest(''))
print("suggest('py') =", engine.suggest('py'))
print(
    "search('python') me kitne results:",
    len(engine.search('python')['results'])
)

print("\n--- 2. app.py check ---")
with app.test_client() as c:
    r1 = c.get('/api/suggest?q=')
    print("/api/suggest?q= ->", r1.status_code, r1.get_json())
    print("Cache header:", r1.headers.get('Cache-Control'))

    r2 = c.get('/api/suggest?q=py')
    print("/api/suggest?q=py ->", r2.get_json())

    r3 = c.get('/api/search?q=python')
    print(
        "/api/search?q=python ->",
        len(r3.get_json()['results']),
        "results"
    )

print("\n--- 3. static/index.html check ---")
with open('static/index.html', encoding='utf-8') as f:
    html = f.read()
with open('static/watchbloom.js', encoding='utf-8') as f:
    js = f.read()
    if 'watchbloom.js' in html and 'q.addEventListener("input"' in js and '/api/suggest?q=' in js:
        print("index.html/watchbloom.js OK - input listener aur suggest API mile")
    else:
        print("Frontend me GALTI hai - input listener ya suggest API nahi mila")

print("\nSab check ho gaya!")
