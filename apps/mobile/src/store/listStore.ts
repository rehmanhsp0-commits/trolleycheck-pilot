import { create } from 'zustand';
import { listsApi, type Item, type List } from '../api/client';

type ListState = {
  lists: List[];
  selectedList: List | null;
  items: Item[];
  isLoadingLists: boolean;
  isLoadingItems: boolean;
  error: string | null;

  fetchLists: () => Promise<void>;
  selectList: (list: List) => void;
  fetchItems: (listId: string) => Promise<void>;
  createList: (name: string) => Promise<List>;
  updateList: (id: string, name: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  duplicateList: (id: string) => Promise<void>;
  addItem: (listId: string, item: { name: string; quantity: number; unit: string; notes?: string }) => Promise<void>;
  updateItem: (listId: string, itemId: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (listId: string, itemId: string) => Promise<void>;
  toggleItem: (listId: string, itemId: string, checked: boolean) => Promise<void>;
  clearError: () => void;
};

export const useListStore = create<ListState>((set, get) => ({
  lists: [],
  selectedList: null,
  items: [],
  isLoadingLists: false,
  isLoadingItems: false,
  error: null,

  fetchLists: async () => {
    set({ isLoadingLists: true, error: null });
    try {
      const { data } = await listsApi.getAll();
      set({ lists: data, isLoadingLists: false });
    } catch (err: any) {
      set({ isLoadingLists: false, error: err.message });
    }
  },

  selectList: (list) => set({ selectedList: list }),

  fetchItems: async (listId) => {
    set({ isLoadingItems: true, error: null });
    try {
      const { data } = await listsApi.getItems(listId);
      set({ items: data, isLoadingItems: false });
    } catch (err: any) {
      set({ isLoadingItems: false, error: err.message });
    }
  },

  createList: async (name) => {
    const list = await listsApi.create(name);
    set((state) => ({ lists: [list, ...state.lists] }));
    return list;
  },

  updateList: async (id, name) => {
    const updated = await listsApi.update(id, name);
    set((state) => ({
      lists: state.lists.map((l) => (l.id === id ? updated : l)),
      selectedList: state.selectedList?.id === id ? updated : state.selectedList,
    }));
  },

  deleteList: async (id) => {
    await listsApi.delete(id);
    set((state) => ({
      lists: state.lists.filter((l) => l.id !== id),
      selectedList: state.selectedList?.id === id ? null : state.selectedList,
    }));
  },

  duplicateList: async (id) => {
    const copy = await listsApi.duplicate(id);
    set((state) => ({ lists: [copy, ...state.lists] }));
  },

  addItem: async (listId, item) => {
    const newItem = await listsApi.addItem(listId, item);
    set((state) => ({ items: [...state.items, newItem] }));
  },

  updateItem: async (listId, itemId, updates) => {
    const updated = await listsApi.updateItem(listId, itemId, updates);
    set((state) => ({
      items: state.items.map((i) => (i.id === itemId ? updated : i)),
    }));
  },

  deleteItem: async (listId, itemId) => {
    await listsApi.deleteItem(listId, itemId);
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
  },

  toggleItem: async (listId, itemId, checked) => {
    // Optimistic update
    set((state) => ({
      items: state.items.map((i) => (i.id === itemId ? { ...i, checked } : i)),
    }));
    try {
      await listsApi.updateItem(listId, itemId, { checked });
    } catch {
      // Roll back
      set((state) => ({
        items: state.items.map((i) => (i.id === itemId ? { ...i, checked: !checked } : i)),
      }));
    }
  },

  clearError: () => set({ error: null }),
}));
