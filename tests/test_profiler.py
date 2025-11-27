"""Tests for the main AgentProfiler class."""

import json
import tempfile

import pytest

from agentprofiler import AgentProfiler
from agentprofiler.upset_plot import UpSetPlot


class TestAgentProfiler:
    """Tests for AgentProfiler class."""

    @pytest.fixture
    def sample_traces(self):
        """Sample trace data for testing."""
        return [
            {"id": "1", "tool_calls": [{"name": "search"}, {"name": "read"}]},
            {"id": "2", "tool_calls": [{"name": "search"}, {"name": "read"}]},
            {"id": "3", "tool_calls": [{"name": "write"}]},
        ]

    def test_init_without_data(self):
        """Test initialization without data."""
        profiler = AgentProfiler()
        assert profiler.num_traces == 0
        assert profiler.tools == []

    def test_init_with_data(self, sample_traces):
        """Test initialization with data."""
        profiler = AgentProfiler(sample_traces)
        assert profiler.num_traces == 3
        assert set(profiler.tools) == {"search", "read", "write"}

    def test_load_from_list(self, sample_traces):
        """Test loading data from a list."""
        profiler = AgentProfiler()
        result = profiler.load(sample_traces)
        assert result is profiler  # Method chaining
        assert profiler.num_traces == 3

    def test_load_from_file(self, sample_traces):
        """Test loading data from a JSON file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(sample_traces, f)
            f.flush()
            profiler = AgentProfiler(f.name)
        assert profiler.num_traces == 3

    def test_add_trace(self, sample_traces):
        """Test adding a single trace."""
        profiler = AgentProfiler(sample_traces)
        profiler.add_trace({"id": "4", "tool_calls": [{"name": "delete"}]})
        assert profiler.num_traces == 4
        assert "delete" in profiler.tools

    def test_add_traces(self, sample_traces):
        """Test adding multiple traces."""
        profiler = AgentProfiler(sample_traces)
        profiler.add_traces([
            {"id": "4", "tool_calls": [{"name": "delete"}]},
            {"id": "5", "tool_calls": [{"name": "update"}]},
        ])
        assert profiler.num_traces == 5

    def test_traces_property(self, sample_traces):
        """Test the traces property."""
        profiler = AgentProfiler(sample_traces)
        traces = profiler.traces
        assert len(traces) == 3
        assert all("id" in t for t in traces)
        assert all("tool_calls" in t for t in traces)

    def test_upset_data_property(self, sample_traces):
        """Test the upset_data property."""
        profiler = AgentProfiler(sample_traces)
        data = profiler.upset_data
        assert "sets" in data
        assert "intersections" in data
        assert "total_traces" in data
        assert data["total_traces"] == 3

    def test_upset_data_cached(self, sample_traces):
        """Test that upset_data is cached."""
        profiler = AgentProfiler(sample_traces)
        data1 = profiler.upset_data
        data2 = profiler.upset_data
        assert data1 is data2  # Same object

    def test_upset_data_cache_invalidated_on_load(self, sample_traces):
        """Test that cache is invalidated on load."""
        profiler = AgentProfiler(sample_traces)
        data1 = profiler.upset_data
        profiler.load([{"id": "new", "tool_calls": []}])
        data2 = profiler.upset_data
        assert data1 is not data2

    def test_plot_returns_upset_plot(self, sample_traces):
        """Test that plot() returns an UpSetPlot."""
        profiler = AgentProfiler(sample_traces)
        plot = profiler.plot()
        assert isinstance(plot, UpSetPlot)

    def test_plot_custom_params(self, sample_traces):
        """Test plot() with custom parameters."""
        profiler = AgentProfiler(sample_traces)
        plot = profiler.plot(width=1000, height=600, bar_color="#ff0000")
        assert plot.width == 1000
        assert plot.height == 600
        assert plot.bar_color == "#ff0000"

    def test_save(self, sample_traces, tmp_path):
        """Test saving to HTML file."""
        profiler = AgentProfiler(sample_traces)
        filepath = tmp_path / "output.html"
        profiler.save(str(filepath))
        assert filepath.exists()
        content = filepath.read_text()
        assert "<!DOCTYPE html>" in content

    def test_to_html(self, sample_traces):
        """Test to_html() method."""
        profiler = AgentProfiler(sample_traces)
        html = profiler.to_html()
        assert "<!DOCTYPE html>" in html
        assert "search" in html
        assert "read" in html

    def test_summary(self, sample_traces):
        """Test summary() method."""
        profiler = AgentProfiler(sample_traces)
        summary = profiler.summary()
        assert summary["total_traces"] == 3
        assert summary["unique_tools"] == 3
        assert set(summary["tools"]) == {"search", "read", "write"}
        assert summary["unique_combinations"] == 2
        assert summary["most_common_combination"] is not None

    def test_repr_html(self, sample_traces):
        """Test _repr_html_ for Jupyter display."""
        profiler = AgentProfiler(sample_traces)
        html = profiler._repr_html_()
        assert "upset-container" in html

    def test_repr(self, sample_traces):
        """Test __repr__ method."""
        profiler = AgentProfiler(sample_traces)
        repr_str = repr(profiler)
        assert "AgentProfiler" in repr_str
        assert "traces=3" in repr_str
        assert "tools=3" in repr_str

    def test_method_chaining(self, sample_traces):
        """Test that methods support chaining."""
        profiler = (
            AgentProfiler()
            .load(sample_traces)
            .add_trace({"id": "4", "tool_calls": [{"name": "new"}]})
        )
        assert profiler.num_traces == 4
