-- Questions asked through the docs "Ask AI" widget, kept for docs-gap
-- analysis only. Deliberately nothing personal: no IP address, no user
-- agent, no identifiers of any kind — just the question text and outcome.
--
--   answered: 1 when documentation excerpts were found and an answer was
--             streamed, 0 when the index had nothing relevant.
--   resolved: set by the widget's thumbs up/down feedback (1/0); NULL when
--             the reader gave no feedback.
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answered INTEGER NOT NULL DEFAULT 0,
  resolved INTEGER NULL,
  created_at TEXT NOT NULL
);
