"use client";

import * as d3 from "d3";


function assignIdsToTracings(tracings) {
    return tracings.map((tracing, index) => {
        return {
            ...tracing,
            id: index,
        };
    });
}

function ProfileUpperBarChart(tools, tracingToolCalls) {
    const data = tools.map((tool) => {
        return {
            toolName: tool,
            shapleyValue: (Math.floor(Math.random() * 200) - 100) / 100,
        };
    });
    return data;
}

function ProfileLowerBarChart(tools, tracingToolCalls) {
    const data = [];
    tracingToolCalls.forEach((entry, tracingId) => {
        data.push({
            id: tracingId,
            score: entry.score,
        });
    });
    return data;
}

function getTools(tracings) {
    const tools = new Set();
    const tracingToolCalls = new Map();

    tracings.forEach((tracing) => {
        const toolCalls = new Map();
        const outputs = tracing.outputs.messages;

        outputs.forEach((output) => {
            if ("tool_calls" in output) {
                output.tool_calls.forEach((toolCall) => {
                    const toolCallId = toolCall.id;
                    const toolCallInfo = {
                        id: toolCallId,
                        name: toolCall.name,
                        type: toolCall.type,
                        args: toolCall.args,
                    };
                    toolCalls.set(toolCallId, toolCallInfo);
                    tools.add(toolCallInfo.name);
                });
            } else if ("tool_call_id" in output) {
                const toolCallId = output.tool_call_id;
                const toolCallInfo = toolCalls.get(toolCallId);
                if (toolCallInfo) {
                    // Add response data to tool call info
                    toolCallInfo.status = output.status;
                    toolCallInfo.content = output.content;
                }
            } else {
                console.log("Unknown output type:", output);
            }
        });

        // After processing all outputs for this tracing, store its tool calls and score
        tracingToolCalls.set(tracing.id, {
            toolCalls,
            score: tracing.score,
        });
    });

    return { tools: Array.from(tools), tracingToolCalls };
}

/**
 * Creates an automatic glyph assignment system for tool groups.
 * Extensible: automatically assigns glyphs to any tool groups without predefined mappings.
 */
function createGlyphSystem(toolSets = {}) {
    // Available glyph types (D3 symbol types + custom)
    const availableGlyphs = [
        "circle",
        "cross",
        "diamond",
        "square",
        "triangle",
        "star",
        "wye",
        "plus",
        "times",
    ];

    // Build tool-to-group mapping
    const toolToGroup = new Map();
    const groupNames = Object.keys(toolSets).sort(); // Sort for consistent assignment

    groupNames.forEach((groupName) => {
        const tools = toolSets[groupName] || [];
        tools.forEach((toolName) => {
            toolToGroup.set(toolName, groupName);
        });
    });

    // Automatically assign glyphs to groups (cycling through available glyphs)
    const groupToGlyph = new Map();
    groupNames.forEach((groupName, index) => {
        const glyph = availableGlyphs[index % availableGlyphs.length];
        groupToGlyph.set(groupName, glyph);
    });

    return {
        getGlyph: (toolName) => {
            const group = toolToGroup.get(toolName);
            return group ? groupToGlyph.get(group) || "circle" : "circle";
        },
        getGroup: (toolName) => toolToGroup.get(toolName) || "unknown",
        getAllGroups: () => Array.from(groupToGlyph.keys()),
        getGroupGlyph: (groupName) => groupToGlyph.get(groupName) || "circle",
    };
}

/**
 * Renders a glyph element based on type at the specified position.
 */
