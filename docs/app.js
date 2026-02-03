:root { color-scheme: dark; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  background: #0b0f14;
  color: #e8eef6;
}
.wrap { max-width: 900px; margin: 0 auto; padding: 16px; }
h1 { margin: 8px 0 4px; font-size: 1.6rem; }
.muted { color: #9fb0c3; }
.controls { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
input, select {
  background: #101826;
  border: 1px solid #223247;
  color: #e8eef6;
  padding: 10px 12px;
  border-radius: 10px;
  outline: none;
}
input { flex: 1; min-width: 240px; }
select { min-width: 180px; }

.card {
  background: #0f1723;
  border: 1px solid #223247;
  border-radius: 14px;
  padding: 14px;
  margin: 12px 0;
}
.card h2 { margin: 0 0 8px; font-size: 1.1rem; }
.badge {
  display: inline-block;
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: #17263a;
  border: 1px solid #223247;
  color: #cfe1ff;
  margin-left: 8px;
}
.kv { margin-top: 10px; }
.kv strong { color: #cfe1ff; }
ul { margin: 8px 0 0 18px; }
small { font-size: 0.85rem; }
a { color: #8db7ff; text-decoration: none; }
a:hover { text-decoration: underline; }
