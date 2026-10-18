"""PyTest suite for VideoExtractor — tests standard, embed, and query-param URLs."""
import pytest
from video_url_extractor import VideoExtractor, ExtractionError


def test_standard_watch_url():
    video_id = VideoExtractor.extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert video_id == "dQw4w9WgXcQ"


def test_short_link_with_query_params():
    video_id = VideoExtractor.extract_video_id("https://youtu.be/dQw4w9WgXcQ?t=120s")
    assert video_id == "dQw4w9WgXcQ"


def test_watch_url_with_preceding_query_param():
    """Real-world defect: Query parameters preceding 'v=' parameter."""
    video_id = VideoExtractor.extract_video_id("https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ")
    assert video_id == "dQw4w9WgXcQ"


def test_embed_url():
    video_id = VideoExtractor.extract_video_id("https://www.youtube.com/embed/dQw4w9WgXcQ")
    assert video_id == "dQw4w9WgXcQ"


def test_invalid_url_raises_error():
    with pytest.raises(ExtractionError):
        VideoExtractor.extract_video_id("https://example.com/not-a-video")