function renderGlyph(container, glyphType, x, y, fill = "#111827", size = 5) {
    const symbolSize = size * 8;

    switch (glyphType) {
        case "circle":
            return container
                .append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", size)
                .attr("fill", fill)
                .style("cursor", "pointer");

        case "cross":
            return container
                .append("path")
                .attr("d", d3.symbol().type(d3.symbolCross).size(symbolSize))
                .attr("transform", `translate(${x},${y})`)
                .attr("fill", fill)
                .style("cursor", "pointer");

        case "diamond":
            return container
                .append("path")
                .attr("d", d3.symbol().type(d3.symbolDiamond).size(symbolSize))
                .attr("transform", `translate(${x},${y})`)
                .attr("fill", fill)
                .style("cursor", "pointer");

        case "square":
            return container
                .append("rect")
                .attr("x", x - size)
                .attr("y", y - size)
                .attr("width", size * 2)
                .attr("height", size * 2)
                .attr("fill", fill)
                .style("cursor", "pointer");

        case "triangle":
            return container
                .append("path")
                .attr("d", d3.symbol().type(d3.symbolTriangle).size(symbolSize))
                .attr("transform", `translate(${x},${y})`)
                .attr("fill", fill)
                .style("cursor", "pointer");

        case "star":
            return container
                .append("path")
                .attr("d", d3.symbol().type(d3.symbolStar).size(symbolSize))
                .attr("transform", `translate(${x},${y})`)
                .attr("fill", fill)
                .style("cursor", "pointer");

        case "wye":
            return container
                .append("path")
                .attr("d", d3.symbol().type(d3.symbolWye).size(symbolSize))
                .attr("transform", `translate(${x},${y})`)
                .attr("fill", fill)
                .style("cursor", "pointer");

        case "plus":
            const plusGroup = container
                .append("g")
                .attr("transform", `translate(${x},${y})`)
                .style("cursor", "pointer");
            plusGroup
                .append("rect")
                .attr("x", -size)
                .attr("y", -1)
                .attr("width", size * 2)
                .attr("height", 2)
                .attr("fill", fill)
                .style("pointer-events", "none");
            plusGroup
                .append("rect")
                .attr("x", -1)
                .attr("y", -size)
                .attr("width", 2)
                .attr("height", size * 2)
                .attr("fill", fill)
                .style("pointer-events", "none");
            return plusGroup;

        case "times":
            const timesGroup = container
                .append("g")
                .attr("transform", `translate(${x},${y}) rotate(45)`)
                .style("cursor", "pointer");
            timesGroup
                .append("rect")
                .attr("x", -size)
                .attr("y", -1)
                .attr("width", size * 2)
                .attr("height", 2)
                .attr("fill", fill)
                .style("pointer-events", "none");
            timesGroup
                .append("rect")
                .attr("x", -1)
                .attr("y", -size)
                .attr("width", 2)
                .attr("height", size * 2)
                .attr("fill", fill)
                .style("pointer-events", "none");
            return timesGroup;

        default:
            return container
                .append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", size)
                .attr("fill", fill)
                .style("cursor", "pointer");
    }
}

