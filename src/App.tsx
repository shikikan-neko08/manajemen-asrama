/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DormProvider, useDorm } from './context/DormContext';
import { LoginView } from './components/LoginView';
import { AppShell } from './components/AppShell';
import { FeedbackLayer } from './components/ui/FeedbackLayer';

const RootRouter: React.FC = () => {
  const { currentUser } = useDorm();
  return (
    <>
      {currentUser ? <AppShell /> : <LoginView />}
      <FeedbackLayer />
    </>
  );
};

export default function App() {
  return (
    <DormProvider>
      <RootRouter />
    </DormProvider>
  );
}
