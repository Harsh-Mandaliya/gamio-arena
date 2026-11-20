const RANK = { player: 0, staff: 1, manager: 2, admin: 3 };

export const atLeast = (user, role) => Boolean(user) && RANK[user.role] >= RANK[role];

export const ROLE_LABEL = {
  admin: 'Admin',
  manager: 'Venue manager',
  staff: 'Front desk',
  player: 'Player',
};

export const ROLE_TONE = {
  admin: 'bad',
  manager: 'info',
  staff: 'warn',
  player: 'felt',
};
