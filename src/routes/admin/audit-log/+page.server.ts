import { db } from '$lib/server/db';
import { adminActions } from '$lib/server/db/schema';
import { desc, count, eq, sql } from 'drizzle-orm';

import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const actionFilter = url.searchParams.get('action') ?? 'all';
	const targetTypeFilter = url.searchParams.get('targetType') ?? 'all';

	const offset = (page - 1) * PAGE_SIZE;

	// Build where clause
	let whereClause = undefined;

	if (actionFilter !== 'all') {
		whereClause = eq(adminActions.action, actionFilter);
	}

	if (targetTypeFilter !== 'all') {
		const targetCondition = eq(adminActions.targetType, targetTypeFilter);
		whereClause = whereClause ? sql`${whereClause} AND ${targetCondition}` : targetCondition;
	}

	// Get admin actions
	const actions = await db.query.adminActions.findMany({
		where: whereClause,
		orderBy: desc(adminActions.createdAt),
		limit: PAGE_SIZE,
		offset,
		with: {
			admin: {
				columns: {
					name: true,
					slug: true
				}
			},
			targetOwner: {
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
	const totalPages = Math.ceil(totalActions / PAGE_SIZE);

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
		actions,
		pagination: {
			page,
			totalPages,
			totalActions,
			pageSize: PAGE_SIZE
		},
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
