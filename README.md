# AgentProfiler

A Python tool to convert agent tracings (JSONs with tool calls) to interactive UpSet Plots using D3.js. Capable of visualizing plots in Jupyter Notebooks using IPython.

## Features

- **Parse Agent Traces**: Load and parse JSON files containing agent tool call data
- **Interactive UpSet Plots**: Generate beautiful, interactive visualizations using D3.js
- **Jupyter Integration**: Display plots directly in Jupyter Notebooks
- **Export to HTML**: Save visualizations as standalone HTML files
- **Flexible Input Formats**: Support for various trace data formats

## Installation

```bash
pip install agentprofiler
```

For Jupyter Notebook support:

```bash
pip install agentprofiler[jupyter]
```

For development:

```bash
pip install agentprofiler[dev]
```

## Quick Start

### Basic Usage

```python
from agentprofiler import AgentProfiler

# Load traces from a JSON file
profiler = AgentProfiler("traces.json")

# Display in Jupyter Notebook
profiler.show()

# Or save to HTML file
profiler.save("output.html")
```

### Working with Trace Data

```python
from agentprofiler import AgentProfiler

# Create traces programmatically
traces = [
    {
        "id": "trace_1",
        "tool_calls": [
            {"name": "search"},
            {"name": "read_file"},
            {"name": "write_file"}
        ]
    },
    {
        "id": "trace_2", 
        "tool_calls": [
            {"name": "search"},
            {"name": "read_file"}
        ]
    },
    {
        "id": "trace_3",
        "tool_calls": [
            {"name": "execute_code"}
        ]
    }
]

# Initialize profiler with traces
profiler = AgentProfiler(traces)

# Get summary statistics
print(profiler.summary())
# Output: {'total_traces': 3, 'unique_tools': 4, 'tools': [...], ...}

# Access the tools found
print(profiler.tools)
# Output: ['execute_code', 'read_file', 'search', 'write_file']
```

### Method Chaining

```python
from agentprofiler import AgentProfiler

profiler = (
    AgentProfiler()
    .load("initial_traces.json")
    .add_trace({"id": "new", "tool_calls": [{"name": "new_tool"}]})
)
profiler.show()
```

### Customizing the Plot

```python
profiler.plot(
    width=1000,
    height=600,
    bar_color="#4a90d9",
    highlight_color="#f5a623"
).show()
```

## Supported Trace Formats

AgentProfiler supports multiple common formats for tool call data:

```python
# Format 1: Using 'tool_calls' with 'name'
{"tool_calls": [{"name": "search"}, {"name": "read"}]}

# Format 2: Using 'toolCalls' with 'toolName'
{"toolCalls": [{"toolName": "search"}]}

# Format 3: Using 'calls' with 'function'
{"calls": [{"function": "search"}]}

# Format 4: Using 'steps'
{"steps": [{"name": "search"}, {"name": "read"}]}

# Format 5: Simple string arrays
{"tool_calls": ["search", "read"]}
```

## API Reference

### AgentProfiler

Main class for loading traces and generating visualizations.

#### Methods

- `load(data)` - Load traces from file, JSON string, or list
- `add_trace(trace)` - Add a single trace
- `add_traces(traces)` - Add multiple traces
- `plot(**kwargs)` - Create an UpSetPlot object
- `show(**kwargs)` - Display in Jupyter Notebook
- `save(filepath, **kwargs)` - Save to HTML file
- `to_html(**kwargs)` - Get HTML string
- `summary()` - Get summary statistics

#### Properties

- `traces` - List of loaded traces
- `tools` - List of unique tools
- `num_traces` - Total number of traces
- `upset_data` - Computed UpSet plot data

### UpSetPlot

Class for rendering UpSet plot visualizations.

#### Methods

- `to_html(include_d3=True)` - Generate HTML string
- `save(filepath)` - Save to HTML file
- `show()` - Display in Jupyter Notebook

## License

MIT License - see [LICENSE](LICENSE) for details