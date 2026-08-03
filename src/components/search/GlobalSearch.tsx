import { useEffect, useState } from 'react';
import SearchPalette from './SearchPalette';

export const OPEN_SEARCH_EVENT = 'billvie:open-search';

export const openSearch = () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));

// Mounted once inside the router so Cmd/Ctrl+K works from any page.
const GlobalSearch = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  return <SearchPalette open={open} onOpenChange={setOpen} />;
};

export default GlobalSearch;
