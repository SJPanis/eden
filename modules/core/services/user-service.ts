import "server-only";

import type { UserRepo } from "@/modules/core/repos/user-repo";
import {
  getUserById as getMockUserById,
  users as platformUsers,
} from "@/modules/core/mock-data/platform-data";
import type { EdenMockUser } from "@/modules/core/mock-data/platform-types";
import {
  mapRepoUserToMockUser,
  mergeCatalogLayers,
} from "@/modules/core/services/read-record-mappers";
import {
  resolveBuilderLoopReadMode,
  resolveBuilderLoopReadRepos,
  tryPersistentBuilderLoopRead,
} from "@/modules/core/services/read-service-runtime";

export interface UserService {
  getUserById(userId: string): ReturnType<UserRepo["findById"]>;
  getUserByUsername(username: string): ReturnType<UserRepo["findByUsername"]>;
  listUsers(): ReturnType<UserRepo["list"]>;
}

export function createUserService(userRepo: UserRepo): UserService {
  return {
    getUserById(userId) {
      return userRepo.findById(userId);
    },
    getUserByUsername(username) {
      return userRepo.findByUsername(username);
    },
    listUsers() {
      return userRepo.list();
    },
  };
}

export async function loadUserById(userId: string) {
  const readMode = resolveBuilderLoopReadMode();
  const readRepos = resolveBuilderLoopReadRepos(readMode);
  const fallbackUser = getMockUserById(userId);
  const persistentUser = readRepos
    ? await tryPersistentBuilderLoopRead("get_user_by_id", readMode, async () => {
        const user = await readRepos.userRepo.findById(userId);
        return user ? mapRepoUserToMockUser(user, fallbackUser) : null;
      })
    : null;

  if (persistentUser) {
    return persistentUser;
  }

  if (readMode === "real_only") {
    return null;
  }

  return fallbackUser;
}

export async function loadUserCatalog() {
  const readMode = resolveBuilderLoopReadMode();
  const readRepos = resolveBuilderLoopReadRepos(readMode);
  const persistentUsers = readRepos
    ? await tryPersistentBuilderLoopRead("list_users", readMode, async () => {
        const users = await readRepos.userRepo.list();
        return users.map((user) =>
          mapRepoUserToMockUser(
            user,
            platformUsers.find((entry) => entry.id === user.id) ?? null,
          ),
        );
      })
    : null;
  const baseUsers = readMode === "real_only" ? [] : platformUsers;

  return mergeCatalogLayers(baseUsers, persistentUsers ?? []);
}

export async function loadUserByUsername(username: string) {
  const readMode = resolveBuilderLoopReadMode();
  const readRepos = resolveBuilderLoopReadRepos(readMode);
  const fallbackUser =
    platformUsers.find((user) => user.username === username) ?? null;
  const persistentUser = readRepos
    ? await tryPersistentBuilderLoopRead("get_user_by_username", readMode, async () => {
        const user = await readRepos.userRepo.findByUsername(username);
        return user ? mapRepoUserToMockUser(user, fallbackUser) : null;
      })
    : null;

  if (persistentUser) {
    return persistentUser;
  }

  if (readMode === "real_only") {
    return null;
  }

  return fallbackUser;
}

export function getUserCatalogRecord(
  userId: string,
  userCatalog: EdenMockUser[],
) {
  return userCatalog.find((user) => user.id === userId) ?? null;
}
