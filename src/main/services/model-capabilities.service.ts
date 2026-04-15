/**
 * ModelCapabilitiesService
 *
 * Resolves the effective capability of a model by merging:
 *   1. Built-in defaults (fallback when no preset exists)
 *   2. Preset data from model-capabilities.json
 *   3. Per-model user overrides stored in the AISource config
 *
 * This service is purely in-memory — preset data is bundled with the app and
 * loaded at module initialisation time. It adds zero async I/O overhead.
 */

import presetData from '../../shared/data/model-capabilities.json'
import type {
  ModelCapability,
  ModelCapabilityOverride,
  ModelCapabilitiesPreset
} from '../../shared/types/model-capabilities'

/** Fallback values used when a model has no preset entry */
const DEFAULT_CAPABILITY: Omit<ModelCapability, 'displayName' | 'provider'> = {
  contextWindow: 128_000,
  maxOutputTokens: 8_192,
  vision: false,
  thinking: false
}

class ModelCapabilitiesService {
  private readonly preset: ModelCapabilitiesPreset

  constructor() {
    this.preset = presetData as ModelCapabilitiesPreset
    console.log(
      `[ModelCapabilities] Loaded ${Object.keys(this.preset.models).length} model presets (v${this.preset.version})`
    )
  }

  /**
   * Resolve the final capability for a model.
   *
   * Priority (highest → lowest):
   *   user override > JSON preset > built-in defaults
   *
   * @param modelId   The model identifier (e.g. "deepseek-chat")
   * @param overrides Optional map of per-model overrides from the AISource config
   */
  resolve(
    modelId: string,
    overrides?: Record<string, ModelCapabilityOverride>
  ): ModelCapability {
    const base: ModelCapability = this.preset.models[modelId] ?? {
      displayName: modelId,
      provider: 'unknown',
      ...DEFAULT_CAPABILITY
    }

    const userOverride = overrides?.[modelId]
    if (!userOverride || Object.keys(userOverride).length === 0) {
      return base
    }

    return { ...base, ...userOverride }
  }

  /**
   * Return the raw preset for a model, or null if no preset exists.
   * Does not apply user overrides — useful for "Reset to preset" UI flows.
   */
  getPreset(modelId: string): ModelCapability | null {
    return this.preset.models[modelId] ?? null
  }

  /** Return all preset model capability entries. */
  getAllPresets(): Record<string, ModelCapability> {
    return this.preset.models
  }

  /** Preset metadata (version, updatedAt). */
  getPresetMeta(): { version: number; updatedAt: string } {
    return {
      version: this.preset.version,
      updatedAt: this.preset.updatedAt
    }
  }
}

// Singleton — module-level initialisation is safe; no async needed.
export const modelCapabilitiesService = new ModelCapabilitiesService()
