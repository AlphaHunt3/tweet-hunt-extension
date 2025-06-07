import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

interface TokenMention {
  text?: string;
  value?: number;
  token?: string;
  chain?: string;
  tweetId?: string;
  recordTime?: string;
  username?: string;
  mentionCount?: number;
  symbol?: string;
  name?: string;
  image?: string;
  link?: string;
  source?: string;
  dateAdded?: string;
  period?: number;
  openPrice?: number;
  maxPrice?: number;
  nowPrice?: number;
  maxProfit?: number;
  nowProfit?: number;
  maxFDV?: number;
  belowLimit?: boolean;
}

interface TokenWordCloudProps {
  tokens: TokenMention[];
  height?: number;
  emptyTips?: string;
}

function TokenWordCloud({ tokens, height = 160, emptyTips }: TokenWordCloudProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 290, height });

  // Process tokens to ensure they have text and value properties
  const processedTokens = useMemo(() => {
    return (tokens || []).map(token => ({
      text: token.symbol || token.token || token.text || '',
      value: token.mentionCount || token.value || 1
    })).filter(token => token.text);
  }, [tokens]);

  // Memoize sorted tokens to prevent unnecessary recalculations
  const sortedTokens = useMemo(() => {
    const maxTokens = 20;
    return [...processedTokens]
    .sort((a, b) => b.value - a.value)
    .slice(0, maxTokens);
  }, [processedTokens]);

  // Colors for the word cloud - more vibrant colors
  const colors = [
    '#60a5fa', // blue-400
    '#10b981', // green-500
    '#f59e0b', // yellow-500
    '#ef4444', // red-500
    '#8b5cf6', // purple-500
    '#ec4899', // pink-500
    '#6366f1', // indigo-500
    '#f97316', // orange-500
    '#14b8a6', // teal-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#10b981', // emerald-500
  ];

  // Update dimensions only when container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const containerWidth = containerRef.current?.clientWidth || 290;
      setDimensions({ width: containerWidth, height });
    };

    // Initial update
    updateDimensions();

    // Add resize listener
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current!);

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current!);
      }
      resizeObserver.disconnect();
    };
  }, [height, tokens]);

  // Generate and render the word cloud
  useEffect(() => {
    if (!svgRef.current || sortedTokens.length === 0 || dimensions.width === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Calculate font size range based on token values
    const minValue = sortedTokens.length > 1 ? sortedTokens[sortedTokens.length - 1].value : 1;
    const maxValue = sortedTokens.length > 0 ? sortedTokens[0].value : 2;
    const fontSizeScale = d3.scaleLog()
    .domain([Math.max(1, minValue), Math.max(2, maxValue)])
    .range([14, 28])
    .clamp(true);

    // Set up the layout
    const layout = cloud()
    .size([dimensions.width, dimensions.height])
    .words(
      sortedTokens.map(d => ({
        text: d.text,
        size: fontSizeScale(Math.max(1, d.value)),
        value: d.value,
        rotate: 0
      }))
    )
    .padding(5)
    .rotate(() => 0)
    .font('sans-serif')
    .fontSize(d => Number(d.size || 14))
    .spiral('archimedean')
    .random(() => 0.5)
    .on('end', draw);

    // Start the layout
    layout.start();

    // Function to draw the word cloud
    function draw(words: any[]) {
      const svg = d3.select(svgRef.current);

      const group = svg
      .attr('width', dimensions.width)
      .attr('height', dimensions.height!)
      .append('g')
      .attr('transform', `translate(${dimensions.width / 2},${dimensions.height / 2})`);

      // Add words
      group
      .selectAll('text')
      .data(words)
      .enter()
      .append('text')
      .style('font-size', d => `${d.size}px`)
      .style('font-family', 'sans-serif')
      .style('font-weight', 'bold')
      .style('fill', () => {
        return colors[Math.floor(Math.random() * colors.length)];
      })
      .attr('text-anchor', 'middle')
      .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
      .text(d => d.text)
      .style('opacity', 1);

      // Add event listeners
      group.selectAll('text')
      .on('mouseover', function (event, d) {
        const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'token-tooltip')
        .style('position', 'absolute')
        .style('background', 'var(--bg-secondary)')
        .style('color', 'var(--text-primary)')
        .style('padding', '5px 8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('opacity', 0.9);

        tooltip
        // @ts-ignore
        .html(`${d.text}: ${d.value} mentions`)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 28}px`);

        d3.select(this)
        .style('filter', 'brightness(1.2)');
      })
      .on('mouseout', function () {
        d3.selectAll('.token-tooltip').remove();
        d3.select(this)
        .style('filter', 'brightness(1)');
      });
    }

    return () => {
      d3.select(svgRef.current).selectAll('*').remove();
      d3.selectAll('.token-tooltip').remove();
    };
  }, [sortedTokens, dimensions.width, dimensions.height]);

  // Fallback UI when no tokens
  if (sortedTokens.length === 0) {
    return (
      <div
        className="w-full theme-bg-tertiary rounded-md overflow-hidden flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="theme-text-secondary text-sm">
          {emptyTips ? emptyTips : '-'}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full theme-bg-tertiary rounded-md overflow-hidden flex items-center justify-center pointer-events-none"
      style={{ height: `${height}px` }}
    >
      <svg ref={svgRef} />
    </div>
  );
}

export default React.memo(TokenWordCloud)
