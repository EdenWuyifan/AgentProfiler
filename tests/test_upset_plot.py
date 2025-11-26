"""Tests for the UpSet Plot module."""

import pytest

from agentprofiler.upset_plot import UpSetPlot


class TestUpSetPlot:
    """Tests for UpSetPlot class."""

    @pytest.fixture
    def sample_data(self):
        """Create sample UpSet data for testing."""
        return {
            "sets": ["search", "read", "write"],
            "intersections": [
                {"sets": ["search", "read"], "size": 5},
                {"sets": ["write"], "size": 3},
                {"sets": ["search"], "size": 2},
            ],
            "total_traces": 10,
        }

    def test_init_default_params(self, sample_data):
        """Test initialization with default parameters."""
        plot = UpSetPlot(sample_data)
        assert plot.data == sample_data
        assert plot.width == 800
        assert plot.height == 500
        assert plot.bar_color == "#4a90d9"
        assert plot.highlight_color == "#f5a623"

    def test_init_custom_params(self, sample_data):
        """Test initialization with custom parameters."""
        plot = UpSetPlot(
            sample_data,
            width=1000,
            height=600,
            bar_color="#ff0000",
            highlight_color="#00ff00",
        )
        assert plot.width == 1000
        assert plot.height == 600
        assert plot.bar_color == "#ff0000"
        assert plot.highlight_color == "#00ff00"

    def test_to_html_includes_d3(self, sample_data):
        """Test that to_html includes D3.js by default."""
        plot = UpSetPlot(sample_data)
        html = plot.to_html()
        assert "d3.v7.min.js" in html
        assert "<!DOCTYPE html>" in html
        assert "AgentProfiler" in html

    def test_to_html_without_d3(self, sample_data):
        """Test that to_html can exclude D3.js."""
        plot = UpSetPlot(sample_data)
        html = plot.to_html(include_d3=False)
        assert "d3.v7.min.js" not in html

    def test_html_contains_data(self, sample_data):
        """Test that HTML contains the data."""
        plot = UpSetPlot(sample_data)
        html = plot.to_html()
        assert '"sets":' in html
        assert '"intersections":' in html
        assert "search" in html
        assert "read" in html
        assert "write" in html

    def test_repr_html(self, sample_data):
        """Test _repr_html_ for Jupyter display."""
        plot = UpSetPlot(sample_data)
        html = plot._repr_html_()
        assert "upset-container" in html
        assert "d3" in html

    def test_save_creates_file(self, sample_data, tmp_path):
        """Test that save() creates an HTML file."""
        plot = UpSetPlot(sample_data)
        filepath = tmp_path / "test_plot.html"
        plot.save(str(filepath))
        assert filepath.exists()
        content = filepath.read_text()
        assert "<!DOCTYPE html>" in content

    def test_save_creates_directories(self, sample_data, tmp_path):
        """Test that save() creates parent directories."""
        plot = UpSetPlot(sample_data)
        filepath = tmp_path / "subdir" / "nested" / "plot.html"
        plot.save(str(filepath))
        assert filepath.exists()

    def test_unique_plot_ids(self, sample_data):
        """Test that each plot gets a unique ID."""
        plot1 = UpSetPlot(sample_data)
        plot2 = UpSetPlot(sample_data)
        assert plot1._plot_id != plot2._plot_id

    def test_css_contains_colors(self, sample_data):
        """Test that CSS includes custom colors."""
        plot = UpSetPlot(sample_data, bar_color="#123456", highlight_color="#abcdef")
        css = plot._get_css()
        assert "#123456" in css
        assert "#abcdef" in css

    def test_javascript_contains_dimensions(self, sample_data):
        """Test that JavaScript includes dimensions."""
        plot = UpSetPlot(sample_data, width=1234, height=567)
        js = plot._get_javascript()
        assert "1234" in js
        assert "567" in js
