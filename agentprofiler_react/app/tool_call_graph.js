"use client";

import * as d3 from "d3";

/**
 * Extracts tool call order from a tracing's outputs
 */
export function extractToolCallOrder(tracing) {
    const toolCalls = [];
    const toolCallMap = new Map();

    if (!tracing.outputs || !tracing.outputs.messages) {
        return { nodes: [], links: [] };
    }

    const outputs = tracing.outputs.messages;
    let callIndex = 0;

    outputs.forEach((output, outputIndex) => {
        if ("tool_calls" in output && output.tool_calls) {
            output.tool_calls.forEach((toolCall) => {
                const toolCallId = toolCall.id;
                const toolName = toolCall.name;

                if (!toolCallMap.has(toolCallId)) {
                    toolCallMap.set(toolCallId, {
                        id: toolCallId, // Use toolCallId as unique identifier
                        name: toolName,
                        index: callIndex++,
                        args: toolCall.args,
                        outputIndex,
                    });
                }
            });
        }
    });

    // Create nodes (one per tool call instance, not unique by name)
    const orderedCalls = Array.from(toolCallMap.values()).sort(
        (a, b) => a.index - b.index
    );
    const nodes = orderedCalls.map((call, idx) => ({
        id: call.id, // Unique ID per tool call instance
        name: call.name,
        index: idx,
        callIndex: call.index,
    }));

    // Create links (sequential tool call order)
    const links = [];

    for (let i = 0; i < orderedCalls.length - 1; i++) {
        const source = orderedCalls[i].id; // Use unique ID, not name
        const target = orderedCalls[i + 1].id;

        links.push({
            source,
            target,
            weight: 1,
        });
    }

    return { nodes, links };
}

/**
 * Extracts tool call flow with unique nodes and weighted edges
 */
export function extractToolCallFlow(tracing) {
    const toolCallMap = new Map();

    if (!tracing.outputs || !tracing.outputs.messages) {
        return { nodes: [], links: [] };
    }

    const outputs = tracing.outputs.messages;
    let callIndex = 0;
    const callSequence = [];

    outputs.forEach((output, outputIndex) => {
        if ("tool_calls" in output && output.tool_calls) {
            output.tool_calls.forEach((toolCall) => {
                const toolCallId = toolCall.id;
                const toolName = toolCall.name;

                if (!toolCallMap.has(toolCallId)) {
                    toolCallMap.set(toolCallId, {
                        id: toolCallId,
                        name: toolName,
                        index: callIndex++,
                        args: toolCall.args,
                        outputIndex,
                    });
                    callSequence.push(toolName);
                }
            });
        }
    });

    // Create unique nodes (one per tool name)
    const uniqueToolNames = Array.from(new Set(callSequence));
    const nodes = uniqueToolNames.map((name, idx) => ({
        id: name,
        name,
        index: idx,
        count: callSequence.filter((n) => n === name).length,
    }));

    // Create unique edges with weights (frequency of transitions)
    const edgeMap = new Map();
    for (let i = 0; i < callSequence.length - 1; i++) {
        const source = callSequence[i];
        const target = callSequence[i + 1];
        const edgeKey = `${source}->${target}`;

        if (edgeMap.has(edgeKey)) {
            edgeMap.get(edgeKey).weight += 1;
        } else {
            edgeMap.set(edgeKey, {
                source,
                target,
                weight: 1,
                sequence: [i, i + 1], // Track positions in sequence
            });
        }
    }

    const links = Array.from(edgeMap.values());

    return { nodes, links, callSequence };
}

/**
 * Renders a flow diagram with unique nodes and weighted edges showing tool call flow
 */
