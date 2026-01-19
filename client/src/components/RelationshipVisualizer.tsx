import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TableNode {
  id: string;
  name: string;
  fieldCount: number;
}

interface Relationship {
  source: string;
  target: string;
  sourceField: string;
  targetField: string;
  type: "explicit" | "inferred";
}

interface RelationshipVisualizerProps {
  tables: TableNode[];
  relationships: Relationship[];
}

export function RelationshipVisualizer({ tables, relationships }: RelationshipVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<TableNode | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!svgRef.current || tables.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create SVG container
    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // Create zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    // Create container for graph elements
    const g = svg.append("g");

    // Prepare data for D3 force simulation
    const nodes = tables.map(t => ({
      id: t.id,
      name: t.name,
      fieldCount: t.fieldCount,
    }));

    const links = relationships.map(r => ({
      source: r.source,
      target: r.target,
      sourceField: r.sourceField,
      targetField: r.targetField,
      type: r.type,
    }));

    // Create force simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links as any)
        .id((d: any) => d.id)
        .distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

    // Create arrow markers for relationships
    svg.append("defs").selectAll("marker")
      .data(["explicit", "inferred"])
      .enter().append("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 35)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", d => d === "explicit" ? "#3b82f6" : "#10b981");

    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", (d: any) => d.type === "explicit" ? "#3b82f6" : "#10b981")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", (d: any) => `url(#arrow-${d.type})`)
      .style("cursor", "pointer");

    // Create link labels
    const linkLabel = g.append("g")
      .selectAll("text")
      .data(links)
      .enter().append("text")
      .attr("font-size", 10)
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .text((d: any) => `${d.sourceField} → ${d.targetField}`);

    // Create nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .style("cursor", "pointer")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Add circles for nodes
    node.append("circle")
      .attr("r", 30)
      .attr("fill", "#3b82f6")
      .attr("stroke", "#1e40af")
      .attr("stroke-width", 2)
      .on("click", (event: any, d: any) => {
        event.stopPropagation();
        setSelectedNode(tables.find(t => t.id === d.id) || null);
      });

    // Add labels for nodes
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("font-size", 12)
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text((d: any) => d.name);

    // Add field count badge
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 45)
      .attr("font-size", 10)
      .attr("fill", "#64748b")
      .text((d: any) => `${d.fieldCount} fields`);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [tables, relationships]);

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      (d3.zoom<SVGSVGElement, unknown>() as any).scaleBy,
      1.3
    );
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      (d3.zoom<SVGSVGElement, unknown>() as any).scaleBy,
      0.7
    );
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      (d3.zoom<SVGSVGElement, unknown>() as any).transform,
      d3.zoomIdentity
    );
  };

  const handleExport = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "relationship-diagram.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Table Relationships</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="default" className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Explicit
              </Badge>
              <Badge variant="default" className="flex items-center gap-1 bg-emerald-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Inferred
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg
            ref={svgRef}
            className="w-full border rounded-lg bg-white"
            style={{ height: "600px" }}
          />
          {selectedNode && (
            <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-xs">
              <h3 className="font-bold text-lg mb-2">{selectedNode.name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedNode.fieldCount} fields
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setSelectedNode(null)}
              >
                Close
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Drag nodes to reposition • Scroll to zoom • Click nodes for details
        </p>
      </CardContent>
    </Card>
  );
}
