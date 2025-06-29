import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
    isUUID,
} from 'class-validator';
import { isArray, trim } from 'lodash';

// A simple regex to quickly check if a string looks like a UUID.
const UUID_LIKE_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@ValidatorConstraint({ name: 'isUuidOrStringArray', async: false })
export class IsUuidOrStringConstraint implements ValidatorConstraintInterface {
    validate(value: any, _args: ValidationArguments) {
        if (!isArray(value)) {
            return false;
        }

        for (const item of value) {
            if (typeof item !== 'string' || trim(item) === '') {
                return false; // Must be a non-empty string
            }

            // If the string looks like a UUID, it must be a valid one.
            if (UUID_LIKE_REGEX.test(item)) {
                if (!isUUID(item)) {
                    return false; // It pretends to be a UUID but is invalid.
                }
            }
            // If it doesn't look like a UUID, it's a tag name, which is fine.
        }
        return true;
    }

    defaultMessage(_args: ValidationArguments) {
        return 'Each item in ($property) must be a valid UUID for existing tags, or a non-empty string for new tags.';
    }
}

export const IsUuidOrStringArray = (validationOptions?: ValidationOptions) =>
    function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsUuidOrStringConstraint,
        });
    };
