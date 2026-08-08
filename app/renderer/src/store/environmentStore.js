/**
 * Environment Store
 * 
 * Zustand store for managing Environment profiles and variable substitution.
 * Interacts with IPC bridge methods:
 * - getEnvironments
 * - createEnvironment
 * - updateEnvironment
 * - deleteEnvironment
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const api = () => typeof window !== 'undefined' ? window.api : null;

const useEnvironmentStore = create(
  persist(
    (set, get) => ({
      // State
      environments: [],
      activeEnvironmentId: null,
      isLoading: false,
      error: null,
      isEnvironmentModalOpen: false,

      // Actions
      openEnvironmentModal: () => set({ isEnvironmentModalOpen: true }),
      closeEnvironmentModal: () => set({ isEnvironmentModalOpen: false }),

      /**
       * Load all environment profiles from storage
       */
      loadEnvironments: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await api()?.getEnvironments();
          if (result?.success && Array.isArray(result.data) && result.data.length > 0) {
            set({ environments: result.data, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          console.warn('Could not load environments from IPC DB:', err);
          set({ isLoading: false });
        }
      },

      /**
       * Set active environment by ID
       */
      setActiveEnvironment: (id) => {
        set({ activeEnvironmentId: id });
      },

      /**
       * Get currently active environment object
       */
      getActiveEnvironment: () => {
        const { environments, activeEnvironmentId } = get();
        if (!activeEnvironmentId) return null;
        return environments.find(e => e.id === activeEnvironmentId) || null;
      },

      /**
       * Get array of enabled variables for the active environment
       */
      getActiveVariables: () => {
        const activeEnv = get().getActiveEnvironment();
        if (!activeEnv || !Array.isArray(activeEnv.variables)) return [];
        return activeEnv.variables.filter(v => v.enabled !== false && v.key);
      },

      /**
       * Create a new environment profile
       */
      createEnvironment: async (name = 'New Environment', variables = []) => {
        try {
          const result = await api()?.createEnvironment({ name, variables });
          if (result?.success) {
            const { environments } = get();
            const newEnv = result.data;
            set({
              environments: [newEnv, ...environments],
              activeEnvironmentId: newEnv.id,
            });
            return newEnv;
          }
        } catch (err) {
          console.warn('IPC createEnvironment unavailable, using local state:', err);
        }

        // Fallback local creation
        const { environments } = get();
        const fallbackEnv = {
          id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name,
          variables,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({
          environments: [fallbackEnv, ...environments],
          activeEnvironmentId: fallbackEnv.id,
        });
        return fallbackEnv;
      },

      /**
       * Update an existing environment profile
       */
      updateEnvironment: async (id, data) => {
        const { environments } = get();
        const updatedEnvs = environments.map(e =>
          e.id === id ? { ...e, ...data, updatedAt: Date.now() } : e
        );
        set({ environments: updatedEnvs });

        try {
          const result = await api()?.updateEnvironment(id, data);
          if (result?.success) {
            const updated = result.data;
            set({
              environments: get().environments.map(e => e.id === id ? updated : e),
            });
            return updated;
          }
        } catch (err) {
          console.warn('IPC updateEnvironment unavailable:', err);
        }
        return updatedEnvs.find(e => e.id === id) || null;
      },

      /**
       * Delete an environment profile
       */
      deleteEnvironment: async (id) => {
        const { environments, activeEnvironmentId } = get();
        set({
          environments: environments.filter(e => e.id !== id),
          activeEnvironmentId: activeEnvironmentId === id ? null : activeEnvironmentId,
        });

        try {
          await api()?.deleteEnvironment(id);
        } catch (err) {
          console.warn('IPC deleteEnvironment unavailable:', err);
        }
        return true;
      },

      /**
       * Helper to interpolate {{variable}} placeholders in a text string
       */
      interpolate: (text) => {
        if (typeof text !== 'string' || !text.includes('{{')) return text;
        const activeVars = get().getActiveVariables();
        if (activeVars.length === 0) return text;

        const map = new Map(activeVars.map(v => [v.key.trim(), v.value || '']));
        return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const trimmedKey = key.trim();
          return map.has(trimmedKey) ? map.get(trimmedKey) : match;
        });
      },
    }),
    {
      name: 'environment-storage',
      partialize: (state) => ({
        environments: state.environments,
        activeEnvironmentId: state.activeEnvironmentId,
      }),
    }
  )
);

export default useEnvironmentStore;
