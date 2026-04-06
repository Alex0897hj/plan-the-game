export type GameType = "five_x_five" | "seven_x_seven" | "eight_x_eight";

export const GAME_TYPE_PLAYERS: Record<GameType, number> = {
  five_x_five:   10,
  seven_x_seven: 14,
  eight_x_eight: 16,
};

export function minPlayersFromType(gameType: string): number {
  return GAME_TYPE_PLAYERS[gameType as GameType] ?? 10;
}
