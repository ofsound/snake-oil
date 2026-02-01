// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User, Session } from '$lib/auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?: Session | undefined;
			user?: User | undefined;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
