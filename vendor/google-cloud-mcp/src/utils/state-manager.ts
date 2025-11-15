/**
 * State Manager for Google Cloud MCP
 *
 * This module provides a central state management system for the application,
 * ensuring consistent access to important state like the current project ID.
 * State is persisted to a file between sessions.
 */
import { configManager } from "./config.js";
import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "./logger.js";

/**
 * Application state interface
 */
interface AppState {
  /** Current Google Cloud project ID */
  currentProjectId: string | null;
  /** Whether authentication has been initialized */
  authInitialized: boolean;
  /** Last updated timestamp */
  lastUpdated?: number;
}

/**
 * Path to the state file
 */
const STATE_DIR = path.join(os.homedir(), ".google-cloud-mcp");
const STATE_FILE = path.join(STATE_DIR, "state.json");

/**
 * State manager for the application
 */
class StateManager extends EventEmitter {
  private state: AppState = {
    currentProjectId: null,
    authInitialized: false,
  };

  // Singleton instance
  private static instance: StateManager;

  /**
   * Get the singleton instance
   */
  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize the state manager
   */
  private async initialize(): Promise<void> {
    try {
      // Create state directory if it doesn't exist
      if (!fs.existsSync(STATE_DIR)) {
        fs.mkdirSync(STATE_DIR, { recursive: true });
      }

      // Load state from file if it exists
      if (fs.existsSync(STATE_FILE)) {
        try {
          const stateData = await fs.promises.readFile(STATE_FILE, "utf-8");
          const loadedState = JSON.parse(stateData);
          this.state = { ...this.state, ...loadedState };
          logger.debug(`Loaded state from file: ${JSON.stringify(this.state)}`);
        } catch (fileError) {
          logger.warn(
            `Error loading state from file: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
          );
          // Continue with default state
        }
      }

      // Initialize config manager
      await configManager.initialize();

      // If we don't have a project ID from the state file, try to get it from config
      if (!this.state.currentProjectId) {
        const defaultProjectId = configManager.getDefaultProjectId();
        if (defaultProjectId) {
          await this.setCurrentProjectId(defaultProjectId);
        }
      }

      // Check environment variable as fallback
      if (!this.state.currentProjectId && process.env.GOOGLE_CLOUD_PROJECT) {
        await this.setCurrentProjectId(process.env.GOOGLE_CLOUD_PROJECT);
      }

      logger.info(
        `State manager initialized with project ID: ${this.state.currentProjectId || "not set"}`,
      );
    } catch (error) {
      logger.error(
        `Failed to initialize state manager: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Save the state to disk
   */
  private async saveState(): Promise<void> {
    try {
      // Update the timestamp
      this.state.lastUpdated = Date.now();

      // Write to file
      await fs.promises.writeFile(
        STATE_FILE,
        JSON.stringify(this.state, null, 2),
        "utf-8",
      );
      logger.debug(`State saved to file: ${JSON.stringify(this.state)}`);
    } catch (error) {
      logger.error(
        `Failed to save state: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the current project ID
   *
   * @returns The current project ID or null if not set
   */
  getCurrentProjectId(): string | null {
    return this.state.currentProjectId;
  }

  /**
   * Set the current project ID
   *
   * @param projectId The project ID to set
   */
  async setCurrentProjectId(projectId: string): Promise<void> {
    if (!projectId) {
      throw new Error("Project ID cannot be empty");
    }

    // Update in-memory state
    this.state.currentProjectId = projectId;

    // Set in environment variable for immediate use
    process.env.GOOGLE_CLOUD_PROJECT = projectId;

    // Update config for persistence
    try {
      await configManager.setDefaultProjectId(projectId);
    } catch (error) {
      logger.warn(
        `Could not save project ID to config: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Save state to file
    await this.saveState();

    // Emit change event
    this.emit("projectIdChanged", projectId);

    logger.info(`Current project ID set to: ${projectId}`);
  }

  /**
   * Set the auth initialization state
   *
   * @param initialized Whether auth has been initialized
   */
  setAuthInitialized(initialized: boolean): void {
    this.state.authInitialized = initialized;
    this.emit("authInitialized", initialized);
  }

  /**
   * Get the auth initialization state
   *
   * @returns Whether auth has been initialized
   */
  isAuthInitialized(): boolean {
    return this.state.authInitialized;
  }
}

// Export the singleton instance
export const stateManager = StateManager.getInstance();
