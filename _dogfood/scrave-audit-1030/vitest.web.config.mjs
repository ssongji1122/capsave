import { defineConfig } from 'vitest/config';
import path from 'node:path';
const repo = '/Users/ssongji/Developer/Workspace/scrave-toss-capture-1029';
export default defineConfig({
 oxc:{jsx:{runtime:'automatic',importSource:'react'}},
 test:{root:path.join(repo,'apps/web'),environment:'jsdom',include:['src/__tests__/**/*.test.ts','src/__tests__/**/*.test.tsx']},
 resolve:{alias:{'@':path.join(repo,'apps/web/src'),'@scrave/shared':path.join(repo,'packages/shared/src/index.ts')}},
});
