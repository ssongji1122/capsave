import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ArchiveSections } from '@/components/captures/ArchiveSections';
afterEach(cleanup);
it('lets the reader switch four sections without replacing the existing lenses', () => {
 const change=vi.fn();
 render(<ArchiveSections value="all" onChange={change} counts={{all:4,shopping:1,places:1,questions:1,travel:1}} />);
 fireEvent.click(screen.getByRole('button',{name:'물건 1'}));
 expect(change).toHaveBeenCalledWith('shopping');
 expect(screen.getByRole('button',{name:'전체 4'}).getAttribute('aria-pressed')).toBe('true');
});
