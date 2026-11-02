import React, {type PropsWithChildren} from 'react';
import type {InitialProps} from '@granite-js/react-native';
import {AppsInToss} from '@apps-in-toss/framework';
import {TDSProvider} from '@toss/tds-react-native';
import {context} from '../require.context';
function AppContainer({children}:PropsWithChildren<InitialProps>) {
  return <TDSProvider>{children}</TDSProvider>;
}
export default AppsInToss.registerApp(AppContainer,{context});
