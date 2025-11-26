"""
UpSet Plot visualization module using D3.js.
"""

import json
import uuid
from pathlib import Path
from typing import Any, Dict


class UpSetPlot:
    """
    Interactive UpSet Plot visualization using D3.js.

    UpSet plots are an effective technique for visualizing the intersection
    of multiple sets. This class generates an interactive D3.js-based
    visualization that can be displayed in Jupyter Notebooks or saved as HTML.
    """

    def __init__(
        self,
        data: Dict[str, Any],
        width: int = 800,
        height: int = 500,
        bar_color: str = "#4a90d9",
        highlight_color: str = "#f5a623"
    ):
        """
        Initialize an UpSet Plot.

        Args:
            data: Dictionary containing 'sets' and 'intersections' keys
                  as computed by compute_upset_data()
            width: Width of the visualization in pixels
            height: Height of the visualization in pixels
            bar_color: Color for the intersection size bars
            highlight_color: Color for highlighting on hover
        """
        self.data = data
        self.width = width
        self.height = height
        self.bar_color = bar_color
        self.highlight_color = highlight_color
        self._plot_id = f"upset-plot-{uuid.uuid4().hex[:8]}"

    def to_html(self, include_d3: bool = True) -> str:
        """
        Generate HTML string for the UpSet plot.

        Args:
            include_d3: Whether to include D3.js library in the output

        Returns:
            Complete HTML string for rendering the visualization.
        """
        d3_script = ""
        if include_d3:
            d3_script = '<script src="https://d3js.org/d3.v7.min.js"></script>'

        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>AgentProfiler - UpSet Plot</title>
    {d3_script}
    <style>
        {self._get_css()}
    </style>
</head>
<body>
    <div id="{self._plot_id}" class="upset-container"></div>
    <script>
        {self._get_javascript()}
    </script>
</body>
</html>
"""

    def save(self, filepath: str) -> None:
        """
        Save the visualization to an HTML file.

        Args:
            filepath: Path to save the HTML file.
        """
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(self.to_html())

    def _repr_html_(self) -> str:
        """
        IPython/Jupyter HTML representation.

        Returns:
            HTML string for inline Jupyter rendering.
        """
        return self._get_jupyter_html()

    def _get_jupyter_html(self) -> str:
        """
        Generate HTML specifically for Jupyter Notebook display.

        Returns:
            HTML string optimized for Jupyter inline display.
        """
        return f"""
<div id="{self._plot_id}" class="upset-container"></div>
<style>
    {self._get_css()}
</style>
<script>
    (function() {{
        // Check if D3 is available, if not load it
        if (typeof d3 === 'undefined') {{
            var script = document.createElement('script');
            script.src = 'https://d3js.org/d3.v7.min.js';
            script.onload = function() {{
                {self._get_javascript()}
            }};
            document.head.appendChild(script);
        }} else {{
            {self._get_javascript()}
        }}
    }})();
</script>
"""

    def _get_css(self) -> str:
        """Generate CSS styles for the visualization."""
        return f"""
        #{self._plot_id} {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            margin: 20px;
        }}
        #{self._plot_id} .upset-title {{
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #333;
        }}
        #{self._plot_id} .upset-subtitle {{
            font-size: 12px;
            color: #666;
            margin-bottom: 20px;
        }}
        #{self._plot_id} .bar {{
            fill: {self.bar_color};
            transition: fill 0.2s ease;
        }}
        #{self._plot_id} .bar:hover {{
            fill: {self.highlight_color};
        }}
        #{self._plot_id} .matrix-dot {{
            transition: fill 0.2s ease;
        }}
        #{self._plot_id} .matrix-dot.active {{
            fill: #333;
        }}
        #{self._plot_id} .matrix-dot.inactive {{
            fill: #e0e0e0;
        }}
        #{self._plot_id} .matrix-dot:hover {{
            stroke: {self.highlight_color};
            stroke-width: 2;
        }}
        #{self._plot_id} .set-label {{
            font-size: 12px;
            fill: #333;
        }}
        #{self._plot_id} .axis-label {{
            font-size: 11px;
            fill: #666;
        }}
        #{self._plot_id} .bar-label {{
            font-size: 10px;
            fill: #333;
        }}
        #{self._plot_id} .connection-line {{
            stroke: #333;
            stroke-width: 2;
        }}
        #{self._plot_id} .tooltip {{
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
        }}
        #{self._plot_id} .set-size-bar {{
            fill: #999;
        }}
        #{self._plot_id} .grid-line {{
            stroke: #eee;
            stroke-width: 1;
        }}
