/**
 * Configuration utilities for Google Cloud MCP
 *
 * This module provides functionality to store and retrieve configuration
 * settings for the MCP server, such as project IDs.
 */
import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "./logger.js";

/**
 * Configuration interface
 */
interface McpConfig {
  /** Default Google Cloud project ID */
  defaultProjectId?: string;
  /** List of recently used project IDs */
  recentProjectIds: string[];
  /** Maximum number of recent project IDs to store */
  maxRecentProjects: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: McpConfig = {
  recentProjectIds: [],
  maxRecentProjects: 5,
};

/**
 * Path to the configuration file
 */
const CONFIG_DIR = path.join(os.homedir(), ".google-cloud-mcp");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

/**
 * Configuration manager for Google Cloud MCP
 */
export class ConfigManager {
  private config: McpConfig;
  private initialized = false;

  /**
   * Create a new ConfigManager instance
   */
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create config directory if it doesn't exist
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      // Load config if it exists
      if (fs.existsSync(CONFIG_FILE)) {
        const configData = await fs.promises.readFile(CONFIG_FILE, "utf-8");
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
      } else {
        // Create default config file
        await this.saveConfig();
      }

      this.initialized = true;
    } catch (error) {
      logger.error(
        `Failed to initialize configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Continue with default config
    }
  }

  /**
   * Save the configuration to disk
   */
  private async saveConfig(): Promise<void> {
    try {
      await fs.promises.writeFile(
        CONFIG_FILE,
        JSON.stringify(this.config, null, 2),
        "utf-8",
      );
    } catch (error) {
      logger.error(
        `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the default project ID
   *
   * @returns The default project ID or undefined if not set
   */
  getDefaultProjectId(): string | undefined {
    return this.config.defaultProjectId;
  }

  /**
   * Set the default project ID
   *
   * @param projectId The project ID to set as default
   */
  async setDefaultProjectId(projectId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.config.defaultProjectId = projectId;

    // Add to recent projects if not already there
    this.addToRecentProjects(projectId);

    await this.saveConfig();
  }

  /**
   * Add a project ID to the list of recent projects
   *
   * @param projectId The project ID to add
   */
  async addToRecentProjects(projectId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Remove if already in the list
    this.config.recentProjectIds = this.config.recentProjectIds.filter(
      (id) => id !== projectId,
    );

    // Add to the beginning of the list
    this.config.recentProjectIds.unshift(projectId);

    // Trim to max size
    if (this.config.recentProjectIds.length > this.config.maxRecentProjects) {
      this.config.recentProjectIds = this.config.recentProjectIds.slice(
        0,
        this.config.maxRecentProjects,
      );
    }

    await this.saveConfig();
  }

  /**
   * Get the list of recent project IDs
   *
   * @returns Array of recent project IDs
   */
  getRecentProjectIds(): string[] {
    return [...this.config.recentProjectIds];
  }
}

// Export a singleton instance
export const configManager = new ConfigManager();
