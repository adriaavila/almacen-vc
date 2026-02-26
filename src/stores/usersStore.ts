import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Id } from 'convex/_generated/dataModel';

export type CachedUser = {
    _id: Id<"users">;
    nombre: string;
    estado: "Interno" | "Casas" | "Mantenimiento" | "Desconocido";
    fechaIngreso?: number;
    isArchived?: boolean;
    lastSyncedAt?: number;
};

interface UsersState {
    users: CachedUser[];
    setUsers: (users: CachedUser[]) => void;
    clearUsers: () => void;
    getUsers: () => CachedUser[];
}

export const useUsersStore = create<UsersState>()(
    persist(
        (set, get) => ({
            users: [],
            setUsers: (users) => set({
                users: users.map(u => ({
                    ...u,
                    lastSyncedAt: Date.now()
                }))
            }),
            clearUsers: () => set({ users: [] }),
            getUsers: () => get().users,
        }),
        {
            name: 'users-storage', // localStorage key
            version: 1,
        }
    )
);
