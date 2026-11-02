import React from 'react';
import { Clipboard, Linking } from 'react-native';
import { openUrl } from '@/services/map-linker';
import { CaptureWorkflowView, type CaptureWorkflowProps } from './CaptureWorkflowView';
import type { CaptureActionItem } from '../../../packages/shared/src/utils/capture-actions';

async function executeMobileAction(action: CaptureActionItem): Promise<void> {
  if (action.kind === 'phone' && action.href) await Linking.openURL(action.href);
  else if (action.href) await openUrl(action.href);
  else Clipboard.setString(action.value);
}

export function CaptureWorkflow(props: Omit<CaptureWorkflowProps, 'onExecute'> & Pick<Partial<CaptureWorkflowProps>, 'onExecute'>) {
  return <CaptureWorkflowView {...props} onExecute={props.onExecute ?? executeMobileAction} />;
}
