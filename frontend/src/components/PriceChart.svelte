<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
  import type { PricePoint } from '../lib/types';

  export let priceHistory: PricePoint[] = [];
  export let positive = true;

  let chartContainer: HTMLDivElement;
  let chart: IChartApi | null = null;
  let areaSeries: ISeriesApi<'Area'> | null = null;

  const positiveColor = '#00d395';
  const negativeColor = '#ff5b5b';

  onMount(() => {
    initChart();
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    window.removeEventListener('resize', handleResize);
    if (chart) {
      chart.remove();
    }
  });

  afterUpdate(() => {
    updateChartData();
  });

  function initChart() {
    if (!chartContainer) return;

    chart = createChart(chartContainer, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#888888',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: '#555555',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: '#555555',
          width: 1,
          style: 2,
        },
      },
      handleScale: false,
      handleScroll: false,
    });

    const lineColor = positive ? positiveColor : negativeColor;

    areaSeries = chart.addAreaSeries({
      lineColor: lineColor,
      topColor: `${lineColor}33`,
      bottomColor: `${lineColor}00`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    handleResize();
    updateChartData();
  }

  function updateChartData() {
    if (!areaSeries || priceHistory.length === 0) return;

    const lineColor = positive ? positiveColor : negativeColor;

    areaSeries.applyOptions({
      lineColor: lineColor,
      topColor: `${lineColor}33`,
      bottomColor: `${lineColor}00`,
    });

    const chartData = priceHistory.map(point => ({
      time: Math.floor(point.timestamp / 1000) as any,
      value: point.price,
    }));

    // Sort by time ascending
    chartData.sort((a, b) => a.time - b.time);

    areaSeries.setData(chartData);
    chart?.timeScale().fitContent();
  }

  function handleResize() {
    if (chart && chartContainer) {
      chart.applyOptions({
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
      });
    }
  }
</script>

<div bind:this={chartContainer} class="chart"></div>

<style>
  .chart {
    width: 100%;
    height: 100%;
    min-height: 200px;
  }
</style>
