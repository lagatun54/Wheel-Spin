export type With<T extends object, K extends keyof T> = T & Required<Pick<T, K>>;

type QueryPredicate<T extends object> = (entity: T) => boolean;

export class Query<T extends object> {
    constructor(
        private readonly world: World<T>,
        private readonly predicate: QueryPredicate<T>,
    ) {}

    get entities(): T[] {
        return this.world.entities.filter(this.predicate);
    }
}

export class World<T extends object> {
    readonly entities: T[] = [];

    add(entity: T): T {
        this.entities.push(entity);
        return entity;
    }

    remove(entity: T): void {
        const index = this.entities.indexOf(entity);
        if (index >= 0) {
            this.entities.splice(index, 1);
        }
    }

    addComponent<K extends keyof T>(entity: T, component: K, value: T[K]): void {
        entity[component] = value;
    }

    removeComponent(entity: T, component: keyof T): void {
        delete entity[component];
    }

    with<K extends keyof T>(...components: K[]): Query<With<T, K>> {
        return new Query(
            this,
            (entity): entity is With<T, K> =>
                components.every((component) => entity[component] !== undefined),
        );
    }
}
