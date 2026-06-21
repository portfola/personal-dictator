import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode everywhere except node_modules. Removable in Svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-static in SPA mode: no SSR, no per-route prerendering.
			// `fallback` emits a single hydratable shell that every unmatched path
			// resolves to. We name it `index.html` (not the common `200.html`) so it
			// lines up with this project's CloudFront, which serves index.html as the
			// default root object AND as the 404 response page — zero infra changes.
			// See infra/cloudfront.tf (default_root_object / response_page_path).
			adapter: adapter({ fallback: 'index.html' })
		}),

		// PWA — the SvelteKit-native port of the React app's vite-plugin-pwa. Same
		// Workbox engine, same autoUpdate behavior, same manifest.
		SvelteKitPWA({
			registerType: 'autoUpdate',
			workbox: {
				// Don't let the SPA navigation fallback swallow API navigations
				// (e.g. /api/auth/login and the /api/auth/callback redirect) — those
				// must reach the backend, not be served the app shell. This is the
				// single most important PWA setting carried over from the React config.
				navigateFallbackDenylist: [/^\/api\//]
			},
			manifest: {
				name: 'Personal Dictator',
				short_name: 'Dictator',
				theme_color: '#0f172a',
				background_color: '#0f172a',
				display: 'standalone',
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
				]
			}
		})
	],

	// Mirror the React app's dev proxy so /api hits the local FastAPI backend.
	server: {
		proxy: { '/api': 'http://localhost:8000' }
	}
});
