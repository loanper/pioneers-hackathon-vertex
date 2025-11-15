/**
 * Type definitions for Google Cloud Monitoring service
 */
import monitoring from "@google-cloud/monitoring";
import { google } from "@google-cloud/monitoring/build/protos/protos.js";
const { MetricServiceClient } = monitoring;

/**
 * Interface for Google Cloud Monitoring time series data
 */
export interface TimeSeriesData {
  metric: {
    type: string;
    labels?: Record<string, string>;
  };
  resource: {
    type: string;
    labels: Record<string, string>;
  };
  metricKind: string;
  valueType: string;
  points: Array<{
    interval: {
      startTime: string;
      endTime: string;
    };
    value: {
      boolValue?: boolean;
      int64Value?: string;
      doubleValue?: number;
      stringValue?: string;
      distributionValue?: any;
    };
  }>;
}

/**
 * Initialises the Google Cloud Monitoring client
 *
 * @returns A configured Monitoring client
 */
export function getMonitoringClient() {
  return new MetricServiceClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });
}

/**
 * Formats a time series data point for display
 *
 * @param timeSeries The time series data to format
 * @returns A formatted string representation of the time series data
 */
export function formatTimeSeriesData(
  timeSeries: google.monitoring.v3.ITimeSeries[],
): string {
  if (!timeSeries || timeSeries.length === 0) {
    return "No time series data found.";
  }

  let result = "";

  for (const series of timeSeries) {
    // Format metric information
    const metricType = series.metric?.type;
    const metricLabels = series.metric?.labels
      ? Object.entries(series.metric?.labels)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")
      : "";

    const resourceType = series.resource?.type;
    const resourceLabels = Object.entries(series.resource?.labels ?? {})
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");

    result += `## Metric: ${metricType}\n`;
    result += `- Resource: ${resourceType}(${resourceLabels})\n`;
    if (metricLabels) {
      result += `- Labels: ${metricLabels}\n`;
    }
    result += `- Kind: ${series.metricKind}, Type: ${series.valueType}\n\n`;

    // Format data points
    result += "| Timestamp | Value |\n";
    result += "|-----------|-------|\n";

    for (const point of series.points ?? []) {
      const timestamp = new Date(
        Number(point.interval?.endTime?.seconds) * 1000,
      ).toISOString();
      // Extract the value based on valueType
      let value: string;
      if (point.value?.boolValue !== undefined) {
        value = String(point.value?.boolValue) ?? "N/A";
      } else if (point.value?.int64Value !== undefined) {
        value = point.value?.int64Value?.toString() ?? "N/A";
      } else if (point.value?.doubleValue !== undefined) {
        value = point.value?.doubleValue?.toFixed(6) ?? "N/A";
      } else if (point.value?.stringValue !== undefined) {
        value = point.value?.stringValue ?? "N/A";
      } else if (point.value?.distributionValue) {
        value = "Distribution";
      } else {
        value = "N/A";
      }

      result += `| ${timestamp} | ${value} |\n`;
    }

    result += "\n---\n\n";
  }

  return result;
}
