/**
 * Metrics lookup utility for Google Cloud Monitoring
 *
 * This module provides functionality to search and retrieve metric information
 * from the metrics documentation files based on natural language queries.
 */
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname } from "path";

const readFile = promisify(fs.readFile);

/**
 * Represents a metric from the documentation
 */
export interface Metric {
  /** The full metric type (e.g., 'compute.googleapis.com/instance/cpu/utilization') */
  type: string;
  /** The display name of the metric */
  displayName: string;
  /** The description of the metric */
  description: string;
  /** The kind of metric (GAUGE, DELTA, CUMULATIVE) */
  kind: string;
  /** The value type (INT64, DOUBLE, DISTRIBUTION, etc.) */
  valueType: string;
  /** The unit of the metric */
  unit: string;
  /** The monitored resource types this metric applies to */
  monitoredResources: string[];
  /** The labels that can be used with this metric */
  labels: Array<{
    name: string;
    description: string;
  }>;
  /** The source documentation file this metric was found in */
  source: string;
}

/**
 * Categories of metrics documentation
 */
export enum MetricCategory {
  GCP = "gcp",
  Kubernetes = "kubernetes",
  Istio = "istio",
}

/**
 * Class to handle metric lookups from documentation
 */
export class MetricsLookup {
  private metrics: Metric[] = [];
  private initialized = false;
  private metricsDir: string;

  /**
   * Create a new MetricsLookup instance
   *
   * @param metricsDir The directory containing metrics markdown files
   */
  constructor(metricsDir: string) {
    this.metricsDir = metricsDir;
  }

