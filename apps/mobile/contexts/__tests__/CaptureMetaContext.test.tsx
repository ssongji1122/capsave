import React from 'react';
import {CaptureMetaProvider,useCaptureMeta} from '../CaptureMetaContext';
const renderer=require('react-test-renderer');
const {act}=renderer;
let mockOwner:string|null='account-a';
let mockReadA:Promise<string>;
const mockText=JSON.stringify({'scrave.capture-meta.v1.1':JSON.stringify({version:1,meta:{note:'다른 계정의 메모',reasons:[]}})});
jest.mock('../AuthContext',()=>({useAuth:()=>({session:mockOwner?{user:{id:mockOwner}}:null})}));
jest.mock('expo-file-system',()=>({Paths:{document:'test-documents'},File:class {
 name:string;
 constructor(_root:unknown,name:string){this.name=name;}
 get exists(){return true;}
 text(){return this.name.includes('account-a')?mockReadA:Promise.resolve('{}');}
 write(){}
}}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
it('ignores a delayed previous-account load and hides metadata after logout',async()=>{
 let resolveA!:(value:string)=>void;
 mockReadA=new Promise(resolve=>{resolveA=resolve;});
 let current:ReturnType<typeof useCaptureMeta>|undefined;
 function Probe(){current=useCaptureMeta();return null;}
 let tree:any;
 await act(async()=>{tree=renderer.create(<CaptureMetaProvider><Probe/></CaptureMetaProvider>);});
 mockOwner='account-b';
 await act(async()=>{tree.update(<CaptureMetaProvider><Probe/></CaptureMetaProvider>);});
 await act(async()=>{resolveA(mockText);});
 expect(current?.metaMap).toEqual({});
 expect(current?.ready).toBe(true);
 mockOwner=null;
 await act(async()=>{tree.update(<CaptureMetaProvider><Probe/></CaptureMetaProvider>);});
 expect(current?.metaMap).toEqual({});
 expect(current?.ready).toBe(false);
 await act(async()=>tree.unmount());
});
