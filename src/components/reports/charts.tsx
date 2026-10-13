"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "motion/react";
import type { ChartBlock } from "@/server/queries/report-charts";

const AXIS_TICK = { fill: "#94a3b8", fontSize: 11 };
const GRID_STROKE = "rgba(148,163,184,0.25)";

type TipEntry = {
  name?: string | number;
  value?: string | number;
  color?: string;
};

type ChartTipProps = {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
  unit?: string;
};

function ChartTip({
  active,
  payload,
  label,
  unit,
}: ChartTipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="border-border rounded-md border px-3 py-2 text-xs shadow-md"
      style={{ background: "var(--popover)" }}
    >
      <p
        className="mb-1 font-medium"
        style={{ color: "var(--popover-foreground)" }}
      >
        {label}
      </p>
      {payload.map((entry, index) => (
        <p
          key={index}
          className="flex items-center gap-1.5"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: entry.color }}
          />
          {entry.name}:
          <span
            className="font-medium tabular-nums"
            style={{ color: "var(--popover-foreground)" }}
          >
            {unit === "SLE" ? "SLE " : ""}
            {Number(entry.value ?? 0).toLocaleString()}
            {unit && unit !== "SLE" ? ` ${unit}` : ""}
          </span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  legend,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  legend?: { name: string; color: string }[];
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`bg-card flex flex-col rounded-lg border p-4 ${wide ? "sm:col-span-2" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {subtitle ? (
            <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
          ) : null}
        </div>
        {legend && legend.length > 1 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {legend.map((item) => (
              <span
                key={item.name}
                className="text-muted-foreground flex items-center gap-1.5 text-xs"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: item.color }}
                />
                {item.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <p className="text-muted-foreground flex h-40 items-center justify-center text-sm">
      No data for the current filters.
    </p>
  );
}

function DonutBlock({
  block,
}: {
  block: Extract<ChartBlock, { kind: "donut" }>;
}) {
  const total = block.slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) return <EmptyChart />;

  return (
    <>
      <div className="relative">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={block.slices}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
              isAnimationActive
            >
              {block.slices.map((slice, index) => (
                <Cell key={index} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              content={(props) => (
                <ChartTip {...(props as unknown as ChartTipProps)} />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-semibold tabular-nums">
            {total.toLocaleString()}
          </p>
          <p className="text-muted-foreground text-[11px]">total</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {block.slices.map((slice) => (
          <div
            key={slice.label}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: slice.color }}
              />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {slice.value.toLocaleString()} ·{" "}
              {Math.round((slice.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function BarsBlock({ block }: { block: Extract<ChartBlock, { kind: "bars" }> }) {
  if (block.data.length === 0) return <EmptyChart />;
  const max = Math.max(...block.data.map((item) => item.value), 1);

  return (
    <div className="flex flex-col gap-2.5">
      {block.data.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium">
              {item.label}
              {item.hint ? (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {item.hint}
                </span>
              ) : null}
            </span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {item.value.toLocaleString()}
              {block.unit ? ` ${block.unit}` : ""}
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <motion.div
              className="h-full rounded-full"
              style={{ background: item.color ?? "#6366f1" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
              transition={{ duration: 0.5, delay: index * 0.04, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function flatten(
  block: Extract<ChartBlock, { kind: "columns" | "trend" }>
): Record<string, string | number>[] {
  return block.points.map((point) => {
    const row: Record<string, string | number> = { label: point.label };
    block.series.forEach((series, index) => {
      row[series.name] = point.values[index] ?? 0;
    });
    return row;
  });
}

function ColumnsBlock({
  block,
}: {
  block: Extract<ChartBlock, { kind: "columns" }>;
}) {
  if (block.points.length === 0) return <EmptyChart />;
  const data = flatten(block);
  const single = block.series.length === 1;

  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          width={48}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.14)" }}
          content={(props) => (
            <ChartTip {...(props as unknown as ChartTipProps)} unit={block.unit} />
          )}
        />
        {block.series.map((series) => (
          <Bar
            key={series.name}
            dataKey={series.name}
            fill={series.color}
            radius={single ? [4, 4, 0, 0] : [3, 3, 0, 0]}
            maxBarSize={28}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function TrendBlock({
  block,
}: {
  block: Extract<ChartBlock, { kind: "trend" }>;
}) {
  if (block.points.length === 0) return <EmptyChart />;
  const data = flatten(block);

  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          {block.series.map((series, index) => (
            <linearGradient
              key={series.name}
              id={`area-${block.id.replace(/[^a-zA-Z0-9]/g, "-")}-${index}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={series.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={series.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          width={40}
          allowDecimals={false}
        />
        <Tooltip
          content={(props) => (
            <ChartTip {...(props as unknown as ChartTipProps)} unit={block.unit} />
          )}
        />
        {block.series.map((series, index) => (
          <Area
            key={series.name}
            type="monotone"
            dataKey={series.name}
            stroke={series.color}
            strokeWidth={2}
            fill={`url(#area-${block.id.replace(/[^a-zA-Z0-9]/g, "-")}-${index})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ReportCharts({ blocks }: { blocks: ChartBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {blocks.map((block) => {
        switch (block.kind) {
          case "donut":
            return (
              <ChartCard key={block.id} title={block.title} subtitle={block.subtitle}>
                <DonutBlock block={block} />
              </ChartCard>
            );
          case "bars":
            return (
              <ChartCard key={block.id} title={block.title} subtitle={block.subtitle}>
                <BarsBlock block={block} />
              </ChartCard>
            );
          case "columns":
            return (
              <ChartCard
                key={block.id}
                title={block.title}
                subtitle={block.subtitle}
                legend={block.series}
              >
                <ColumnsBlock block={block} />
              </ChartCard>
            );
          case "trend":
            return (
              <ChartCard
                key={block.id}
                title={block.title}
                subtitle={block.subtitle}
                legend={block.series}
                wide
              >
                <TrendBlock block={block} />
              </ChartCard>
            );
        }
      })}
    </div>
  );
}
