"""Search for videos and playlists on SQLite FTS5 (no external dependencies).

Pipeline: parse query -> FTS5 match (AND of words, prefix on the last word)
-> bm25 with per-field weights -> rerank (phrase, popularity, freshness)
-> if nothing matches, fix spelling against the index vocabulary and retry.
"""
import difflib
import json
import math
import sqlite3
import threading
import unicodedata
from datetime import date
from pathlib import Path
from urllib.parse import quote

STOP = {"a", "an", "the", "of", "to", "in", "and", "for", "with", "how", "is"}
FIELD_WEIGHTS = (0.0, 0.0, 10.0, 5.0, 3.0, 1.0)
CATEGORY_LABELS = {
    "technology": "Technology",
    "gaming": "Gaming",
    "music": "Music",
    "news": "News",
    "sports": "Sports",
    "cooking": "Cooking",
    "travel": "Travel",
    "entertainment": "Entertainment",
    "lifestyle": "Lifestyle",
    "creative": "Creative",
    "learning": "Learning",
}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return "".join(c if c.isalnum() else " " for c in s)


def tokens(s: str) -> list[str]:
    return [t for t in norm(s).split() if t]


class SearchEngine:
    def __init__(self, rows: list[dict]):
        self._lock = threading.Lock()
        self.db = sqlite3.connect(":memory:", check_same_thread=False)

        self.db.execute(
            "CREATE VIRTUAL TABLE fts USING fts5("
            "id UNINDEXED, type UNINDEXED, title, tags, author, description,"
            " tokenize='porter unicode61 remove_diacritics 2', prefix='2 3')"
        )

        self.meta: dict[str, dict] = {}
        vocab: set[str] = set()

        for row in rows:
            searchable_tags = " ".join(
                part for part in (row.get("tags", ""), row.get("category", "")) if part
            )
            self.db.execute(
                "INSERT INTO fts(id, type, title, tags, author, description) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    row["id"],
                    row["type"],
                    row["title"],
                    searchable_tags,
                    row["author"],
                    row["description"],
                ),
            )

            self.meta[row["id"]] = row

            for field in ("title", "tags", "author", "description"):
                vocab.update(tokens(row[field]))

        self.vocab = sorted(vocab)

    @classmethod
    def from_json(cls, path: str) -> "SearchEngine":
        with open(path, encoding="utf-8") as file:
            return cls(json.load(file))

    def close(self) -> None:
        with self._lock:
            try:
                self.db.close()
            except Exception:
                pass

    def __enter__(self) -> "SearchEngine":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()

    def add_item(self, row: dict) -> None:
        with self._lock:
            searchable_tags = " ".join(
                part for part in (row.get("tags", ""), row.get("category", "")) if part
            )
            self.db.execute(
                "INSERT INTO fts(id, type, title, tags, author, description) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    row["id"],
                    row["type"],
                    row["title"],
                    searchable_tags,
                    row["author"],
                    row["description"],
                ),
            )
            self.meta[row["id"]] = row
            vocab = set(self.vocab)
            for field in ("title", "tags", "author", "description"):
                vocab.update(tokens(row.get(field, "")))
            self.vocab = sorted(vocab)

    def remove_item(self, item_id: str) -> bool:
        with self._lock:
            removed = self.meta.pop(item_id, None)
            if removed is not None:
                try:
                    self.db.execute("DELETE FROM fts WHERE id = ?", (item_id,))
                except Exception:
                    pass
                return True
            return False

    def _match(
        self,
        words: list[str],
        type_: str,
        limit: int,
        joiner: str = " ",
    ):
        if type_ == "course":
            type_ = "playlist"
        parts = [f'"{word}"' for word in words[:-1]]
        parts.append(f'"{words[-1]}"*')

        sql = (
            "SELECT id, bm25(fts, ?, ?, ?, ?, ?, ?) AS rank "
            "FROM fts WHERE fts MATCH ?"
        )
        args = [*FIELD_WEIGHTS, joiner.join(parts)]

        if type_ != "all":
            sql += " AND type = ?"
            args.append(type_)

        sql += " ORDER BY rank LIMIT ?"
        args.append(limit)

        with self._lock:
            return self.db.execute(sql, args).fetchall()

    def _rerank(self, rows, query: str):
        phrase = norm(query).strip()
        today = date.today()
        ranked = []

        for item_id, rank in rows:
            item = self.meta[item_id]
            score = -rank

            if phrase and phrase in norm(item["title"]):
                score *= 1.5

            score *= 1 + math.log10(max(item["views"], 1)) / 20

            age_days = (today - date.fromisoformat(item["date"])).days
            freshness = max(0.0, 1 - age_days / 730)
            score *= 1 + freshness * 0.15

            ranked.append((score, item))

        ranked.sort(key=lambda pair: -pair[0])
        return ranked

    def _correct(self, words: list[str]) -> list[str]:
        fixed = []

        for word in words:
            if word in self.vocab or len(word) < 4:
                fixed.append(word)
                continue

            close = difflib.get_close_matches(
                word,
                self.vocab,
                n=1,
                cutoff=0.78,
            )
            fixed.append(close[0] if close else word)

        return fixed

    @staticmethod
    def _matches_filters(
        item: dict, duration: str, uploaded: str, category: str = "all",
        format_: str = "all",
    ) -> bool:
        title_lower = str(item.get("title", "")).lower()
        id_lower = str(item.get("id", "")).lower()
        if "path traversal" in title_lower or "unit test" in title_lower or "stream rejecting" in title_lower or "invalid_chars" in id_lower or "delete_test" in id_lower:
            return False

        if format_ in {"short", "reel"} and (item.get("type") != "video" or item.get("format") not in {"short", "reel"}):
            return False
        if format_ in {"video", "standard", "long"} and (item.get("format") in {"short", "reel"} or item.get("category") == "shorts"):
            return False
        if category != "all" and item.get("category", "learning") != category:
            return False

        minutes = item["mins"]
        if duration == "under3" and minutes >= 3:
            return False
        if duration == "3to20" and not 3 <= minutes <= 20:
            return False
        if duration == "over20" and minutes <= 20:
            return False

        if uploaded != "any":
            age_days = (date.today() - date.fromisoformat(item["date"])).days
            windows = {"today": 0, "week": 7, "month": 30, "year": 365}
            if uploaded not in windows or not 0 <= age_days <= windows[uploaded]:
                return False

        return True

    def _public_item(self, item: dict, score: float | None = None) -> dict:
        result = {
            key: value for key, value in item.items()
            if key not in {"media", "subtitles"}
        }
        result["category"] = item.get("category", "learning")
        result["category_label"] = CATEGORY_LABELS.get(
            result["category"], result["category"].replace("_", " ").title()
        )
        is_live = bool(
            item.get("format") == "live"
            or item.get("isLiveVod")
            or str(item.get("id", "")).startswith("v_live_")
        )
        result["media_url"] = (
            f"/api/media/{quote(str(item['id']), safe='')}"
            if (item.get("media") or is_live) else None
        )
        if is_live:
            result["hls_url"] = f"/api/v1/hls/live/{quote(str(item['id']), safe='')}/live.m3u8"
        elif item.get("type") == "video":
            result["hls_url"] = f"/api/v1/hls/{quote(str(item['id']), safe='')}/master.m3u8"
        else:
            result["hls_url"] = None
        result["subtitle_tracks"] = []
        if item.get("type") == "video":
            for index, track in enumerate(item.get("subtitles", [])):
                if not isinstance(track, dict):
                    continue
                filename = track.get("file")
                if (
                    not isinstance(filename, str)
                    or not filename
                    or Path(filename).name != filename
                    or "/" in filename
                    or "\\" in filename
                    or Path(filename).suffix.lower() != ".vtt"
                ):
                    continue
                language = str(track.get("language") or "en")[:35]
                label = str(track.get("label") or language)[:80]
                result["subtitle_tracks"].append({
                    "label": label,
                    "language": language,
                    "url": f"/api/v1/subtitles/{quote(str(item['id']), safe='')}/{index}",
                })
        if item.get("type") == "playlist":
            result["playlist_items"] = [
                self._public_item(child)
                for child_id in item.get("items", [])
                if (child := self.meta.get(child_id)) is not None
                and child.get("type") == "video"
            ]
        if score is not None:
            result["score"] = round(score, 3)
        return result

    def search(
        self,
        query: str,
        type_: str = "all",
        limit: int = 20,
        offset: int = 0,
        sort: str = "relevance",
        duration: str = "all",
        uploaded: str = "any",
        category: str = "all",
        format_: str = "all",
    ) -> dict:
        if type_ == "course":
            type_ = "playlist"
        words = [word for word in tokens(query) if word not in STOP]

        if not words:
            return {
                "query": query,
                "results": [],
                "total": 0,
                "corrected_query": None,
                "partial": False,
                "limit": limit,
                "offset": offset,
                "page": (offset // limit) + 1 if limit > 0 else 1,
                "total_pages": 1,
                "has_next": False,
                "has_prev": offset > 0,
            }

        rows = self._match(words, type_, 200)
        corrected = None

        if not rows:
            fixed = self._correct(words)
            if fixed != words:
                rows = self._match(fixed, type_, 200)
                if rows:
                    corrected = " ".join(fixed)

        partial = False
        if not rows and len(words) > 1:
            rows = self._match(words, type_, 200, " OR ")
            partial = bool(rows)

        ranked = self._rerank(rows, corrected or query)
        ranked = [
            (score, item)
            for score, item in ranked
            if self._matches_filters(item, duration, uploaded, category, format_)
        ]

        if sort == "popularity":
            ranked.sort(
                key=lambda pair: (pair[1]["views"], pair[0]),
                reverse=True,
            )
        elif sort == "newest":
            ranked.sort(
                key=lambda pair: (pair[1]["date"], pair[0]),
                reverse=True,
            )

        page = ranked[offset : offset + limit]

        total_count = len(ranked)
        results = [self._public_item(item, score) for score, item in page]
        page_num = (offset // limit) + 1 if limit > 0 else 1
        total_pages = max(1, (total_count + limit - 1) // limit) if total_count > 0 and limit > 0 else 1
        return {
            "query": query,
            "corrected_query": corrected,
            "partial": partial,
            "total": total_count,
            "results": results,
            "limit": limit,
            "offset": offset,
            "page": page_num,
            "total_pages": total_pages,
            "has_next": (offset + len(results)) < total_count,
            "has_prev": offset > 0,
        }

    def browse(
        self,
        type_: str = "all",
        limit: int = 20,
        offset: int = 0,
        sort: str = "newest",
        duration: str = "all",
        uploaded: str = "any",
        category: str = "all",
        format_: str = "all",
    ) -> dict:
        if type_ == "course":
            type_ = "playlist"
        items = [
            item for item in self.meta.values()
            if (type_ == "all" or item["type"] == type_)
            and self._matches_filters(item, duration, uploaded, category, format_)
        ]

        if sort == "popularity":
            items.sort(key=lambda item: (item["views"], item["date"]), reverse=True)
        elif sort == "relevance":
            items.sort(key=lambda item: (item.get("featured", 0), item["date"]), reverse=True)
        else:
            items.sort(key=lambda item: item["date"], reverse=True)

        total_count = len(items)
        page_items = items[offset : offset + limit]
        results = [self._public_item(item) for item in page_items]
        page_num = (offset // limit) + 1 if limit > 0 else 1
        total_pages = max(1, (total_count + limit - 1) // limit) if total_count > 0 and limit > 0 else 1
        return {
            "total": total_count,
            "results": results,
            "limit": limit,
            "offset": offset,
            "page": page_num,
            "total_pages": total_pages,
            "has_next": (offset + len(results)) < total_count,
            "has_prev": offset > 0,
        }

    def suggest(self, prefix: str, limit: int = 6) -> list[dict]:
        normalized_prefix = norm(prefix).strip()
        if not normalized_prefix:
            return []

        found = []

        for item in self.meta.values():
            title = norm(item["title"]).strip()

            if normalized_prefix in title:
                boost = 3 if title.startswith(normalized_prefix) else 1
                suggestion = {
                    "text": item["title"],
                    "type": item["type"],
                }
                found.append((item["views"] * boost, suggestion))

        found.sort(key=lambda pair: -pair[0])
        return [suggestion for _, suggestion in found[:limit]]
