import { db } from '$lib/server/db';
import { adminActions } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

import {
	buildWhereClause,
	buildOrderBy,
	count,
	ITEMS_PER_PAGE
} from '$lib/server/pagination-utils';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const actionFilter = url.searchParams.get('action') ?? 'all';
	const targetTypeFilter = url.searchParams.get('targetType') ?? 'all';

	const offset = (page - 1) * ITEMS_PER_PAGE;

	// Build where clause
	const filterConditions = [
		...(actionFilter !== 'all' ? [{ field: adminActions.action, value: actionFilter }] : []),
		...(targetTypeFilter !== 'all'
			? [{ field: adminActions.targetType, value: targetTypeFilter }]
			: [])
	];

	const whereClause = buildWhereClause(
		'',
		undefined,
		filterConditions.length > 0 ? filterConditions : undefined
	);

	// Get admin actions
	const actions = await db.query.adminActions.findMany({
		where: whereClause,
		orderBy: buildOrderBy(adminActions.createdAt, 'desc'),
		limit: ITEMS_PER_PAGE,
		offset,
		with: {
			admin: {
				columns: {
					name: true,
					slug: true
				}
			},
			targetCreator: {
				columns: {
					name: true,
					slug: true
				}
			}
		}
	});

	// Get total count
	const totalResult = await db.select({ value: count() }).from(adminActions).where(whereClause);
	const totalActions = totalResult[0]?.value ?? 0;
	const totalPages = Math.ceil(totalActions / ITEMS_PER_PAGE);

	// Get distinct actions and target types for filters
	const distinctActions = await db
		.selectDistinct({ action: adminActions.action })
		.from(adminActions)
		.orderBy(adminActions.action);

	const distinctTargetTypes = await db
		.selectDistinct({ targetType: adminActions.targetType })
		.from(adminActions)
		.orderBy(adminActions.targetType);

	return {
		items: actions,
		currentPage: page,
		totalPages,
		totalItems: totalActions,
		itemsPerPage: ITEMS_PER_PAGE,
		filters: {
			action: actionFilter,
			targetType: targetTypeFilter
		},
		filterOptions: {
			actions: distinctActions.map((a) => a.action),
			targetTypes: distinctTargetTypes.map((t) => t.targetType)
		}
	};
};
