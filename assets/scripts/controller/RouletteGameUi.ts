import { getRoulettePopupApiOrNull } from '../di/popupBindings';
import { type RouletteColor } from '../RedBlackRandom';
import type {
    RouletteGameDispatch,
    RouletteGameStateReader,
} from './RouletteGameController';
import { PlayerBalanceView } from '../view/PlayerBalanceView';
import { RouletteBetView } from '../view/RouletteBetView';

export type ViewBindingDispose = () => void;

type RouletteGameBindingApi = {
    dispatch: RouletteGameDispatch;
    getState: RouletteGameStateReader;
};

export function bindPlayerBalanceView(
    view: PlayerBalanceView,
    game: RouletteGameBindingApi,
): ViewBindingDispose {
    const resetBet = () => {
        game.dispatch({ type: 'bet/reset' });
    };

    const addToBet = (delta: number): void => {
        if (delta <= 0) {
            return;
        }
        if (game.getState().balance <= 0) {
            return;
        }
        game.dispatch({ type: 'bet/add', delta, maxByBalance: true });
    };

    view.bindBetHandlers({
        onAdd10: () => addToBet(10),
        onAdd50: () => addToBet(50),
        onResetBet: resetBet,
    });

    const state = game.getState();
    view.setBalanceAndBet(state.balance, state.bet);

    return () => {
        view.unbindBetHandlers();
    };
}

export function bindRouletteBetView(
    view: RouletteBetView,
    game: RouletteGameBindingApi,
): ViewBindingDispose {
    const applyBetColor = (color: RouletteColor): void => {
        game.dispatch({ type: 'bet/color_set', color });
    };

    view.bindBetHandlers({
        onRed: () => applyBetColor('red'),
        onBlack: () => applyBetColor('black'),
    });

    return () => {
        view.unbindBetHandlers();
    };
}

export function showWinPopUp(payout: number, onPopUpDismissed?: () => void): void {
    const popupApi = getRoulettePopupApiOrNull();
    if (!popupApi) {
        onPopUpDismissed?.();
        return;
    }
    popupApi.showWinPopUp(payout, onPopUpDismissed);
}

export function showLosePopUp(stake: number, onPopUpDismissed?: () => void): void {
    const popupApi = getRoulettePopupApiOrNull();
    if (!popupApi) {
        onPopUpDismissed?.();
        return;
    }
    popupApi.showLosePopUp(stake, onPopUpDismissed);
}