function createTooltip(containerSelection) {
    const tooltip = containerSelection
        .append("div")
        .attr("class", "upset-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "#0f172a")
        .style("color", "#f8fafc")
        .style("border-radius", "6px")
        .style("padding", "8px 10px")
        .style("font-size", "11px")
        .style("box-shadow", "0 8px 20px rgba(15,23,42,0.25)")
        .style("opacity", 0)
        .style("transition", "opacity 120ms ease");

    const showTooltip = (event, html) => {
        const [xPos, yPos] = d3.pointer(event, containerSelection.node());
        tooltip
            .style("opacity", 1)
            .html(html)
            .style("left", `${xPos + 14}px`)
            .style("top", `${yPos + 14}px`);
    };

    const hideTooltip = () => {
        tooltip.style("opacity", 0);
    };

    return { tooltip, showTooltip, hideTooltip };
}

function renderToolImportanceBars({
    group,
    data,
    xScale,
    yScale,
    matrixWidth,
    glyphSystem,
}) {
    const barsGroup = group.append("g").attr("class", "tool-importance");

    // Calculate zero line position
    const zeroY = yScale(0);

    // Zero line (baseline)
    barsGroup
        .append("line")
        .attr("class", "zero-line")
        .attr("x1", 0)
        .attr("x2", matrixWidth)
        .attr("y1", zeroY)
        .attr("y2", zeroY)
        .attr("stroke", "#bababa")
        .attr("stroke-width", 1);

    // Bars: extend upward for positive values, downward for negative values
    const bars = barsGroup
        .selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", (d) => xScale(d.toolName))
        .attr("y", (d) => {
            // For positive values, bar starts at zero line and extends upward
            // For negative values, bar starts below zero line and extends downward
            return d.shapleyValue >= 0 ? yScale(d.shapleyValue) : zeroY;
        })
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => {
            // Height is the absolute difference from zero
            return Math.abs(yScale(d.shapleyValue) - zeroY);
        })
        .attr("fill", "#111827");

    // Y-axis on the left showing Shapley values
    const yAxis = d3.axisLeft(yScale).ticks(5);
    const yAxisGroup = barsGroup
        .append("g")
        .attr("class", "y-axis")
        .call(yAxis);
    yAxisGroup.select(".domain").attr("stroke", "#bababa");
    yAxisGroup.selectAll("line").attr("stroke", "#bababa");
    yAxisGroup.selectAll("text").attr("fill", "#4b5563").style("font-size", "9px");

    // Tool names with glyphs at the top (above the bars)
    const toolNameGroup = barsGroup
        .append("g")
        .attr("class", "tool-names-top");

    const toolLabels = toolNameGroup
        .selectAll("g.tool-label")
        .data(data)
        .join("g")
        .attr("class", "tool-label")
        .attr(
            "transform",
            (d) =>
                `translate(${xScale(d.toolName) + xScale.bandwidth() / 2},0)`
        );

    // Add glyph for each tool (positioned at the base)
    toolLabels.each(function (d) {
        const labelGroup = d3.select(this);
        const glyphType = glyphSystem.getGlyph(d.toolName);
        const glyphSize = 4;
        // Position glyph at base position
        renderGlyph(labelGroup, glyphType, 0, -10, "#111827", glyphSize);
    });

    // Add tool name text (rotated, starting from glyph and extending upward-right)
    const toolTexts = toolLabels
        .append("text")
        .attr("x", 6)
        .attr("y", -10)
        .attr("text-anchor", "start")
        .attr("fill", "#4b5563")
        .style("font-size", "10px")
        .attr("transform", (d, i) => {
            const x = 0;
            const y = -12;
            return `rotate(-60, ${x}, ${y})`;
        })
        .text((d) => d.toolName);

    // Highlight functions for column highlighting
    const setColumnHighlight = (toolName) => {
        if (!toolName) {
            bars.attr("fill", "#111827");
            toolTexts.attr("fill", "#4b5563");
            toolLabels.selectAll("path, circle, rect").attr("fill", "#111827");
            return;
        }

        bars.attr("fill", (d) =>
            d.toolName === toolName ? "#0ea5e9" : "#111827"
        );
        toolTexts.attr("fill", (d) =>
            d.toolName === toolName ? "#0ea5e9" : "#4b5563"
        );
        toolLabels.each(function (d) {
            const labelGroup = d3.select(this);
            const isHighlighted = d.toolName === toolName;
            labelGroup
                .selectAll("path, circle, rect")
                .attr("fill", isHighlighted ? "#0ea5e9" : "#111827");
        });
    };

    const clearColumnHighlight = () => {
        bars.attr("fill", "#111827");
        toolTexts.attr("fill", "#4b5563");
        toolLabels.selectAll("path, circle, rect").attr("fill", "#111827");
    };

    return { setColumnHighlight, clearColumnHighlight };
}