  /**
   * Initialize the metrics lookup by parsing all metrics files
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Parse all metrics files
    await this.parseMetricsFile(MetricCategory.GCP);
    await this.parseMetricsFile(MetricCategory.Kubernetes);
    await this.parseMetricsFile(MetricCategory.Istio);

    this.initialized = true;
    // Metrics lookup initialized successfully
  }

  /**
   * Parse a metrics markdown file and extract metric information
   *
   * @param category The category of metrics to parse
   */
  private async parseMetricsFile(category: MetricCategory): Promise<void> {
    const filename = `metrics_${category}.md`;
    const filepath = path.join(this.metricsDir, filename);

    try {
      const content = await readFile(filepath, "utf-8");

      // Extract metrics from the markdown content
      // This is a simplified implementation - in a real-world scenario,
      // we would use a more robust markdown parser

      // Split the content by metric entries (each starting with "* Metric type")
      const metricEntries = content.split(/\n\* Metric type/).slice(1);

      for (const entry of metricEntries) {
        try {
          // Extract metric type
          const typeMatch = entry.match(
            /([a-zA-Z0-9_/]+)\s+([A-Z]+)\s+\(project\)/,
          );
          if (!typeMatch) continue;

          const metricName = typeMatch[1].trim();

          // Extract display name
          const displayNameMatch = entry.match(/Display name:\s+([^\n]+)/);
          const displayName = displayNameMatch
            ? displayNameMatch[1].trim()
            : "";

          // Extract kind, type, and unit
          const kindTypeUnitMatch = entry.match(
            /(GAUGE|DELTA|CUMULATIVE),\s+(INT64|DOUBLE|DISTRIBUTION|STRING),\s+([^\n]+)/,
          );
          const kind = kindTypeUnitMatch ? kindTypeUnitMatch[1].trim() : "";
          const valueType = kindTypeUnitMatch
            ? kindTypeUnitMatch[2].trim()
            : "";
          const unit = kindTypeUnitMatch ? kindTypeUnitMatch[3].trim() : "";

          // Extract monitored resources
          const resourcesMatch = entry.match(
            /([a-zA-Z0-9_.]+(\s+[a-zA-Z0-9_.]+)*)/g,
          );
          const monitoredResources = resourcesMatch
            ? resourcesMatch.filter(
                (r) =>
                  r.includes(".googleapis.com") ||
                  [
                    "k8s_container",
                    "k8s_pod",
                    "istio_canonical_service",
                  ].includes(r),
              )
            : [];

          // Extract description
          const descriptionMatch = entry.match(
            /\*\s+(.*?)(?=\s+[a-zA-Z_]+:|\s*$)/s,
          );
          const description = descriptionMatch
            ? descriptionMatch[1].trim()
            : "";

          // Extract labels
          const labels: Array<{ name: string; description: string }> = [];
          const labelMatches = entry.matchAll(
            /([a-zA-Z_]+):\s+(.*?)(?=\s+[a-zA-Z_]+:|\s*$)/g,
          );

          for (const match of labelMatches) {
            labels.push({
              name: match[1].trim(),
              description: match[2].trim(),
            });
          }

          // Determine the full metric type based on category
          let fullType = "";
          if (category === MetricCategory.GCP) {
            // For GCP metrics, we need to find the API prefix
            const apiPrefixMatch = content.match(
              /The "metric type" strings in this table must be prefixed with `([^`]+)`/,
            );
            const apiPrefix = apiPrefixMatch ? apiPrefixMatch[1] : "";
            fullType = apiPrefix + metricName;
          } else if (category === MetricCategory.Kubernetes) {
            fullType = `kubernetes.io/${metricName}`;
          } else if (category === MetricCategory.Istio) {
            fullType = `istio.io/${metricName}`;
          }

          this.metrics.push({
            type: fullType,
            displayName,
            description,
            kind,
            valueType,
            unit,
            monitoredResources,
            labels,
            source: category,
          });
        } catch {
          // Error parsing metric entry - skipping
          // Continue with next entry
        }
      }

      // Metrics file parsed successfully
    } catch {
      // Error reading metrics file - skipping
      // Don't throw here, just log the error and continue
    }
  }

  /**
   * Find metrics based on a natural language query
   *
   * @param query The natural language query to search for
   * @param category Optional category to limit the search to
   * @param limit Maximum number of results to return
   * @returns Array of matching metrics
   */
  findMetrics(query: string, category?: MetricCategory, limit = 5): Metric[] {
    if (!this.initialized) {
      throw new Error(
        "Metrics lookup not initialized. Call initialize() first.",
      );
    }

    // Convert query to lowercase for case-insensitive matching
    const lowerQuery = query.toLowerCase();

    // Extract key terms from the query
    const terms = this.extractKeyTerms(lowerQuery);

    // Score each metric based on how well it matches the query
    const scoredMetrics = this.metrics
      .filter((metric) => !category || metric.source === category)
      .map((metric) => {
        const score = this.calculateRelevanceScore(metric, terms, lowerQuery);
        return { metric, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    // Return the top N results
    return scoredMetrics.slice(0, limit).map((item) => item.metric);
  }

  /**
   * Extract key terms from a natural language query
   *
   * @param query The query to extract terms from
   * @returns Array of key terms
   */
  private extractKeyTerms(query: string): string[] {
    // Remove common words and split into terms
    const stopWords = [
      "a",
      "an",
      "the",
      "and",
      "or",
      "but",
      "is",
      "are",
      "for",
      "with",
      "about",
      "to",
      "in",
      "of",
    ];

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.includes(word));
  }

  /**
   * Calculate a relevance score for a metric based on how well it matches the query terms
   *
   * @param metric The metric to score
   * @param terms The key terms from the query
   * @param fullQuery The full original query
   * @returns A relevance score (higher is better)
   */
  private calculateRelevanceScore(
    metric: Metric,
    terms: string[],
    fullQuery: string,
  ): number {
    let score = 0;

    // Check for exact matches in the metric type (highest priority)
    if (metric.type.toLowerCase().includes(fullQuery)) {
      score += 100;
    }

    // Check for exact matches in the display name
    if (metric.displayName.toLowerCase().includes(fullQuery)) {
      score += 80;
    }

    // Check for exact matches in the description
    if (metric.description.toLowerCase().includes(fullQuery)) {
      score += 60;
    }

    // Check for individual term matches
    for (const term of terms) {
      // Match in type
      if (metric.type.toLowerCase().includes(term)) {
        score += 30;
      }

      // Match in display name
      if (metric.displayName.toLowerCase().includes(term)) {
        score += 25;
      }

      // Match in description
      if (metric.description.toLowerCase().includes(term)) {
        score += 20;
      }

      // Match in labels
      for (const label of metric.labels) {
        if (
          label.name.toLowerCase().includes(term) ||
          label.description.toLowerCase().includes(term)
        ) {
          score += 15;
        }
      }
    }

    return score;
  }

  /**
   * Get a metric by its exact type
   *
   * @param metricType The full metric type to look up
   * @returns The metric or undefined if not found
   */
  getMetricByType(metricType: string): Metric | undefined {
    return this.metrics.find((m) => m.type === metricType);
  }

  /**
   * Suggest a monitoring filter based on a natural language query
   *
   * @param query The natural language query
   * @returns A suggested monitoring filter string
   */
  suggestFilter(query: string): string {
    const metrics = this.findMetrics(query);

    if (metrics.length === 0) {
      return "";
    }

    // Use the top matching metric to create a filter
    const topMetric = metrics[0];

    // Basic filter with just the metric type
    let filter = `metric.type="${topMetric.type}"`;

    // Try to extract additional filter conditions from the query
    const resourceMatch =
      /resource\s+(?:type|is|equals?)\s+["']?([a-zA-Z0-9_]+)["']?/i.exec(query);
    if (resourceMatch && resourceMatch[1]) {
      filter += ` AND resource.type="${resourceMatch[1]}"`;
    }

    // Look for label conditions
    for (const label of topMetric.labels) {
      const labelRegex = new RegExp(
        `${label.name}\\s+(?:is|equals?|=)\\s+["']?([\\w-]+)["']?`,
        "i",
      );
      const match = labelRegex.exec(query);

      if (match && match[1]) {
        filter += ` AND metric.labels.${label.name}="${match[1]}"`;
      }
    }

    return filter;
  }
}

// Create dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Export a singleton instance
// Point directly to the directory containing the metrics markdown files
export const metricsLookup = new MetricsLookup(path.join(__dirname));
