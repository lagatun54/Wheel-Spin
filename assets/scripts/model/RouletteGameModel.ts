import type { RouletteColor } from '../RedBlackRandom';

// =============================================================================
// Data
// =============================================================================

export type RouletteGameState = {
    balance: number;
    bet: number;
    pendingStake: number;
    betColor: RouletteColor | null;
};

export type RouletteGameAction =
    | { type: 'bet/add'; delta: number; maxByBalance: boolean }
    | { type: 'bet/reset' }
    | { type: 'bet/color_set'; color: RouletteColor }
    | { type: 'bet/color_clear' }
    | { type: 'spin/begin' }
    | { type: 'spin/finalize'; resultColor: RouletteColor }
    | { type: 'balance/commit_win'; toBalance: number };

export type BeginSpinFailureReason = 'no_stake' | 'no_color' | 'insufficient_funds';

export type BeginSpinResult =
    | { ok: true }
    | { ok: false; reason: BeginSpinFailureReason };

export type SpinFinalizeOutcome =
    | { kind: 'idle' }
    | { kind: 'refund_no_color'; refund: number }
    | { kind: 'lose'; stake: number }
    | { kind: 'win'; stake: number; fromBalance: number; toBalance: number };

export type ApplyActionResult = {
    state: RouletteGameState;
    spinOutcome?: SpinFinalizeOutcome;
};

export function createRouletteGameState(startingBalance = 0): RouletteGameState {
    return {
        balance: startingBalance,
        bet: 0,
        pendingStake: 0,
        betColor: null,
    };
}

// =============================================================================
// Queries — читают state, ничего не меняют
// =============================================================================

export function canBeginSpin(state: RouletteGameState): BeginSpinResult {
    if (state.bet <= 0) {
        return { ok: false, reason: 'no_stake' };
    }
    if (state.betColor == null) {
        return { ok: false, reason: 'no_color' };
    }
    if (state.bet > state.balance) {
        return { ok: false, reason: 'insufficient_funds' };
    }
    return { ok: true };
}

// =============================================================================
// Mutations — чистые функции: state in → state out
// =============================================================================

export function addBet(
    state: RouletteGameState,
    delta: number,
    maxByBalance: boolean,
): RouletteGameState {
    if (delta <= 0 || state.balance <= 0) {
        return state;
    }

    const nextBet = state.bet + delta;
    return {
        ...state,
        bet: maxByBalance ? Math.min(nextBet, state.balance) : nextBet,
    };
}

export function resetBet(state: RouletteGameState): RouletteGameState {
    return { ...state, bet: 0 };
}

export function setBetColor(state: RouletteGameState, color: RouletteColor): RouletteGameState {
    return { ...state, betColor: color };
}

export function clearBetColor(state: RouletteGameState): RouletteGameState {
    return { ...state, betColor: null };
}

export function lockStakeForSpin(state: RouletteGameState): RouletteGameState {
    return { ...state, pendingStake: state.bet };
}

export function settleSpin(
    state: RouletteGameState,
    resultColor: RouletteColor,
): { state: RouletteGameState; outcome: SpinFinalizeOutcome } {
    const stake = state.pendingStake;
    if (stake <= 0) {
        return { state, outcome: { kind: 'idle' } };
    }

    const clearedState: RouletteGameState = { ...state, pendingStake: 0 };
    const betColor = state.betColor;

    if (betColor == null) {
        return {
            state: clearedState,
            outcome: { kind: 'refund_no_color', refund: 0 },
        };
    }

    if (betColor !== resultColor) {
        return {
            state: { ...clearedState, balance: clearedState.balance - stake },
            outcome: { kind: 'lose', stake },
        };
    }

    const fromBalance = clearedState.balance;
    const toBalance = fromBalance + stake;
    return {
        state: clearedState,
        outcome: { kind: 'win', stake, fromBalance, toBalance },
    };
}

export function commitWinBalance(state: RouletteGameState, toBalance: number): RouletteGameState {
    return { ...state, balance: toBalance };
}

// =============================================================================
// System — единая точка входа для контроллера
// =============================================================================

export function applyAction(
    state: RouletteGameState,
    action: RouletteGameAction,
): ApplyActionResult {
    switch (action.type) {
        case 'bet/add':
            return { state: addBet(state, action.delta, action.maxByBalance) };

        case 'bet/reset':
            return { state: resetBet(state) };

        case 'bet/color_set':
            return { state: setBetColor(state, action.color) };

        case 'bet/color_clear':
            return { state: clearBetColor(state) };

        case 'spin/begin':
            return { state: lockStakeForSpin(state) };

        case 'spin/finalize': {
            const settled = settleSpin(state, action.resultColor);
            return { state: settled.state, spinOutcome: settled.outcome };
        }

        case 'balance/commit_win':
            return { state: commitWinBalance(state, action.toBalance) };
    }
}
