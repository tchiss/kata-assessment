"use client";
import React from 'react';
import { Provider } from 'react-redux';
import Store from '@/Redux/Store';

const MainProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Provider store={Store}>{children}</Provider>
  );
}

export default MainProvider;
