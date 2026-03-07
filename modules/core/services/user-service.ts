import type { UserRepo } from "@/modules/core/repos/user-repo";

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
