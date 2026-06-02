import type { RouletteGameSpinApi, RouletteGameStoreApi } from '../controller/RouletteGameController';

export type RoulettePopupApi = {
    showWinPopUp(payout: number, onPopUpDismissed?: () => void): void;
    showLosePopUp(stake: number, onPopUpDismissed?: () => void): void;
};

export type { RouletteGameSpinApi, RouletteGameStoreApi };