function renderCoverageGrid({
    svg,
    group,
    tracings,
    tools,
    matrixWidth,
    matrixTop,
    matrixHeight,
    scoreWidth,
    xScale,
    traceScale,
    tracingToolCalls,
    glyphSystem,
    barHighlightControls,
    showTooltip,
    hideTooltip,
    formatArgs,
    onTracingSelect,
    data,
}) {
    const gridStroke = "rgba(15,23,42,0.2)";

    const highlightRow = group
        .append("rect")
        .attr("class", "matrix-highlight-row")
        .attr("x", 0)
        .attr("y", matrixTop)
        .attr("width", matrixWidth + scoreWidth)
        .attr("height", traceScale.bandwidth())
        .attr("rx", 4)
        .attr("fill", "rgba(14,165,233,0.12)")
        .style("opacity", 0)
        .style("pointer-events", "none");

    const highlightCol = group
        .append("rect")
        .attr("class", "matrix-highlight-col")
        .attr("x", 0)
        .attr("y", matrixTop)
        .attr("width", xScale.bandwidth())
        .attr("height", matrixHeight)
        .attr("fill", "rgba(15,23,42,0.06)")
        .style("opacity", 0)
        .style("pointer-events", "none");

    // Horizontal lines
    group
        .append("g")
        .attr("class", "matrix-rows")
        .selectAll("line")
        .data(tracings)
        .join("line")
        .attr("x1", 0)
        .attr("x2", matrixWidth)
        .attr("y1", (t) => traceScale(t.id) + traceScale.bandwidth() / 2)
        .attr("y2", (t) => traceScale(t.id) + traceScale.bandwidth() / 2)
        .attr("stroke", gridStroke)
        .attr("stroke-width", 1);

    // Vertical lines
    group
        .append("g")
        .attr("class", "matrix-cols")
        .selectAll("line")
        .data(tools)
        .join("line")
        .attr("y1", matrixTop)
        .attr("y2", matrixTop + matrixHeight)
        .attr("x1", (tool) => xScale(tool) + xScale.bandwidth() / 2)
        .attr("x2", (tool) => xScale(tool) + xScale.bandwidth() / 2)
        .attr("stroke", gridStroke)
        .attr("stroke-width", 1);

    const matrixGroup = group.append("g").attr("class", "matrix-dots");

    matrixGroup
        .selectAll("g.intersection-col")
        .data(tools)
        .join("g")
        .attr("class", "intersection-col")
        .attr("transform", (tool) => `translate(${xScale(tool) + xScale.bandwidth() / 2},0)`)
        .each(function (tool) {
            const column = d3.select(this);

            tracings.forEach((tracing) => {
                const entry = tracingToolCalls.get(tracing.id);
                const toolCalls = entry?.toolCalls || new Map();
                const callsForTool = Array.from(toolCalls.values()).filter(
                    (toolCall) => toolCall.name === tool
                );
                const yCenter =
                    traceScale(tracing.id) + traceScale.bandwidth() / 2;

                const active = callsForTool.length > 0;

                if (active) {
                    const glyphType = glyphSystem.getGlyph(tool);
                    const toolGroup = glyphSystem.getGroup(tool);
                    const glyphElement = renderGlyph(
                        column,
                        glyphType,
                        0,
                        yCenter,
                        "#111827",
                        5
                    );

                    const score = entry?.score ?? tracing.score;
                    const tooltipHtml = [
                        `<strong>Tool:</strong> ${tool}`,
                        `<strong>Group:</strong> ${toolGroup}`,
                        `<strong>Run:</strong> #${tracing.id}`,
                        score !== undefined
                            ? `<strong>Score:</strong> ${score}`
                            : null,
                        `<strong>Parameters:</strong>`,
                        `<pre style="margin:4px 0 0;font-family:Menlo,monospace;font-size:10px;color:#e2e8f0;">${formatArgs(
                            callsForTool[0]?.args
                        )}</pre>`,
                    ]
                        .filter(Boolean)
                        .join("<br/>");

                    glyphElement
                        .on("mouseenter", (event) => {
                            setRowHighlight(tracing.id);
                            setColumnHighlight(tool);
                            showTooltip(event, tooltipHtml);
                        })
                        .on("mousemove", (event) => {
                            showTooltip(event, tooltipHtml);
                        })
                        .on("mouseleave", () => {
                            hideTooltip();
                        });
                }
            });
        });

    let rowHighlightListener = () => { };

    const setRowHighlight = (tracingId) => {
        const yPos = traceScale(tracingId);
        if (yPos === undefined) {
            highlightRow.style("opacity", 0);
            rowHighlightListener(null);
            return;
        }
        highlightRow
            .attr("y", yPos)
            .attr("height", traceScale.bandwidth())
            .style("opacity", 1);
        rowHighlightListener(tracingId);
    };

    const clearRowHighlight = () => {
        highlightRow.style("opacity", 0);
        rowHighlightListener(null);
    };

    const setColumnHighlight = (tool) => {
        const xPos = xScale(tool);
        if (xPos === undefined) {
            highlightCol.style("opacity", 0);
            barHighlightControls?.clearColumnHighlight();
            return;
        }
        highlightCol
            .attr("x", xPos)
            .attr("width", xScale.bandwidth())
            .style("opacity", 1);
        barHighlightControls?.setColumnHighlight(tool);
    };

    const clearColumnHighlight = () => {
        highlightCol.style("opacity", 0);
        barHighlightControls?.clearColumnHighlight();
    };

    const clearAllHighlights = () => {
        clearRowHighlight();
        clearColumnHighlight();
    };

    const registerExternalRowHighlight = (listener) => {
        rowHighlightListener = listener || (() => { });
    };

    const findTracingAtY = (yPos) =>
        tracings.find((tracing) => {
            const rowStart = traceScale(tracing.id);
            if (rowStart === undefined) return false;
            return (
                yPos >= rowStart && yPos <= rowStart + traceScale.bandwidth()
            );
        });

    const findToolAtX = (xPos) =>
        tools.find((toolName) => {
            const colStart = xScale(toolName);
            if (colStart === undefined) return false;
            return (
                xPos >= colStart && xPos <= colStart + xScale.bandwidth()
            );
        });

    const handlePointerMove = (event) => {
        const [mx, my] = d3.pointer(event, group.node());
        const withinBand =
            mx >= 0 &&
            mx <= matrixWidth + scoreWidth &&
            my >= matrixTop &&
            my <= matrixTop + matrixHeight;

        if (!withinBand) {
            clearAllHighlights();
            return;
        }

        const hoveredTracing = findTracingAtY(my);
        if (hoveredTracing) {
            setRowHighlight(hoveredTracing.id);
        } else {
            clearRowHighlight();
        }

        if (mx <= matrixWidth) {
            const hoveredTool = findToolAtX(mx);
            if (hoveredTool) {
                setColumnHighlight(hoveredTool);
            } else {
                clearColumnHighlight();
            }
        } else {
            clearColumnHighlight();
        }
    };

    const handleClick = (event) => {
        const [mx, my] = d3.pointer(event, group.node());
        const withinBand =
            mx >= 0 &&
            mx <= matrixWidth + scoreWidth &&
            my >= matrixTop &&
            my <= matrixTop + matrixHeight;

        if (withinBand) {
            const clickedTracing = findTracingAtY(my);
            if (clickedTracing && onTracingSelect) {
                // Find the original tracing data from the input data array
                const originalTracing = data[clickedTracing.id];
                if (originalTracing) {
                    onTracingSelect(originalTracing);
                }
            }
        }
    };

    svg.on("mousemove", handlePointerMove)
        .on("mouseleave", () => {
            hideTooltip();
            clearAllHighlights();
        })
        .on("click", handleClick);

    return {
        setRowHighlight,
        clearRowHighlight,
        setColumnHighlight,
        clearColumnHighlight,
        clearAllHighlights,
        registerExternalRowHighlight,
    };
}

