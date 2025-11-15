/**
 * Time-related utility functions
 */
import { GcpMcpError } from "./error.js";

/**
 * Parses a relative time string into a Date object
 *
 * @param timeString A string representing a relative time (e.g., "1h", "2d", "30m")
 * @returns A Date object representing the time
 */
export function parseRelativeTime(timeString: string): Date {
  // If it's an ISO date string, parse it directly
  if (timeString.includes("T") && timeString.includes(":")) {
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Parse relative time format (e.g., "1h", "2d", "30m")
  const match = timeString.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new GcpMcpError(
      `Invalid time format: ${timeString}. Use format like "30s", "5m", "2h", "1d", or "1w".`,
      "INVALID_ARGUMENT",
      400,
    );
  }

  const value = parseInt(match[1]);
  const unit = match[2];
  const now = new Date();

  switch (unit) {
    case "s": // seconds
      return new Date(now.getTime() - value * 1000);
    case "m": // minutes
      return new Date(now.getTime() - value * 60 * 1000);
    case "h": // hours
      return new Date(now.getTime() - value * 60 * 60 * 1000);
    case "d": // days
      return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
    case "w": // weeks
      return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
    default:
      throw new GcpMcpError(
        `Invalid time unit: ${unit}. Use s, m, h, d, or w.`,
        "INVALID_ARGUMENT",
        400,
      );
  }
}
