import { Container } from 'inversify';

const container = new Container();

export function getContainer(): Container {
    return container;
}
