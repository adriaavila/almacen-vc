import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useUsersStore, CachedUser } from '@/stores/usersStore';

/**
 * Hook híbrido que retorna datos de usuarios de Convex si están disponibles,
 * o datos del store de Zustand si Convex está offline/undefined.
 * Also syncs Convex data to the store for offline access.
 */
export function useUsersData(): CachedUser[] | undefined {
    const convexUsers = useQuery(api.users.get);
    const cachedUsers = useUsersStore((state) => state.users);
    const setUsers = useUsersStore((state) => state.setUsers);

    // Sync to store when data arrives
    useEffect(() => {
        if (convexUsers !== undefined && convexUsers !== null) {
            setUsers(convexUsers as CachedUser[]);
        }
    }, [convexUsers, setUsers]);

    // Si Convex tiene datos, retornarlos
    if (convexUsers !== undefined && convexUsers !== null) {
        return convexUsers as CachedUser[];
    }

    // Si Convex está undefined (offline/cargando), retornar datos cacheados
    if (cachedUsers.length > 0) {
        return cachedUsers;
    }

    // Si no hay datos ni en Convex ni en cache, retornar undefined
    return undefined;
}