export function renderToolCallFlow(container, tracing, toolSets = {}) {
    if (!container || !tracing) {
        return;
    }

    const { nodes, links, callSequence } = extractToolCallFlow(tracing);

    if (nodes.length === 0) {
        d3.select(container)
            .selectAll("*")
            .remove()
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .attr("fill", "#6b7280")
            .text("No tool calls in this tracing");
        return;
    }

    // Clear existing content
    d3.select(container).selectAll("*").remove();

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 40 };

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create glyph system
    const glyphSystem = createGlyphSystem(toolSets);

    // Create force simulation for layout
    const maxWeight = d3.max(links, (d) => d.weight) || 1;
    const simulation = d3
        .forceSimulation(nodes)
        .force(
            "link",
            d3
                .forceLink(links)
                .id((d) => d.id)
                .distance((d) => 80 + (d.weight / maxWeight) * 40)
                .strength((d) => d.weight / maxWeight)
        )
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
        .force("collision", d3.forceCollide().radius(35));



    // Draw links with thickness based on weight
    const link = g
        .append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", "#64748b")
        .attr("stroke-width", (d) => 2 + (d.weight / maxWeight) * 6)
        .attr("stroke-opacity", (d) => 0.4 + (d.weight / maxWeight) * 0.4)
        .attr("marker-end", "url(#arrowhead-flow)");

    // Add edge labels showing weight
    const linkLabels = g
        .append("g")
        .attr("class", "link-labels")
        .selectAll("text")
        .data(links.filter((d) => d.weight > 1))
        .join("text")
        .attr("class", "link-label")
        .attr("font-size", "10px")
        .attr("fill", "#64748b")
        .attr("text-anchor", "middle")
        .text((d) => d.weight);

    // Draw nodes
    const node = g
        .append("g")
        .attr("class", "nodes")
        .selectAll("g.node")
        .data(nodes)
        .join("g")
        .attr("class", "node")
        .call(
            d3
                .drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended)
        );

    // Add circles/background for nodes
    node
        .append("circle")
        .attr("r", 25)
        .attr("fill", "#f8fafc")
        .attr("stroke", "#cbd5e1")
        .attr("stroke-width", 2);

    // Add count badge for nodes called multiple times
    node
        .filter((d) => d.count > 1)
        .append("circle")
        .attr("r", 10)
        .attr("cx", 18)
        .attr("cy", -18)
        .attr("fill", "#0ea5e9")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    node
        .filter((d) => d.count > 1)
        .append("text")
        .attr("x", 18)
        .attr("y", -18)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "#fff")
        .style("font-size", "9px")
        .style("font-weight", "bold")
        .text((d) => d.count);

    // Add glyphs to nodes
    node.each(function (d) {
        const nodeGroup = d3.select(this);
        const glyphType = glyphSystem.getGlyph(d.name);
        renderGlyph(nodeGroup, glyphType, 0, 0, "#111827", 10);
    });

    // Add labels
    node
        .append("text")
        .attr("dy", 40)
        .attr("text-anchor", "middle")
        .attr("fill", "#475569")
        .style("font-size", "11px")
        .style("font-weight", "500")
        .text((d) => d.name);

    // Update positions on tick
    simulation.on("tick", () => {
        link
            .attr("x1", (d) => d.source.x)
            .attr("y1", (d) => d.source.y)
            .attr("x2", (d) => d.target.x)
            .attr("y2", (d) => d.target.y);

        linkLabels
            .attr("x", (d) => (d.source.x + d.target.x) / 2)
            .attr("y", (d) => (d.source.y + d.target.y) / 2)
            .attr("dy", -5);

        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Add sequence visualization at the bottom
    const sequenceGroup = svg
        .append("g")
        .attr("class", "sequence")
        .attr("transform", `translate(${margin.left},${height - margin.bottom + 10})`);

    const sequenceWidth = innerWidth;
    const sequenceItemWidth = sequenceWidth / Math.max(callSequence.length, 1);

    const sequenceItems = sequenceGroup
        .selectAll("g.sequence-item")
        .data(callSequence)
        .join("g")
        .attr("class", "sequence-item")
        .attr("transform", (d, i) => `translate(${i * sequenceItemWidth + sequenceItemWidth / 2},0)`);

    sequenceItems
        .append("circle")
        .attr("r", 8)
        .attr("fill", (d) => {
            const nodeData = nodes.find((n) => n.name === d);
            const glyphType = glyphSystem.getGlyph(d);
            return "#cbd5e1";
        })
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1);

    sequenceItems.each(function (d) {
        const itemGroup = d3.select(this);
        const glyphType = glyphSystem.getGlyph(d);
        renderGlyph(itemGroup, glyphType, 0, 0, "#475569", 5);
    });

    sequenceItems
        .append("line")
        .attr("x1", sequenceItemWidth / 2)
        .attr("x2", sequenceItemWidth / 2)
        .attr("y1", 0)
        .attr("y2", -15)
        .attr("stroke", "#cbd5e1")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "2,2");

    sequenceItems
        .append("text")
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("fill", "#64748b")
        .style("font-size", "9px")
        .text((d, i) => i + 1);

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

