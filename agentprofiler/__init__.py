"""
AgentProfiler: A tool to convert agent tracings to interactive UpSet Plots.

This package provides functionality to:
- Parse agent tracing JSON files containing tool calls
- Generate interactive UpSet Plot visualizations using D3.js
- Display visualizations in Jupyter Notebooks using IPython
"""

from .parser import parse_traces
from .profiler import AgentProfiler
from .upset_plot import UpSetPlot

__version__ = "0.1.0"
__all__ = ["AgentProfiler", "parse_traces", "UpSetPlot"]
