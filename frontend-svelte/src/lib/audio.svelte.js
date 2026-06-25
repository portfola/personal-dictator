// Cross-instance audio coordination. Each ActionCard owns its own <audio>
// element, but only one should ever play at a time — starting playback in one
// document's card must stop whatever another card was already playing. The
// shared module holds a single reference to the currently-sounding element and
// pauses the previous one whenever a new one takes over.

let current = null;

// Call when an element starts playing. Pauses the previously-playing element
// (which fires its own `pause` event, so that card resets its UI state).
export function claimPlayback(el) {
	if (current && current !== el) current.pause();
	current = el;
}

// Call when an element stops/unmounts so we don't hold a stale reference.
export function releasePlayback(el) {
	if (current === el) current = null;
}
