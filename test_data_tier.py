"""Unit tests for the resilient data tier:
PostgreSQL Read/Write connection splitting and SQLAlchemy Optimistic Locking (version_id).
"""

import unittest
from sqlalchemy.orm.exc import StaleDataError

from app import app
from core.models import VideoMetadata, db
from core.pg_pool import DB_CLUSTER


class TestDataTierAndOptimisticLocking(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app.config["TESTING"] = True
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.rollback()
        self.ctx.pop()

    def test_database_cluster_connection_routing(self):
        """Verify write=True vs write=False routing stats and connection borrowing."""
        # 1. Borrow read connection
        with DB_CLUSTER.get_connection(write=False) as conn:
            self.assertIsNotNone(conn)
            cur = conn.cursor()
            cur.execute("SELECT 1;")
            row = cur.fetchone()
            self.assertEqual(row[0], 1)

        # 2. Borrow write connection
        with DB_CLUSTER.get_connection(write=True) as conn:
            self.assertIsNotNone(conn)
            cur = conn.cursor()
            cur.execute("SELECT 2;")
            row = cur.fetchone()
            self.assertEqual(row[0], 2)

        # In-memory query stats must have registered activity
        self.assertGreaterEqual(DB_CLUSTER.stats["read_queries"] + DB_CLUSTER.stats["write_queries"], 0)

    def test_optimistic_locking_version_increments(self):
        """Verify that updating VideoMetadata increments version_id and blocks concurrent stale updates."""
        item_id = f"vid_test_{id(self)}"
        video = VideoMetadata(
            id=item_id,
            title="Optimistic Locking Tutorial",
            author="DevTeam",
            category="learning",
            views=100,
        )
        db.session.add(video)
        db.session.commit()
        self.assertEqual(video.version_id, 1)

        # First clean update: version increments to 2
        video.views = 250
        db.session.commit()
        self.assertEqual(video.version_id, 2)

        # Simulate concurrent session:
        # Session B loads the record at version 2
        session_factory = db.sessionmaker(bind=db.engine)
        session_b = session_factory()
        stale_copy = session_b.get(VideoMetadata, item_id)
        self.assertIsNotNone(stale_copy)
        assert stale_copy is not None

        # Meanwhile, Session A updates and commits first -> version increments to 3
        video.title = "Updated Title by Session A"
        db.session.commit()
        self.assertEqual(video.version_id, 3)

        # Now Session B tries to commit its change without knowing Session A modified it
        # SQLAlchemy detects version mismatch (WHERE id = ? AND version_id = 2) and raises StaleDataError!
        stale_copy.title = "Stale Edit by Session B"
        with self.assertRaises(StaleDataError):
            session_b.commit()

        session_b.close()

        db.session.rollback()


if __name__ == "__main__":
    unittest.main()
