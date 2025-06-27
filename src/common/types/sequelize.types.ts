import { Model } from 'sequelize-typescript';

/**
 * Extracts the non-function property names from a type T.
 * This is useful for getting only the data attribute keys from a Sequelize Model class,
 * filtering out all the built-in methods (like `save`, `destroy`, etc.).
 */
export type NonFunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];

/**
 * Represents the data attributes of a Sequelize Model.
 */
export type ModelAttributes<T extends Model> = Pick<T, NonFunctionPropertyNames<T>>;