/**
 * Renders a directed graph showing tool call order
 */
export function renderToolCallGraph(container, tracing, toolSets = {}) {
    if (!container || !tracing) {
        return;
    }

    const { nodes, links } = extractToolCallOrder(tracing);

    if (nodes.length === 0) {
        d3.select(container)
            .selectAll("*")
            .remove()
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .attr("fill", "#6b7280")
            .text("No tool calls in this tracing");
        return;
    }

    // Clear existing content
    d3.select(container).selectAll("*").remove();

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create force simulation
    const simulation = d3
        .forceSimulation(nodes)
        .force(
            "link",
            d3
                .forceLink(links)
                .id((d) => d.id)
                .distance(100)
        )
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
        .force("collision", d3.forceCollide().radius(30));

    // Create glyph system for tool groups
    const glyphSystem = createGlyphSystem(toolSets);

    // Draw links
    const link = g
        .append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", (d) => Math.sqrt(d.weight || 1) * 2)
        .attr("stroke-opacity", 0.6)
        .attr("marker-end", "url(#arrowhead)");

    // Arrow marker
    svg
        .append("defs")
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#94a3b8");

    // Draw nodes
    const node = g
        .append("g")
        .attr("class", "nodes")
        .selectAll("g.node")
        .data(nodes)
        .join("g")
        .attr("class", "node")
        .call(
            d3
                .drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended)
        );

    // Add circles/background for nodes
    node
        .append("circle")
        .attr("r", 20)
        .attr("fill", "#f1f5f9")
        .attr("stroke", "#cbd5e1")
        .attr("stroke-width", 2);

    // Add glyphs to nodes
    node.each(function (d) {
        const nodeGroup = d3.select(this);
        const glyphType = glyphSystem.getGlyph(d.name);
        renderGlyph(nodeGroup, glyphType, 0, 0, "#111827", 8);
    });

    // Add labels
    node
        .append("text")
        .attr("dy", 35)
        .attr("text-anchor", "middle")
        .attr("fill", "#475569")
        .style("font-size", "11px")
        .text((d) => d.name);

    // Update positions on tick
    simulation.on("tick", () => {
        link
            .attr("x1", (d) => d.source.x)
            .attr("y1", (d) => d.source.y)
            .attr("x2", (d) => d.target.x)
            .attr("y2", (d) => d.target.y);

        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

// Helper function to create glyph system (same as in upset_plot.js)
function createGlyphSystem(toolSets = {}) {
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

    const toolToGroup = new Map();
    const groupNames = Object.keys(toolSets).sort();

    groupNames.forEach((groupName) => {
        const tools = toolSets[groupName] || [];
        tools.forEach((toolName) => {
            toolToGroup.set(toolName, groupName);
        });
    });

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
    };
}

// Helper function to render glyph (same as in upset_plot.js)
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

