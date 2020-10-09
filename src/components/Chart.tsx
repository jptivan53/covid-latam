import { AxisBottom, AxisLeft } from "@visx/axis";
import { curveMonotoneX } from "@visx/curve";
import { localPoint } from "@visx/event";
import { LinearGradient } from "@visx/gradient";
import { GridColumns, GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AreaClosed, Bar, Line } from "@visx/shape";
import { defaultStyles, Tooltip, withTooltip } from "@visx/tooltip";
import { WithTooltipProvidedProps } from "@visx/tooltip/lib/enhancers/withTooltip";
import { bisector, extent, max } from "d3-array";
import { timeFormat } from "d3-time-format";
import React, { useCallback, useMemo } from "react";
import { PaisResponse, StatusType } from "../types";

//Colors
export const background = "#3b6978";
export const background2 = "#204051";
export const accentColor = "#edffea";
export const accentColorDark = "#75daad";
const tooltipStyles = {
  ...defaultStyles,
  background,
  border: "1px solid white",
  color: "white",
};

const formatDate = timeFormat("%b %d, '%y");

// accessors
const getXValue = (d: PaisResponse): Date => new Date(d.Date);
const getYValue = (status: StatusType) => (d: PaisResponse) => d[status];

const bisectDate = bisector<PaisResponse, Date>((p) => new Date(p.Date)).right;

type AreaProps = {
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
};

type MyProps = AreaProps & {
  data?: PaisResponse[];
  status: StatusType;
};

type TooltipData = PaisResponse;

const colors = {
  Deaths: {
    main: "#f56565",
    light: "#e53e3e",
    dark: "#822727",
  },

  Confirmed: { main: "#d69e2e", light: "#faf089", dark: "#744210" },
  Recovered: { main: "#38a169", light: "#9ae6b4", dark: "#22543d" },
};

export const Chart = withTooltip<MyProps, TooltipData>(
  ({
    width,
    height,
    margin = { top: 40, right: 30, bottom: 50, left: 50 },
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipTop = 0,
    tooltipLeft = 0,
    data = [],
    status = "Confirmed",
  }: MyProps & WithTooltipProvidedProps<TooltipData>) => {
    if (width < 10) return null;

    // bounds
    const xMax = width - margin.left - margin.right;
    const yMax = height - margin.top - margin.bottom;

    // scales
    const xScale = useMemo(
      () =>
        scaleTime({
          range: [0, xMax],
          domain: extent(data, getXValue) as [Date, Date],
        }),
      [data, xMax]
    );
    const yScale = useMemo(
      () =>
        scaleLinear({
          range: [yMax, 0],
          domain: [0, max(data, getYValue(status)) || 0 /* + yMax / 3 */],
          nice: true,
        }),
      [data, yMax, status]
    );

    // tooltip handler
    const handleTooltip = useCallback(
      (
        event:
          | React.TouchEvent<SVGRectElement>
          | React.MouseEvent<SVGRectElement>
      ) => {
        const { x } = localPoint(event) || { x: 0 };
        const x0 = xScale.invert(x);
        const index = bisectDate(data, x0, 1);
        const d0 = data[index - 1];
        const d1 = data[index];
        let d = d0;
        if (d1 && getXValue(d1)) {
          d =
            x0.valueOf() - getXValue(d0).valueOf() >
            getXValue(d1).valueOf() - x0.valueOf()
              ? d1
              : d0;
        }
        console.log({ x, x0, d0, d1, d, test: typeof x0 });
        showTooltip({
          tooltipData: d,
          tooltipLeft: x - margin.left,
          tooltipTop: yScale(getYValue(status)(d)),
        });
      },
      [showTooltip, xScale, yScale, data, status, margin]
    );

    return (
      <div>
        <svg width={width} height={height}>
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="#EDF2F7"
            rx={8}
          />
          {/* <LinearGradient
            id="area-background-gradient"
            from={background}
            to={background2}
          /> */}
          <LinearGradient
            id="area-gradient"
            from={accentColor}
            to={accentColor}
            toOpacity={0.1}
          />
          <Group left={margin.left} top={margin.top}>
            <GridRows
              scale={yScale}
              width={xMax}
              strokeDasharray="3,3"
              stroke="#A0AEC0"
              strokeOpacity={0.3}
              pointerEvents="none"
            />
            <GridColumns
              scale={xScale}
              height={yMax}
              strokeDasharray="3,3"
              stroke="#A0AEC0"
              strokeOpacity={0.3}
              pointerEvents="none"
            />
            <AreaClosed<PaisResponse>
              data={data}
              x={(d) => xScale(getXValue(d)) as number}
              y={(d) => yScale(getYValue(status)(d)) as number}
              yScale={yScale}
              strokeWidth={1}
              stroke={colors[status].main}
              fill={colors[status].light}
              fillOpacity={0.5}
              curve={curveMonotoneX}
            />
            <Bar
              x={0}
              y={0}
              width={xMax}
              height={yMax}
              fill="transparent"
              rx={14}
              onTouchStart={handleTooltip}
              onTouchMove={handleTooltip}
              onMouseMove={handleTooltip}
              onMouseLeave={() => hideTooltip()}
            />
            {tooltipData && (
              <g>
                <Line
                  from={{ x: tooltipLeft, y: 0 }}
                  to={{ x: tooltipLeft, y: yMax }}
                  stroke={colors[status].light}
                  strokeWidth={2}
                  pointerEvents="none"
                  strokeDasharray="5,2"
                />
                <circle
                  cx={tooltipLeft}
                  cy={tooltipTop + 1}
                  r={4}
                  fill="black"
                  fillOpacity={0.1}
                  stroke="black"
                  strokeOpacity={0.1}
                  strokeWidth={2}
                  pointerEvents="none"
                />
                <circle
                  cx={tooltipLeft}
                  cy={tooltipTop}
                  r={4}
                  fill={colors[status].main}
                  stroke="white"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              </g>
            )}
            <AxisLeft scale={yScale} />
            <AxisBottom
              top={yMax}
              scale={xScale}
              numTicks={width > 520 ? 10 : 5}
            />
          </Group>
        </svg>
        {tooltipData && (
          <div>
            <Tooltip
              top={tooltipTop - 12}
              left={tooltipLeft + 12}
              style={tooltipStyles}
            >
              {`${status}: ${getYValue(status)(tooltipData)}`}
            </Tooltip>
            <Tooltip
              top={-14}
              left={tooltipLeft}
              style={{
                ...defaultStyles,
                minWidth: 72,
                textAlign: "center",
                transform: "translateX(-50%)",
              }}
            >
              {formatDate(getXValue(tooltipData))}
            </Tooltip>
          </div>
        )}
      </div>
    );
  }
);