"""

    def _get_javascript(self) -> str:
        """Generate JavaScript code for D3.js visualization."""
        data_json = json.dumps(self.data)

        return f"""
        (function() {{
            const data = {data_json};
            const containerId = "{self._plot_id}";
            const width = {self.width};
            const height = {self.height};

            const container = d3.select("#" + containerId);
            container.html("");

            // Add title
            container.append("div")
                .attr("class", "upset-title")
                .text("Agent Tool Usage - UpSet Plot");

            container.append("div")
                .attr("class", "upset-subtitle")
                .text("Total traces: " + data.total_traces + " | Unique tools: " + data.sets.length);

            // Dimensions
            const margin = {{top: 60, right: 40, bottom: 20, left: 150}};
            const matrixWidth = data.intersections.length * 25;
            const barHeight = 200;
            const matrixHeight = data.sets.length * 25;
            const setSizeWidth = 100;

            const svgWidth = margin.left + setSizeWidth + matrixWidth + margin.right;
            const svgHeight = margin.top + barHeight + matrixHeight + margin.bottom;

            const svg = container.append("svg")
                .attr("width", svgWidth)
                .attr("height", svgHeight);

            // Tooltip
            const tooltip = container.append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            // Scales
            const xScale = d3.scaleBand()
                .domain(d3.range(data.intersections.length))
                .range([margin.left + setSizeWidth, margin.left + setSizeWidth + matrixWidth])
                .padding(0.2);

            const yBarScale = d3.scaleLinear()
                .domain([0, d3.max(data.intersections, d => d.size)])
                .range([margin.top + barHeight, margin.top]);

            const yMatrixScale = d3.scaleBand()
                .domain(data.sets)
                .range([margin.top + barHeight, margin.top + barHeight + matrixHeight])
                .padding(0.2);

            // Compute set sizes
            const setSizes = {{}};
            data.sets.forEach(s => setSizes[s] = 0);
            data.intersections.forEach(inter => {{
                inter.sets.forEach(s => {{
                    setSizes[s] += inter.size;
                }});
            }});

            const setSizeScale = d3.scaleLinear()
                .domain([0, d3.max(Object.values(setSizes))])
                .range([0, setSizeWidth - 10]);

            // Draw intersection size bars
            svg.selectAll(".bar")
                .data(data.intersections)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", (d, i) => xScale(i))
                .attr("y", d => yBarScale(d.size))
                .attr("width", xScale.bandwidth())
                .attr("height", d => margin.top + barHeight - yBarScale(d.size))
                .on("mouseover", function(event, d) {{
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    tooltip.html("Tools: " + d.sets.join(", ") + "<br/>Count: " + d.size)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                }})
                .on("mouseout", function() {{
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                }});

            // Bar labels
            svg.selectAll(".bar-label")
                .data(data.intersections)
                .enter()
                .append("text")
                .attr("class", "bar-label")
                .attr("x", (d, i) => xScale(i) + xScale.bandwidth() / 2)
                .attr("y", d => yBarScale(d.size) - 5)
                .attr("text-anchor", "middle")
                .text(d => d.size);

            // Y-axis for bars
            svg.append("g")
                .attr("class", "axis-label")
                .attr("transform", "translate(" + (margin.left + setSizeWidth - 5) + ", 0)")
                .call(d3.axisLeft(yBarScale).ticks(5));

            // Set labels
            svg.selectAll(".set-label")
                .data(data.sets)
                .enter()
                .append("text")
                .attr("class", "set-label")
                .attr("x", margin.left + setSizeWidth - 10)
                .attr("y", d => yMatrixScale(d) + yMatrixScale.bandwidth() / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "end")
                .text(d => d);

            // Set size bars
            svg.selectAll(".set-size-bar")
                .data(data.sets)
                .enter()
                .append("rect")
                .attr("class", "set-size-bar")
                .attr("x", d => margin.left + setSizeWidth - setSizeScale(setSizes[d]) - 10)
                .attr("y", d => yMatrixScale(d) + yMatrixScale.bandwidth() * 0.2)
                .attr("width", d => setSizeScale(setSizes[d]))
                .attr("height", yMatrixScale.bandwidth() * 0.6)
                .on("mouseover", function(event, d) {{
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    tooltip.html("Tool: " + d + "<br/>Used in: " + setSizes[d] + " traces")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                }})
                .on("mouseout", function() {{
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                }});

            // Matrix dots
            data.intersections.forEach((inter, i) => {{
                const activeSets = new Set(inter.sets);

                // Draw connection lines
                const activeIndices = data.sets
                    .map((s, idx) => activeSets.has(s) ? idx : -1)
                    .filter(idx => idx >= 0);

                if (activeIndices.length > 1) {{
                    const minIdx = Math.min(...activeIndices);
                    const maxIdx = Math.max(...activeIndices);
                    svg.append("line")
                        .attr("class", "connection-line")
                        .attr("x1", xScale(i) + xScale.bandwidth() / 2)
                        .attr("y1", yMatrixScale(data.sets[minIdx]) + yMatrixScale.bandwidth() / 2)
                        .attr("x2", xScale(i) + xScale.bandwidth() / 2)
                        .attr("y2", yMatrixScale(data.sets[maxIdx]) + yMatrixScale.bandwidth() / 2);
                }}

                // Draw dots
                data.sets.forEach((set, j) => {{
                    const isActive = activeSets.has(set);
                    svg.append("circle")
                        .attr("class", "matrix-dot " + (isActive ? "active" : "inactive"))
                        .attr("cx", xScale(i) + xScale.bandwidth() / 2)
                        .attr("cy", yMatrixScale(set) + yMatrixScale.bandwidth() / 2)
                        .attr("r", 6);
                }});
            }});

            // Axis labels
            svg.append("text")
                .attr("class", "axis-label")
                .attr("x", margin.left + setSizeWidth + matrixWidth / 2)
                .attr("y", margin.top - 30)
                .attr("text-anchor", "middle")
                .text("Intersection Size");

            svg.append("text")
                .attr("class", "axis-label")
                .attr("x", margin.left)
                .attr("y", margin.top + barHeight + matrixHeight / 2)
                .attr("text-anchor", "middle")
                .attr("transform", "rotate(-90, " + margin.left + ", " + (margin.top + barHeight + matrixHeight / 2) + ")")
                .text("Set Size");
        }})();
"""

    def show(self) -> None:
        """
        Display the visualization in a Jupyter Notebook.

        This method attempts to display the visualization using IPython's
        display capabilities. If running outside of a Jupyter environment,
        it will print a message suggesting to use save() instead.
        """
        try:
            from IPython.display import HTML, display
            display(HTML(self._get_jupyter_html()))
        except ImportError:
            print("IPython not available. Use save() to export as HTML file.")
