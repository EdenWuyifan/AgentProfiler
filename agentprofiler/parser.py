"""
Parser module for extracting tool calls from agent tracing JSON data.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Set, Union

# Keys that contain tool call data and should not be copied to metadata
TOOL_CALL_KEYS = frozenset(["tool_calls", "toolCalls", "calls", "steps"])
# Keys that identify a trace and should not be copied to metadata
ID_KEYS = frozenset(["id", "trace_id"])
# All reserved keys that should not be copied to metadata
RESERVED_KEYS = TOOL_CALL_KEYS | ID_KEYS


def parse_traces(data: Union[str, Path, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """
    Parse agent tracing data from various input formats.

    Args:
        data: Can be one of:
            - A file path (str or Path) to a JSON file
            - A JSON string
            - A list of trace dictionaries

    Returns:
        A list of trace dictionaries, each containing tool call information.

    Raises:
        ValueError: If the input format is not supported or invalid.
        FileNotFoundError: If the specified file does not exist.
    """
    if isinstance(data, (str, Path)):
        path = Path(data)
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                traces = json.load(f)
        else:
            # Try parsing as JSON string
            try:
                traces = json.loads(str(data))
            except json.JSONDecodeError as e:
                msg = f"Invalid JSON string or file not found: {data}"
                raise ValueError(msg) from e
    elif isinstance(data, list):
        traces = data
    else:
        raise ValueError(f"Unsupported input type: {type(data)}")

    return _normalize_traces(traces)


def _normalize_traces(traces: Any) -> List[Dict[str, Any]]:
    """
    Normalize trace data into a consistent format.

    Args:
        traces: Raw trace data (can be a list or single trace dict).

    Returns:
        A list of normalized trace dictionaries.
    """
    if isinstance(traces, dict):
        traces = [traces]

    if not isinstance(traces, list):
        raise ValueError("Traces must be a list or dictionary")

    normalized = []
    for trace in traces:
        normalized.append(_normalize_single_trace(trace))

    return normalized


def _normalize_single_trace(trace: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize a single trace entry.

    Args:
        trace: A single trace dictionary.

    Returns:
        Normalized trace dictionary with consistent structure.
    """
    normalized = {
        "id": trace.get("id", trace.get("trace_id", str(id(trace)))),
        "tool_calls": [],
        "metadata": {}
    }

    # Extract tool calls from various possible formats
    tool_calls = _extract_tool_calls(trace)
    normalized["tool_calls"] = tool_calls

    # Preserve any additional metadata
    for key, value in trace.items():
        if key not in RESERVED_KEYS:
            normalized["metadata"][key] = value

    return normalized


def _extract_tool_calls(trace: Dict[str, Any]) -> List[str]:
    """
    Extract tool call names from a trace dictionary.

    Supports multiple common formats for tool call data.

    Args:
        trace: A trace dictionary.

    Returns:
        A list of tool names that were called.
    """
    tool_calls = []

    # Check common key names for tool calls
    for key in ["tool_calls", "toolCalls", "calls", "steps"]:
        if key in trace:
            calls = trace[key]
            if isinstance(calls, list):
                for call in calls:
                    tool_name = _extract_tool_name(call)
                    if tool_name:
                        tool_calls.append(tool_name)

    return tool_calls


def _extract_tool_name(call: Any) -> str:
    """
    Extract the tool name from a tool call entry.

    Args:
        call: A tool call entry (can be string, dict, etc.).

    Returns:
        The tool name as a string, or empty string if not found.
    """
    if isinstance(call, str):
        return call
    elif isinstance(call, dict):
        # Check common key names for tool name
        for key in ["name", "tool", "tool_name", "toolName", "function", "type"]:
            if key in call:
                name = call[key]
                if isinstance(name, str):
                    return name
                elif isinstance(name, dict) and "name" in name:
                    return name["name"]
    return ""


def extract_tool_sets(traces: List[Dict[str, Any]]) -> List[Set[str]]:
    """
    Extract sets of tools used in each trace.

    Args:
        traces: A list of normalized trace dictionaries.

    Returns:
        A list of sets, where each set contains the unique tools used in that trace.
    """
    return [set(trace["tool_calls"]) for trace in traces]


def compute_upset_data(traces: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute data structure needed for UpSet plot visualization.

    Args:
        traces: A list of normalized trace dictionaries.

    Returns:
        A dictionary containing:
        - sets: List of all unique tools
        - intersections: List of intersection data for the UpSet plot
    """
    tool_sets = extract_tool_sets(traces)

    # Get all unique tools
    all_tools = set()
    for ts in tool_sets:
        all_tools.update(ts)
    all_tools = sorted(list(all_tools))

    # Count occurrences of each unique combination
    combination_counts: Dict[tuple, int] = {}
    for ts in tool_sets:
        key = tuple(sorted(ts))
        combination_counts[key] = combination_counts.get(key, 0) + 1

    # Build intersection data
    intersections = []
    for combo, count in sorted(combination_counts.items(), key=lambda x: (-x[1], x[0])):
        intersections.append({
            "sets": list(combo),
            "size": count
        })

    return {
        "sets": all_tools,
        "intersections": intersections,
        "total_traces": len(traces)
    }
