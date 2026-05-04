export type RouletteColor = 'red' | 'black';

const RED_SLOT_NUMBERS = [1, 3, 5, 7] as const;
const BLACK_SLOT_NUMBERS = [2, 4, 6, 8] as const;
const RED_SLOTS = new Set<number>(RED_SLOT_NUMBERS);

export function pickRandomRouletteSlot5050(): number {
    const pool = Math.random() < 0.5 ? RED_SLOT_NUMBERS : BLACK_SLOT_NUMBERS;
    const i = Math.floor(Math.random() * pool.length);
    return pool[i]!;
}

export function slotNumberToColor(slot: number): RouletteColor {
    if (!Number.isInteger(slot) || slot < 1 || slot > 8) {
        throw new Error(`slotNumberToColor: ожидается целое 1…8, получено ${slot}`);
    }
    return RED_SLOTS.has(slot) ? 'red' : 'black';
}

export function normalizeAngleDeg360(angleDeg: number): number {
    let a = angleDeg % 360;
    if (a < 0) {
        a += 360;
    }
    return a;
}
