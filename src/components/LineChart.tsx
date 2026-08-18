import { useEffect, useState } from "react";
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

export type LineChartPoint = {
  x: number;
  y: number;
  label: string;
  fullLabel: string;
  isHighlight?: boolean;
};

type Props = {
  points: LineChartPoint[];
  height?: number;
  color?: string;
  highlightColor?: string;
  unit?: string;
  formatValue?: (value: number) => string;
};

const PADDING_X = 20;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 24;
const MIN_POINT_SPACING = 48;

const LineChart = ({
  points,
  height = 180,
  color = "#2f6feb",
  highlightColor = "#e8a400",
  unit = "",
  formatValue = (value) => String(value),
}: Props) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(points.length > 0 ? points.length - 1 : null);
  }, [points]);

  if (points.length === 0) {
    return null;
  }

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const chartAreaWidth = Math.max(
    containerWidth - PADDING_X * 2,
    (points.length - 1) * MIN_POINT_SPACING,
  );
  const svgWidth = chartAreaWidth + PADDING_X * 2;
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || Math.max(maxY, 1) * 0.1 || 1;
  const yPad = yRange * 0.2;

  const scaleX = (x: number) =>
    points.length === 1
      ? PADDING_X + chartAreaWidth / 2
      : PADDING_X + ((x - minX) / xRange) * chartAreaWidth;

  const scaleY = (y: number) =>
    PADDING_TOP +
    chartHeight -
    ((y - minY + yPad) / (yRange + yPad * 2)) * chartHeight;

  const pathD = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${scaleX(p.x).toFixed(1)} ${scaleY(p.y).toFixed(1)}`,
    )
    .join(" ");

  const selected = selectedIndex !== null ? points[selectedIndex] : null;

  return (
    <View>
      <View style={styles.tooltipSlot}>
        {selected ? (
          <>
            <Text style={styles.tooltipValue}>
              {formatValue(selected.y)} {unit}
            </Text>
            <Text style={styles.tooltipLabel}>{selected.fullLabel}</Text>
          </>
        ) : (
          <Text style={styles.tooltipHint}>Tap a point to see its value</Text>
        )}
      </View>
      <View onLayout={onLayout}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={svgWidth} height={height}>
            <Line
              x1={PADDING_X}
              y1={PADDING_TOP + chartHeight}
              x2={svgWidth - PADDING_X}
              y2={PADDING_TOP + chartHeight}
              stroke="#ddd"
              strokeWidth={1}
            />
            <Path d={pathD} stroke={color} strokeWidth={2} fill="none" />
            {points.map((p, i) => (
              <Circle
                key={`point-${i}`}
                cx={scaleX(p.x)}
                cy={scaleY(p.y)}
                r={i === selectedIndex ? 7 : p.isHighlight ? 5 : 4}
                fill={p.isHighlight ? highlightColor : color}
                stroke="#fff"
                strokeWidth={i === selectedIndex ? 2 : 1}
                onPress={() =>
                  setSelectedIndex((current) => (current === i ? null : i))
                }
              />
            ))}
            {points.map((p, i) => (
              <SvgText
                key={`label-${i}`}
                x={scaleX(p.x)}
                y={height - 6}
                fontSize={10}
                fill="#666"
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            ))}
          </Svg>
        </ScrollView>
      </View>
    </View>
  );
};

export default LineChart;

const styles = StyleSheet.create({
  tooltipSlot: { minHeight: 34, marginBottom: 4 },
  tooltipValue: { fontSize: 15, fontWeight: "700", color: "#222" },
  tooltipLabel: { fontSize: 12, color: "#666", marginTop: 1 },
  tooltipHint: { fontSize: 12, color: "#999", fontStyle: "italic" },
});
