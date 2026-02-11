import { asc, count, desc, sql, like, or, eq } from 'drizzle-orm';

import type { SQL, Column } from 'drizzle-orm';

const ITEMS_PER_PAGE = 25;

type SortOrder = 'asc' | 'desc';

interface FilterCondition {
	field: Column;
	value: string;
	operator?: 'eq' | 'like';
}

function buildWhereClause(
	search: string,
	searchFields?: Column[],
	filterConditions?: FilterCondition[]
): SQL | undefined {
	let whereClause: SQL | undefined = undefined;

	if (search && searchFields && searchFields.length > 0) {
		const searchPattern = `%${search}%`;
		const conditions = searchFields.map((field) => like(field, searchPattern));
		whereClause = or(...conditions);
	}

	if (filterConditions) {
		for (const condition of filterConditions) {
			if (condition.value && condition.value !== 'all') {
				let sqlCondition: SQL;
				if (condition.operator === 'like') {
					sqlCondition = like(condition.field, `%${condition.value}%`);
				} else {
					sqlCondition = eq(condition.field, condition.value);
				}
				whereClause = whereClause ? sql`${whereClause} AND ${sqlCondition}` : sqlCondition;
			}
		}
	}

	return whereClause;
}

function buildOrderBy(sortField: Column, sortOrder: SortOrder): SQL {
	return sortOrder === 'asc' ? asc(sortField) : desc(sortField);
}

export { ITEMS_PER_PAGE, buildWhereClause, buildOrderBy, asc, desc, count, sql, like, or, eq };
export type { SortOrder, FilterCondition };
