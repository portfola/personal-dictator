// Shared auth status — the runes-in-module version of the useState gate that
// lived in App.jsx (`const [auth, setAuth] = useState('loading')`).
//
// Pulling it out of the component means "am I signed in / who am I" is readable
// from anywhere (e.g. a logout button in a header) without lifting state or
// threading props. The root +layout.svelte calls checkAuth() once on mount and
// switches between the sign-in screen and the app based on `auth.status`.

import { getMe } from './api.js';

// 'loading' | 'in' | 'out'
export const auth = $state({ status: 'loading', email: null });

export async function checkAuth() {
	try {
		const me = await getMe();
		auth.status = me?.email ? 'in' : 'out';
		auth.email = me?.email ?? null;
	} catch {
		auth.status = 'out';
		auth.email = null;
	}
}
