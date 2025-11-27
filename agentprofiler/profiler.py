"""
Main AgentProfiler class providing a unified interface for the library.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from .parser import compute_upset_data, parse_traces
from .upset_plot import UpSetPlot


class AgentProfiler:
    """
    AgentProfiler: Convert agent tracings to interactive UpSet Plots.

    This class provides a simple interface to:
    1. Load agent tracing data from JSON files or Python objects
    2. Parse and analyze tool call patterns
    3. Generate interactive UpSet Plot visualizations
    4. Display visualizations in Jupyter Notebooks

    Example usage:
        >>> from agentprofiler import AgentProfiler
        >>> profiler = AgentProfiler("traces.json")
        >>> profiler.show()  # Display in Jupyter
        >>> profiler.save("output.html")  # Save to file
    """

    def __init__(
        self,
        data: Optional[Union[str, Path, List[Dict[str, Any]]]] = None
    ):
        """
        Initialize the AgentProfiler.

        Args:
            data: Optional input data. Can be:
                - A file path to a JSON file
                - A JSON string
                - A list of trace dictionaries
                - None (data can be loaded later with load())
        """
        self._traces: List[Dict[str, Any]] = []
        self._upset_data: Optional[Dict[str, Any]] = None

        if data is not None:
            self.load(data)

    def load(self, data: Union[str, Path, List[Dict[str, Any]]]) -> "AgentProfiler":
        """
        Load trace data from various sources.

        Args:
            data: Input data - file path, JSON string, or list of traces.

        Returns:
            Self for method chaining.

        Example:
            >>> profiler = AgentProfiler()
            >>> profiler.load("traces.json").show()
        """
        self._traces = parse_traces(data)
        self._upset_data = None  # Reset cached data
        return self

    def add_trace(self, trace: Dict[str, Any]) -> "AgentProfiler":
        """
        Add a single trace to the profiler.

        Args:
            trace: A trace dictionary containing tool call information.

        Returns:
            Self for method chaining.
        """
        normalized = parse_traces([trace])
        self._traces.extend(normalized)
        self._upset_data = None  # Reset cached data
        return self

    def add_traces(self, traces: List[Dict[str, Any]]) -> "AgentProfiler":
        """
        Add multiple traces to the profiler.

        Args:
            traces: A list of trace dictionaries.

        Returns:
            Self for method chaining.
        """
        normalized = parse_traces(traces)
        self._traces.extend(normalized)
        self._upset_data = None  # Reset cached data
        return self

    @property
    def traces(self) -> List[Dict[str, Any]]:
        """Get the list of loaded traces."""
        return self._traces

    @property
    def upset_data(self) -> Dict[str, Any]:
        """
        Get the computed UpSet plot data.

        Returns:
            Dictionary containing 'sets', 'intersections', and 'total_traces'.
        """
        if self._upset_data is None:
            self._upset_data = compute_upset_data(self._traces)
        return self._upset_data

    @property
    def tools(self) -> List[str]:
        """Get list of all unique tools found in traces."""
        return self.upset_data["sets"]

    @property
    def num_traces(self) -> int:
        """Get the total number of traces."""
        return len(self._traces)

    def plot(
        self,
        width: int = 800,
        height: int = 500,
        bar_color: str = "#4a90d9",
        highlight_color: str = "#f5a623"
    ) -> UpSetPlot:
        """
        Create an UpSet Plot visualization.

        Args:
            width: Width of the plot in pixels.
            height: Height of the plot in pixels.
            bar_color: Color for intersection size bars.
            highlight_color: Color for hover highlighting.

        Returns:
            An UpSetPlot object that can be displayed or saved.
        """
        return UpSetPlot(
            data=self.upset_data,
            width=width,
            height=height,
            bar_color=bar_color,
            highlight_color=highlight_color
        )

    def show(self, **kwargs) -> None:
        """
        Display the UpSet Plot in a Jupyter Notebook.

        Args:
            **kwargs: Additional arguments passed to plot().
        """
        self.plot(**kwargs).show()

    def save(self, filepath: str, **kwargs) -> None:
        """
        Save the UpSet Plot to an HTML file.

        Args:
            filepath: Path to save the HTML file.
            **kwargs: Additional arguments passed to plot().
        """
        self.plot(**kwargs).save(filepath)

    def to_html(self, **kwargs) -> str:
        """
        Generate HTML string for the UpSet Plot.

        Args:
            **kwargs: Additional arguments passed to plot().

        Returns:
            Complete HTML string for the visualization.
        """
        return self.plot(**kwargs).to_html()

    def summary(self) -> Dict[str, Any]:
        """
        Get a summary of the loaded trace data.

        Returns:
            Dictionary containing summary statistics.
        """
        upset = self.upset_data
        return {
            "total_traces": upset["total_traces"],
            "unique_tools": len(upset["sets"]),
            "tools": upset["sets"],
            "unique_combinations": len(upset["intersections"]),
            "most_common_combination": (
                upset["intersections"][0] if upset["intersections"] else None
            )
        }

    def _repr_html_(self) -> str:
        """IPython/Jupyter HTML representation."""
        return self.plot()._repr_html_()

    def __repr__(self) -> str:
        """String representation of the profiler."""
        return (
            f"AgentProfiler(traces={self.num_traces}, "
            f"tools={len(self.tools)})"
        )