function renderScoreRail({
    group,
    data,
    traceScale,
    scoreX,
    matrixTop,
    matrixWidth,
    scoreWidth,
    showTooltip,
    hideTooltip,
    formatScore,
    onRowFocus,
    onRowBlur,
}) {
    const scoreGroup = group
        .append("g")
        .attr("class", "score-rail")
        .attr("transform", `translate(${matrixWidth},0)`);

    const scoreAxis = d3.axisTop(scoreX).ticks(4).tickSize(-6);
    const scoreAxisGroup = scoreGroup
        .append("g")
        .attr("transform", `translate(0,${matrixTop - 12})`)
        .call(scoreAxis);
    scoreAxisGroup.select(".domain").remove();
    scoreAxisGroup.selectAll("line").attr("stroke", "#cbd5f5");
    scoreAxisGroup
        .selectAll("text")
        .attr("fill", "#4b5563")
        .style("font-size", "9px");

    scoreGroup
        .append("text")
        .attr("x", scoreWidth / 2)
        .attr("y", matrixTop - 24)
        .attr("fill", "#4b5563")
        .attr("font-size", 11)
        .attr("text-anchor", "middle")
        .text("Run Score");

    const scoreBarBaseFill = "#38bdf8";
    const scoreBarHighlightFill = "#0284c7";
    const scoreLabelBaseColor = "#475569";
    const scoreLabelHighlightColor = "#0f172a";

    const scoreBars = scoreGroup
        .selectAll("rect.score-bar")
        .data(data)
        .join("rect")
        .attr("class", "score-bar")
        .attr("x", 0)
        .attr("y", (d) => traceScale(d.id))
        .attr("height", traceScale.bandwidth())
        .attr("width", (d) => scoreX(d.score ?? 0))
        .attr("fill", scoreBarBaseFill)
        .attr("rx", 3);

    const scoreLabels = scoreGroup
        .selectAll("text.score-value")
        .data(data)
        .join("text")
        .attr("class", "score-value")
        .attr("x", (d) => scoreX(d.score ?? 0) + 6)
        .attr("y", (d) => traceScale(d.id) + traceScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", scoreLabelBaseColor)
        .style("font-size", "10px")
        .text((d) => formatScore(d.score));

    const setRowHighlight = (tracingId) => {
        scoreBars.attr("fill", (d) =>
            d.id === tracingId ? scoreBarHighlightFill : scoreBarBaseFill
        );

        scoreLabels
            .attr("fill", (d) =>
                d.id === tracingId ? scoreLabelHighlightColor : scoreLabelBaseColor
            )
            .attr("font-weight", (d) => (d.id === tracingId ? 600 : 400));
    };

    const scoreTooltipContent = (d) =>
        [`<strong>Run:</strong> #${d.id}`, `<strong>Score:</strong> ${formatScore(d.score)}`].join("<br/>");

    scoreBars
        .on("mouseenter", (event, d) => {
            onRowFocus?.(d.id);
            showTooltip(event, scoreTooltipContent(d));
        })
        .on("mousemove", (event, d) => {
            showTooltip(event, scoreTooltipContent(d));
        })
        .on("mouseleave", () => {
            hideTooltip();
            onRowBlur?.();
        });

    return { setRowHighlight };
}


export function renderUpsetPlot(container, data, toolSets = {}, options = {}) {
    if (!container) return;

    const { onTracingSelect } = options;

    // Parse tracings
    const tracings = assignIdsToTracings(data);

    // Get tools and tool calls from tracings
    const { tools, tracingToolCalls } = getTools(tracings);

    // Create automatic glyph system for tool groups
    const glyphSystem = createGlyphSystem(toolSets);

    console.log(tools, tracingToolCalls);

    // Get profile upper bar chart data
    const upperBarChartData = ProfileUpperBarChart(tools, tracingToolCalls);
    const lowerBarChartData = ProfileLowerBarChart(tools, tracingToolCalls);

    console.log(upperBarChartData, lowerBarChartData);

    const width = options.width ?? 640;
    const margin = {
        top: 80, // Increased to accommodate rotated tool labels at top
        right: 24,
        bottom: 40,
        left: 80,
        ...(options.margin || {}),
    };

    // Calculate dynamic height based on number of tracings
    const minRowHeight = 20; // Minimum height per tracing row
    const topBarHeightFixed = 200; // Fixed height for top bar chart
    const numTracings = tracings.length;
    const matrixHeightRequired = Math.max(
        numTracings * minRowHeight,
        100 // Minimum matrix height
    );
    const calculatedHeight =
        margin.top +
        topBarHeightFixed +
        matrixHeightRequired +
        margin.bottom;
    const height = options.height ?? calculatedHeight;

    const containerSelection = d3.select(container);

    // Clear existing content for idempotent renders
    containerSelection.selectAll("*").remove();
    containerSelection.style("position", "relative");

    const svg = containerSelection
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const { showTooltip, hideTooltip } = createTooltip(containerSelection);

    const formatArgs = (args) => {
        if (!args) return "None";
        try {
            return JSON.stringify(args, null, 2);
        } catch (err) {
            return String(args);
        }
    };

    const formatScore = (value) => {
        if (value === null || value === undefined || Number.isNaN(value)) {
            return "—";
        }
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric.toFixed(3) : "—";
    };

    if (!data || data.length === 0) {
        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#6b7280")
            .text("No data");
        return;
    }

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Use fixed top bar height, let matrix expand below
    const topBarHeight = topBarHeightFixed;
    const matrixTop = topBarHeight;
    const matrixHeight = innerHeight - topBarHeight;

    // Reserve right-hand space for score bars
    const matrixWidth = innerWidth * 0.75;
    const scoreWidth = innerWidth - matrixWidth;

    // X: tools (columns) over matrix area
    const x = d3
        .scaleBand()
        .domain(tools)
        .range([0, matrixWidth])
        .padding(0.3);

    // Y (top): bar height for tool shapley values (can be negative)
    const shapleyExtent = d3.extent(upperBarChartData, (d) => d.shapleyValue);
    const shapleyMin = shapleyExtent[0] ?? -1;
    const shapleyMax = shapleyExtent[1] ?? 1;
    // Ensure zero is included in domain for proper baseline
    const shapleyDomain = [
        Math.min(shapleyMin, 0),
        Math.max(shapleyMax, 0),
    ];
    const yBar = d3.scaleLinear().domain(shapleyDomain).nice().range([topBarHeight, 0]);

    const barHighlightControls = renderToolImportanceBars({
        group: g,
        data: upperBarChartData,
        xScale: x,
        yScale: yBar,
        matrixWidth,
        glyphSystem,
    });

    // Set grid / matrix under bars: rows are tracings (y-axis)
    const traceScale = d3
        .scaleBand()
        .domain(tracings.map((t) => t.id))
        .range([matrixTop, matrixTop + matrixHeight])
        .paddingInner(0.4);

    // Score scale for lower-right horizontal bars
    const maxScore = d3.max(lowerBarChartData, (d) => d.score) || 1;
    const scoreX = d3
        .scaleLinear()
        .domain([0, maxScore])
        .range([0, scoreWidth]);

    const matrixControls = renderCoverageGrid({
        svg,
        group: g,
        tracings,
        tools,
        matrixWidth,
        matrixTop,
        matrixHeight,
        scoreWidth,
        xScale: x,
        traceScale,
        tracingToolCalls,
        glyphSystem,
        barHighlightControls,
        showTooltip,
        hideTooltip,
        formatArgs,
        onTracingSelect,
        data,
    });

    // Set labels on the left
    g.append("g")
        .selectAll("text.set-label")
        .data(lowerBarChartData)
        .join("text")
        .attr("class", "set-label")
        .attr("x", -12)
        .attr("y", (d) => traceScale(d.id) + traceScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("fill", "#111827")
        .style("font-size", "10px")
        .text((d) => d.id);

    const scoreControls = renderScoreRail({
        group: g,
        data: lowerBarChartData,
        traceScale,
        scoreX,
        matrixTop,
        matrixWidth,
        scoreWidth,
        showTooltip,
        hideTooltip,
        formatScore,
        onRowFocus: (tracingId) => matrixControls.setRowHighlight(tracingId),
        onRowBlur: () => matrixControls.clearRowHighlight(),
    });

    matrixControls.registerExternalRowHighlight(scoreControls.setRowHighlight);
}

