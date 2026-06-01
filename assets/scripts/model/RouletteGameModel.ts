import type { RouletteColor } from '../RedBlackRandom';

export type BeginSpinFailureReason = 'no_stake' | 'no_color' | 'insufficient_funds';

export type BeginSpinResult =
    | { ok: true }
    | { ok: false; reason: BeginSpinFailureReason };

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

export type SpinFinalizeOutcome =
    | { kind: 'idle' }
    | { kind: 'refund_no_color'; refund: number }
    | { kind: 'lose'; stake: number }
    | { kind: 'win'; stake: number; fromBalance: number; toBalance: number };

export type RouletteGameCommand =
    | { type: 'none' }
    | { type: 'refresh_balance' }
    | { type: 'sync_bet_color' }
    | { type: 'show_lose_popup'; stake: number }
    | { type: 'show_win_popup'; payout: number }
    | { type: 'animate_balance'; fromBalance: number; toBalance: number };

export function createRouletteGameState(startingBalance = 0): RouletteGameState {
    return {
        balance: startingBalance,
        bet: 0,
        pendingStake: 0,
        betColor: null,
    };
}

function setBetColor(state: RouletteGameState, color: RouletteColor): RouletteGameState {
    return { ...state, betColor: color };
}

function clearBetColor(state: RouletteGameState): RouletteGameState {
    return { ...state, betColor: null };
}

function addToBet(state: RouletteGameState, delta: number, maxByBalance: boolean): RouletteGameState {
    if (delta <= 0) {
        return state;
    }
    if (state.balance <= 0) {
        return state;
    }

    return {
        ...state,
        bet: maxByBalance ? Math.min(state.bet + delta, state.balance) : state.bet + delta,
    };
}

function resetBetAmount(state: RouletteGameState): RouletteGameState {
    return { ...state, bet: 0 };
}

function beginSpinRound(state: RouletteGameState): {
    state: RouletteGameState;
    result: BeginSpinResult;
} {
    if (state.bet <= 0) {
        return { state, result: { ok: false, reason: 'no_stake' } };
    }
    if (state.betColor == null) {
        return { state, result: { ok: false, reason: 'no_color' } };
    }
    if (state.bet > state.balance) {
        return { state, result: { ok: false, reason: 'insufficient_funds' } };
    }

    return {
        state: {
            ...state,
            pendingStake: state.bet,
        },
        result: { ok: true },
    };
}

function finalizeSpin(state: RouletteGameState, resultColor: RouletteColor): {
    state: RouletteGameState;
    outcome: SpinFinalizeOutcome;
} {
    const stake = state.pendingStake;
    if (stake <= 0) {
        return { state, outcome: { kind: 'idle' } };
    }

    const betColor = state.betColor;
    if (betColor == null) {
        return {
            state: {
                ...state,
                pendingStake: 0,
            },
            outcome: { kind: 'refund_no_color', refund: 0 },
        };
    }

    const nextState = {
        ...state,
        pendingStake: 0,
    };
    const won = betColor === resultColor;

    if (!won) {
        return {
            state: {
                ...nextState,
                balance: nextState.balance - stake,
            },
            outcome: { kind: 'lose', stake },
        };
    }

    const from = nextState.balance;
    const to = from + stake;
    return {
        state: nextState,
        outcome: { kind: 'win', stake, fromBalance: from, toBalance: to },
    };
}

function commitBalanceAfterWin(state: RouletteGameState, toBalance: number): RouletteGameState {
    return { ...state, balance: toBalance };
}

export type RouletteGameReduceResult =
    | { state: RouletteGameState; effect: { type: 'none' }; commands: RouletteGameCommand[] }
    | { state: RouletteGameState; effect: { type: 'begin_spin'; result: BeginSpinResult }; commands: RouletteGameCommand[] }
    | { state: RouletteGameState; effect: { type: 'finalize_spin'; outcome: SpinFinalizeOutcome }; commands: RouletteGameCommand[] };

export function reduceRouletteGame(
    state: RouletteGameState,
    action: RouletteGameAction,
): RouletteGameReduceResult {
    switch (action.type) {
        case 'bet/add':
            return {
                state: addToBet(state, action.delta, action.maxByBalance),
                effect: { type: 'none' },
                commands: [{ type: 'refresh_balance' }],
            };
        case 'bet/reset':
            return {
                state: resetBetAmount(state),
                effect: { type: 'none' },
                commands: [{ type: 'refresh_balance' }],
            };
        case 'bet/color_set':
            return {
                state: setBetColor(state, action.color),
                effect: { type: 'none' },
                commands: [{ type: 'sync_bet_color' }],
            };
        case 'bet/color_clear':
            return {
                state: clearBetColor(state),
                effect: { type: 'none' },
                commands: [{ type: 'sync_bet_color' }],
            };
        case 'spin/begin': {
            const result = beginSpinRound(state);
            return {
                state: result.state,
                effect: { type: 'begin_spin', result: result.result },
                commands: result.result.ok ? [{ type: 'refresh_balance' }] : [{ type: 'none' }],
            };
        }
        case 'spin/finalize': {
            const result = finalizeSpin(state, action.resultColor);
            const commands =
                result.outcome.kind === 'idle'
                    ? [{ type: 'sync_bet_color' as const }]
                    : result.outcome.kind === 'refund_no_color'
                      ? [{ type: 'sync_bet_color' as const }, { type: 'refresh_balance' as const }]
                      : result.outcome.kind === 'lose'
                        ? [
                              { type: 'sync_bet_color' as const },
                              { type: 'refresh_balance' as const },
                              { type: 'show_lose_popup' as const, stake: result.outcome.stake },
                          ]
                        : [
                              { type: 'sync_bet_color' as const },
                              { type: 'refresh_balance' as const },
                              {
                                  type: 'show_win_popup' as const,
                                  payout: result.outcome.toBalance - result.outcome.fromBalance,
                              },
                              {
                                  type: 'animate_balance' as const,
                                  fromBalance: result.outcome.fromBalance,
                                  toBalance: result.outcome.toBalance,
                              },
                          ];
            return {
                state: result.state,
                effect: { type: 'finalize_spin', outcome: result.outcome },
                commands,
            };
        }
        case 'balance/commit_win':
            return {
                state: commitBalanceAfterWin(state, action.toBalance),
                effect: { type: 'none' },
                commands: [{ type: 'refresh_balance' }],
            };
    }
}
