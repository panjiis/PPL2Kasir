'use client';

import React from 'react';
import LoginPage from './login';



export default function Home() {
  return (
    <div className='flex flex-col '>
      <main className='flex-grow'>
        <LoginPage />
      </main>
    </div>
  );
}
