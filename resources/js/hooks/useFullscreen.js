import { useCallback, useEffect, useState } from 'react';

export default function useFullscreen() {
    const supported = typeof document !== 'undefined' && !!document.fullscreenEnabled;
    const [isFullscreen, setIsFullscreen] = useState(
        () => typeof document !== 'undefined' && !!document.fullscreenElement,
    );

    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const toggleFullscreen = useCallback(async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
        } catch {
            // refused by the browser (e.g. not triggered by a user gesture)
        }
    }, []);

    return { supported, isFullscreen, toggleFullscreen };
}
