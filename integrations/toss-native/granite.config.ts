import { defineConfig } from '@granite-js/react-native/config';
import { router } from '@granite-js/plugin-router';
import { hermes } from '@granite-js/plugin-hermes';
import { appsInToss } from '@apps-in-toss/framework/plugins';
import {createRequire} from 'node:module';
import path from 'node:path';
const projectRequire=createRequire(path.join(process.cwd(),'granite.config.ts'));
const {Colors}=projectRequire('../../apps/mobile/constants/Colors.ts') as typeof import('../../apps/mobile/constants/Colors');

const appName = process.env.TOSS_APP_NAME;
if (!appName || !/^[a-z][a-z0-9-]*$/.test(appName)) {
  throw new Error('TOSS_APP_NAME에 콘솔 앱 이름을 지정합니다. 등록 전 로컬 빌드는 scrave-local로 시험합니다.');
}
// Keep external mobile components on this host's single React runtime.
const runtimeAliases = ['react','react-native'].map(name=>({from:name,to:({args}: {args:{path:string}})=>projectRequire.resolve(args.path)}));
export default defineConfig({
  appName, scheme:'intoss', entryFile:'index.ts',
  build:{resolver:{alias:runtimeAliases}},
  metro:{resolver:{resolveRequest(context,name,platform){
    const ownRuntime=runtimeAliases.some(item=>name===item.from || name.startsWith(item.from+'/'));
    return context.resolveRequest(context,ownRuntime ? projectRequire.resolve(name) : name,platform);
  }}},
  plugins:[router(),hermes(),appsInToss({
    target:'0.84.0',
    brand:{displayName:'Scrave',primaryColor:Colors.light.primary,icon:''},
    permissions:[{name:'photos',access:'read'},{name:'clipboard',access:'write'}],
    navigationBar:{withBackButton:true,withHomeButton:true,withTitle:true,theme:'light'},
  })],
});
