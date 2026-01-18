import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store for persisting mappool editing state.
 * Prevents data loss when accidentally closing modals.
 */
export const useMappoolStore = create(
  persist(
    (set, get) => ({
      // Add map form state (for AddMapForm in MappoolEditModal)
      addMapDraft: null,
      addMapPoolId: null,
      addMapStage: 'url', // 'url' | 'difficulty' | 'form'
      beatmapsetData: null,

      // Edit map form state (for MapEditModal)
      editMapDraft: null,
      editMapId: null,

      // Actions for add map form
      setAddMapDraft: (poolId, draft, stage = 'form', beatmapset = null) => set({
        addMapDraft: draft,
        addMapPoolId: poolId,
        addMapStage: stage,
        beatmapsetData: beatmapset,
      }),

      clearAddMapDraft: () => set({
        addMapDraft: null,
        addMapPoolId: null,
        addMapStage: 'url',
        beatmapsetData: null,
      }),

      // Actions for edit map form
      setEditMapDraft: (mapId, draft) => set({
        editMapDraft: draft,
        editMapId: mapId,
      }),

      clearEditMapDraft: () => set({
        editMapDraft: null,
        editMapId: null,
      }),

      // Check if there's a pending draft for a specific pool
      hasDraftForPool: (poolId) => {
        const state = get();
        return state.addMapPoolId === poolId && state.addMapDraft !== null;
      },

      // Check if there's a pending draft for a specific map
      hasDraftForMap: (mapId) => {
        const state = get();
        return state.editMapId === mapId && state.editMapDraft !== null;
      },
    }),
    {
      name: 'pmc-mappool-drafts',
      version: 1,
    }
  )
);
