import { pickRandomRouletteSlot5050, type RouletteColor } from '../RedBlackRandom';

export type SpinRequest = { stake: number; color: RouletteColor };
export type SpinResponse = { slot: number };

/** Simulates a server response; no real request is sent. */
export async function requestSpin(_request: SpinRequest): Promise<SpinResponse> {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    return { slot: pickRandomRouletteSlot5050() };
}
