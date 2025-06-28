import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, Type } from 'class-transformer';
import { assign, filter, isArray, isEmpty, isObject, isUndefined, join, map, split } from 'lodash';

import { Category } from '../entities/category.entity';
import { CategoryTreeNode } from '../types/category.types';

type CategoryInput = (Partial<Category> | Partial<CategoryTreeNode>) & {
    children?: CategoryInput[];
    parent?: CategoryInput;
};

@Exclude()
export class CategoryResponseDto {
    @Expose()
    @ApiProperty({ description: 'Category ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    id: string;

    @Expose()
    @ApiProperty({ description: 'Category name', example: 'Sans-serif' })
    name: string;

    @Expose()
    @ApiProperty({ description: 'Category slug', example: 'sans-serif' })
    slug: string;

    @Expose()
    @ApiProperty({ description: 'Category description', example: 'Fonts without serifs' })
    description: string;

    @Expose()
    @ApiProperty({ description: 'Parent category ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    parentId: string;

    @Expose()
    @ApiProperty({ description: 'Is category active', example: true })
    isActive: boolean;

    @Expose()
    @ApiProperty({ description: 'Creation date' })
    createdAt: Date;

    @Expose()
    @ApiProperty({ description: 'Last update date' })
    updatedAt: Date;

    @Expose()
    @ApiProperty({ description: 'Is root category', example: true })
    isRoot: boolean;

    @Expose()
    @ApiProperty({ description: 'Has children categories', example: true })
    hasChildren: boolean;

    @Expose()
    @ApiProperty({ description: 'Category display path', example: 'Typography > Sans-serif' })
    displayPath: string;

    @Expose()
    @Type(() => CategoryResponseDto)
    @ApiProperty({
        description: 'Parent category',
        example: { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Typography' },
    })
    parent: CategoryResponseDto;

    @Expose()
    @Type(() => CategoryResponseDto)
    @ApiProperty({
        description: 'Children categories',
        example: [{ id: '123e4567-e89b-12d3-a456-426614174000', name: 'Sans-serif' }],
    })
    children: CategoryResponseDto[];

    constructor(partial: CategoryInput) {
        assign(this, partial);

        if (isArray(partial.children)) {
            this.children = map(partial.children, (child) => new CategoryResponseDto(child));
        }

        if (isObject(partial.parent)) {
            this.parent = new CategoryResponseDto(partial.parent);
        }

        if (partial.path && isUndefined(this.displayPath)) {
            this.displayPath = join(filter(split(partial.path, '/'), Boolean), ' > ');
        }

        if (isUndefined(this.isRoot)) {
            this.isRoot = !partial.parentId;
        }

        if (isUndefined(this.hasChildren)) {
            this.hasChildren = !isEmpty(this.children);
        }
    }
}
