export interface CategoryTreeNode {
    id: string;
    name: string;
    slug: string;
    description?: string;
    iconUrl?: string;
    parentId?: string;
    level: number;
    path: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    children: CategoryTreeNode[];
    isRoot?: boolean;
    hasChildren?: boolean;
    displayPath?: string;
}
