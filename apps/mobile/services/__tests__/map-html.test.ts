import { buildMapHtml } from '../map-html';
it('uses the current light theme without disabling pinch zoom',()=>{
 const html=buildMapHtml([], '');
 expect(html).toContain('background: #FFFFFF');
 expect(html).toContain('color: #24354A');
 expect(html).toContain('prefers-reduced-motion');
 expect(html).not.toContain('user-scalable=no');
});
