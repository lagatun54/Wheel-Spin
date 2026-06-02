type Registry = Record<symbol, unknown>;

const container: Registry = {};

export function hasBinding(key: symbol): boolean {
    return key in container;
}

export function getBinding<T>(key: symbol): T | null {
    return (container[key] as T | undefined) ?? null;
}

export function setBinding<T>(key: symbol, value: T | null): void {
    if (value == null) {
        delete container[key];
        return;
    }
    container[key] = value;
}

export function removeBinding(key: symbol): void {
    delete container[key];
}
